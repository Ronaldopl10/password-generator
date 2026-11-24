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
 * Estado que la lectura observó antes de escribir. Es la base de la escritura
 * condicional: si la fila cambió en el medio, la escritura no se aplica.
 */
export interface ObservedSubscription {
  /** `false` cuando el usuario no tenía fila de suscripción al leer. */
  exists: boolean;
  /** `lastEventAt` tal como lo devolvió la lectura (`null` en una fila nueva). */
  lastEventAt: Date | null;
}

/** Motivo con el que se informa un conflicto de escritura concurrente. */
export const CONFLICT_REASON = "conflict";

/**
 * Resultado de la escritura. `applied: false` es un conflicto de concurrencia:
 * otro evento escribió primero y este no se aplicó.
 */
export type SubscriptionWriteResult =
  | { applied: true }
  | { applied: false; reason: typeof CONFLICT_REASON };

/**
 * Persistencia que necesita la provisión. Toda la implementación de base de
 * datos queda detrás de esta interfaz: el módulo puro nunca importa prisma.
 */
export interface SubscriptionStore {
  findSubscription(userId: string): Promise<CurrentState | null>;
  planIdByName(name: string): Promise<string | null>;
  freePlanId(): Promise<string | null>;
  /**
   * Escribe el estado observado en `observed`; `applied: false` = conflicto.
   * La implementación es una única escritura condicional sobre `lastEventAt`.
   */
  upsertFromWebhook(
    userId: string,
    data: SubscriptionWrite,
    observed: ObservedSubscription
  ): Promise<SubscriptionWriteResult>;
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
  /** Motivo del resultado; el llamador lo persiste cuando aporta información. */
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
 * con el `outcome` y no tocan la suscripción. Sólo un `applied` escribe, y una
 * escritura que choca con otro evento en curso queda como `stale` con
 * `reason: CONFLICT_REASON` (nunca como éxito).
 */
export async function applyEventToStore(
  input: EventInput,
  store: SubscriptionStore,
  now: Date,
  options: ApplyEventOptions = {}
): Promise<ApplyResult> {
  const stored = await store.findSubscription(input.userId);
  const current = stored ?? EMPTY_STATE;
  const observed: ObservedSubscription = {
    exists: stored !== null,
    lastEventAt: stored?.lastEventAt ?? null,
  };
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

  const write = await store.upsertFromWebhook(
    input.userId,
    {
      planId,
      planName,
      status: pick(next, current, "status"),
      provider: pick(next, current, "provider"),
      externalId: pick(next, current, "externalId"),
      currentPeriodEnd: pick(next, current, "currentPeriodEnd"),
      cancelAtPeriodEnd: pick(next, current, "cancelAtPeriodEnd"),
      lastEventAt: pick(next, current, "lastEventAt"),
    },
    observed
  );

  if (!write.applied) {
    // Otro evento escribió entre la lectura y esta escritura: el estado que se
    // leyó ya no rige. No se reintenta acá; reintentar es decisión del drenaje.
    return { outcome: "stale", reason: CONFLICT_REASON };
  }

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
