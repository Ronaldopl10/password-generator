/**
 * Reducer puro de eventos de Dodo Payments → estado de la suscripción.
 *
 * Sin prisma, sin red y sin `process.env`: entra el evento (tal como lo dejó la
 * firma verificada), el estado actual y `now`; sale la decisión. Los ids de los
 * planes locales no se conocen acá: el llamador inyecta `planIdForName`, que
 * además sirve para saber si un plan existe en la base (si devuelve `null`, el
 * evento queda `unresolved` y **nunca** se degrada el plan).
 *
 * Orden de las reglas (no cambiar): primero la marca de tiempo (un evento más
 * viejo que el último aplicado se descarta), después el mapeo por tipo y recién
 * al final la resolución del plan. Dentro del mapeo, un downgrade sólo se
 * aplica si el evento habla de la suscripción que ya está aplicada: el
 * `subscription_id` de otra suscripción no degrada a este usuario.
 */

import { DODO_PROVIDER } from "./checkout";
import { PLAN_PRODUCT_ENV_VARS } from "./products";
import type { DodoProducts } from "./products";

/** Plan sembrado por `prisma/seed.ts` al que se degrada. */
export const FREE_PLAN_NAME = "free";

/** Estado de la suscripción que el reducer necesita conocer. */
export type CurrentState = {
  provider: string | null;
  externalId: string | null;
  planName: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastEventAt: Date | null;
};

/** Resultado de reducir un evento. Sólo `applied` trae `next`. */
export type EventOutcome = "applied" | "ignored" | "stale" | "unresolved";

export interface ReduceResult {
  outcome: EventOutcome;
  next?: Partial<CurrentState>;
}

/**
 * Evento tal como llega después de verificar la firma. `data` es JSON sin
 * tipar: el body lo controla Dodo, no se confía en su forma.
 */
export interface DodoEvent {
  type: string;
  timestamp: string | Date | null;
  data?: Record<string, unknown> | null;
  /**
   * Nombre de plan ya resuelto desde `data.product_id` por el llamador. Es el
   * fallback cuando el metadata del checkout no trae `planName`.
   */
  planName?: string | null;
}

function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readString(
  source: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = source?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Fin del período de facturación que el evento describe.
 *
 * El SDK de Dodo no tiene `current_period_end`: el fin del período corriente es
 * `next_billing_date` (`node_modules/dodopayments/resources/subscriptions.d.ts`,
 * "Timestamp of the next scheduled billing. Indicates the end of current
 * billing period"). `current_period_end` queda sólo como fallback tolerante por
 * si un payload viejo lo trae; nunca es la fuente esperada. Un valor presente
 * pero ilegible se resuelve como `null`: no invalida el evento.
 */
function periodEndFrom(data: Record<string, unknown> | null): Date | null {
  const raw = data?.next_billing_date ?? data?.current_period_end ?? null;

  return parseTimestamp(raw);
}

/** `data.metadata.planName` del checkout, o `null` si no vino o no es string. */
export function planNameFromMetadata(
  data: Record<string, unknown> | null | undefined
): string | null {
  const metadata = data?.metadata;

  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }

  return readString(metadata as Record<string, unknown>, "planName");
}

/**
 * Invierte el mapa plan → producto de Dodo: id de producto (`pdt_…`) → nombre
 * de plan sembrado. Data pura; los productos configurados los pasa el llamador.
 */
export function planNameForProductId(
  productId: string | null | undefined,
  products: DodoProducts
): string | null {
  const id = typeof productId === "string" ? productId.trim() : "";

  if (!id) {
    return null;
  }

  const mapping = PLAN_PRODUCT_ENV_VARS as Record<string, string | null>;

  for (const [planName, envVar] of Object.entries(mapping)) {
    if (envVar === null) {
      continue;
    }

    if (products[envVar as keyof DodoProducts]?.trim() === id) {
      return planName;
    }
  }

  return null;
}

/** Nombre de plan del evento: metadata del checkout y, si falta, el producto. */
function eventPlanName(event: DodoEvent): string | null {
  return planNameFromMetadata(event.data) ?? event.planName ?? null;
}

/**
 * Reduce un evento al próximo estado parcial.
 *
 * `planIdForName` resuelve nombre de plan → id local y devuelve `null` cuando
 * el plan no existe. Se usa sólo para validar que la transición sea aplicable:
 * el reducer no conoce ids.
 */
export function reduceEvent(
  event: DodoEvent,
  current: CurrentState,
  now: Date,
  planIdForName: (name: string) => string | null
): ReduceResult {
  // Sin marca de tiempo verificable no hay forma de ordenar el evento: no se
  // aplica (pero tampoco se descarta la fila de la cola).
  const eventAt = parseTimestamp(event.timestamp);

  if (eventAt === null) {
    return { outcome: "ignored" };
  }

  // S8: un evento más viejo que el estado ya aplicado no puede degradarlo.
  if (current.lastEventAt !== null && eventAt.getTime() < current.lastEventAt.getTime()) {
    return { outcome: "stale" };
  }

  const data = event.data ?? null;

  // F2: un evento de downgrade sólo puede tocar la suscripción que ya está
  // aplicada. El mensaje de una suscripción vieja (o de otro customer) llega
  // tarde y no debe apagar un plan pago vigente. La activación no usa esta
  // guarda: un resubscribe real reemplaza el id externo con el del evento.
  const eventSubscriptionId = readString(data, "subscription_id");
  const fromAnotherSubscription =
    current.externalId !== null &&
    eventSubscriptionId !== null &&
    eventSubscriptionId !== current.externalId;

  const downgradeToFree = (status: string): ReduceResult => {
    if (fromAnotherSubscription) {
      return { outcome: "ignored" };
    }

    if (planIdForName(FREE_PLAN_NAME) === null) {
      return { outcome: "unresolved" };
    }

    return {
      outcome: "applied",
      next: { status, planName: FREE_PLAN_NAME, lastEventAt: eventAt },
    };
  };

  switch (event.type) {
    // Reactivación tras una mora: el plan vuelve a ser el del checkout. Un
    // `unpaused` sin nombre de plan no se inventa: queda `unresolved`.
    case "subscription.unpaused":
    // Activación, renovación y cambios de plan: provisionan el plan del evento.
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.updated":
    case "subscription.plan_changed": {
      const planName = eventPlanName(event);

      if (planName === null || planIdForName(planName) === null) {
        return { outcome: "unresolved" };
      }

      return {
        outcome: "applied",
        next: {
          provider: DODO_PROVIDER,
          externalId: readString(data, "subscription_id") ?? current.externalId,
          planName,
          status: "active",
          currentPeriodEnd: periodEndFrom(data) ?? current.currentPeriodEnd,
          cancelAtPeriodEnd: false,
          lastEventAt: eventAt,
        },
      };
    }

    // Mora: se mantiene el plan y corre el fin de período al plazo de gracia.
    case "subscription.past_due":
      return {
        outcome: "applied",
        next: {
          status: "past_due",
          currentPeriodEnd:
            parseTimestamp(readString(data, "past_due_ends_at")) ??
            periodEndFrom(data) ??
            current.currentPeriodEnd,
          lastEventAt: eventAt,
        },
      };

    // Cancelación: el usuario conserva el plan hasta el fin del período pago.
    case "subscription.cancelled":
      if (fromAnotherSubscription) {
        return { outcome: "ignored" };
      }

      return {
        outcome: "applied",
        next: {
          status: "cancelled",
          cancelAtPeriodEnd: true,
          currentPeriodEnd: periodEndFrom(data) ?? current.currentPeriodEnd,
          lastEventAt: eventAt,
        },
      };

    // Acceso suspendido: se vuelve al plan free.
    case "subscription.on_hold":
    case "subscription.paused":
      return downgradeToFree("on_hold");

    // Pérdida definitiva del período pago.
    case "subscription.expired":
    case "subscription.failed":
      return downgradeToFree("expired");

    case "refund.succeeded":
      return downgradeToFree("refunded");

    // Los eventos de pago y de disputa no provisionan por sí solos: el plan lo
    // mueve únicamente `subscription.*` (S8).
    default:
      return { outcome: "ignored" };
  }
}
