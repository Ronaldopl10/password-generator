/**
 * Orquestación pura de la provisión de licencias de Dodo Payments.
 *
 * `applyEventToStore` no sabe de prisma ni de red: recibe un `SubscriptionStore`
 * inyectado, resuelve el estado actual, delega la decisión en `reduceEvent` y
 * sólo escribe cuando el resultado es `applied`. Los tests usan un store en
 * memoria; el adaptador real vive en `provision-prisma.ts`.
 */

import {
  FREE_PLAN_NAME,
  planNameForProductId,
  planNameFromMetadata,
  reduceEvent,
  type CurrentState,
  type EventOutcome,
} from "./events";
import type { DodoProducts } from "./products";

/** Datos completos de una suscripción a escribir; el plan ya viene como id. */
export interface SubscriptionWrite {
  planId: string;
  planName: string;
  status: string;
  provider: string | null;
  externalId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastEventAt: Date | null;
}

/**
 * Persistencia que necesita la provisión. Toda la implementación de base de
 * datos queda detrás de esta interfaz: el módulo puro nunca importa prisma.
 */
export interface SubscriptionStore {
  findSubscription(userId: string): Promise<CurrentState | null>;
  planIdByName(name: string): Promise<string | null>;
  freePlanId(): Promise<string | null>;
  upsertFromWebhook(userId: string, data: SubscriptionWrite): Promise<void>;
  /** Degrada a free las suscripciones vencidas; devuelve cuántas cambió. */
  reconcileExpired(now: Date): Promise<number>;
}

/** Fila de `BillingWebhookEvent` normalizada para aplicarla. */
export interface EventInput {
  eventType: string;
  timestamp: string | Date;
  userId: string;
  payload: {
    type?: string;
    timestamp?: string | Date;
    data?: Record<string, unknown> | null;
  } | null;
}

export interface ApplyEventOptions {
  /** Productos configurados, para resolver el plan por `data.product_id`. */
  products?: DodoProducts;
}

export interface ApplyResult {
  outcome: EventOutcome;
  /** Reservado para diagnóstico; hoy no se persiste. */
  reason?: string;
}

/** Estado de un usuario sin fila de suscripción. */
const EMPTY_STATE: CurrentState = {
  provider: null,
  externalId: null,
  planName: null,
  status: "inactive",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  lastEventAt: null,
};

function pick<K extends keyof CurrentState>(
  next: Partial<CurrentState>,
  current: CurrentState,
  key: K
): CurrentState[K] {
  return key in next ? (next[key] as CurrentState[K]) : current[key];
}

/**
 * Aplica un evento de webhook al store.
 *
 * Nunca lanza por un evento `stale`, `ignored` o `unresolved`: esos se informan
 * con el `outcome` y no tocan la suscripción. Sólo un `applied` escribe.
 */
export async function applyEventToStore(
  input: EventInput,
  store: SubscriptionStore,
  now: Date,
  options: ApplyEventOptions = {}
): Promise<ApplyResult> {
  const current = (await store.findSubscription(input.userId)) ?? EMPTY_STATE;
  const data = input.payload?.data ?? null;
  const productPlanName = planNameForProductId(
    typeof data?.product_id === "string" ? data.product_id : null,
    options.products ?? {}
  );

  // El callback del reducer es sincrónico, así que los ids que puede llegar a
  // necesitar se resuelven antes de reducir.
  const candidateNames = new Set<string>();

  for (const name of [
    planNameFromMetadata(data),
    productPlanName,
    current.planName,
  ]) {
    if (name !== null) {
      candidateNames.add(name);
    }
  }

  candidateNames.delete(FREE_PLAN_NAME);

  const [freePlanId, namedPlanIds] = await Promise.all([
    store.freePlanId(),
    Promise.all(
      [...candidateNames].map(
        async (name) => [name, await store.planIdByName(name)] as const
      )
    ),
  ]);

  const planIds = new Map(namedPlanIds);
  const resolvePlanId = (name: string): string | null =>
    name === FREE_PLAN_NAME ? freePlanId : planIds.get(name) ?? null;

  const result = reduceEvent(
    {
      type: input.eventType || input.payload?.type || "",
      timestamp: input.timestamp ?? input.payload?.timestamp ?? null,
      data,
      planName: productPlanName,
    },
    current,
    now,
    resolvePlanId
  );

  if (result.outcome !== "applied") {
    return { outcome: result.outcome };
  }

  const next = result.next;

  if (next === undefined) {
    return { outcome: "ignored", reason: "no_changes" };
  }

  const planName = next.planName !== undefined ? next.planName : current.planName;

  if (planName === null) {
    // Sin plan no hay escritura: se deja el estado como estaba.
    return { outcome: "unresolved", reason: "missing_plan" };
  }

  const planId = resolvePlanId(planName);

  if (planId === null) {
    return { outcome: "unresolved", reason: `unknown_plan:${planName}` };
  }

  await store.upsertFromWebhook(input.userId, {
    planId,
    planName,
    status: pick(next, current, "status"),
    provider: pick(next, current, "provider"),
    externalId: pick(next, current, "externalId"),
    currentPeriodEnd: pick(next, current, "currentPeriodEnd"),
    cancelAtPeriodEnd: pick(next, current, "cancelAtPeriodEnd"),
    lastEventAt: pick(next, current, "lastEventAt"),
  });

  return { outcome: "applied" };
}

/**
 * Degrada las suscripciones vencidas que quedaron en `cancelled`/`past_due`.
 *
 * Sin plan free en la base no se degrada nada: es preferible dejar el plan
 * actual antes que apuntar a un id inexistente.
 */
export async function sweepExpired(
  store: SubscriptionStore,
  now: Date
): Promise<number> {
  if ((await store.freePlanId()) === null) {
    return 0;
  }

  return store.reconcileExpired(now);
}
