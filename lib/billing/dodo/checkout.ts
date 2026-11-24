/**
 * Decisión pura del checkout de Dodo Payments.
 *
 * Sin prisma, sin `process.env` y sin fechas implícitas: entra el estado
 * (plan, suscripción actual y `now`) y sale la decisión. Así la guardia de
 * doble suscripción se testea sin base de datos y el route handler queda como
 * orquestación.
 */

/** Motivos por los que no se crea una sesión de checkout. */
export type CheckoutRefusalReason = "free_plan" | "already_subscribed";

export type CheckoutDecision =
  | { allowed: true }
  | { allowed: false; reason: CheckoutRefusalReason };

/** Lo único que la decisión necesita del plan de la DB. */
export interface CheckoutPlanInput {
  price: number;
}

/** Lo único que la decisión necesita de la suscripción actual del usuario. */
export interface CheckoutSubscriptionInput {
  provider: string | null;
  /** `Subscription.status` tal como lo dejó el último webhook aplicado. */
  status: string;
  currentPeriodEnd: Date | null;
}

/** Pasarela que origina suscripciones de Dodo. */
export const DODO_PROVIDER = "dodo";

/** Estados de Dodo con acceso pago vigente, sin mirar la fecha. */
const ENTITLED_STATUSES: readonly string[] = ["active", "past_due"];

/**
 * ¿La suscripción todavía da acceso pago?
 *
 * La decisión va por `status`, no por la fecha: `currentPeriodEnd` puede ser
 * `null` porque el webhook todavía no trajo la fecha (o porque el campo cambió
 * de nombre en la pasarela), y un `null` no prueba que la suscripción terminó.
 * Sólo una cancelación con fin de período conocido y futuro sigue vigente; sin
 * fecha conocida no hay período pago que conservar.
 */
function isStillEntitled(
  subscription: CheckoutSubscriptionInput,
  now: Date
): boolean {
  if (ENTITLED_STATUSES.includes(subscription.status)) {
    return true;
  }

  if (subscription.status !== "cancelled") {
    return false;
  }

  return (
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd.getTime() > now.getTime()
  );
}

/**
 * ¿Se puede crear un checkout para este usuario?
 *
 * - Plan free (`price <= 0`) → `free_plan`.
 * - Suscripción de Dodo vigente por `status` (y, si está cancelada, por el fin
 *   del período pago) → `already_subscribed`.
 * - Cualquier otra suscripción (Mercado Pago, sin provider o de Dodo ya
 *   vencida) no bloquea: el usuario tiene que poder migrar o volver a pagar.
 */
export function decideCheckoutAccess(
  plan: CheckoutPlanInput,
  subscription: CheckoutSubscriptionInput | null,
  now: Date
): CheckoutDecision {
  if (plan.price <= 0) {
    return { allowed: false, reason: "free_plan" };
  }

  if (
    subscription !== null &&
    subscription.provider === DODO_PROVIDER &&
    isStillEntitled(subscription, now)
  ) {
    return { allowed: false, reason: "already_subscribed" };
  }

  return { allowed: true };
}

export interface CheckoutMetadataInput {
  userId: string;
  planId: string;
  planName: string;
}

/** Metadata que viaja a Dodo: tres strings, sin huecos ni `undefined`. */
export type DodoCheckoutMetadata = {
  userId: string;
  planId: string;
  planName: string;
};

/** Metadata del checkout; el webhook la usa para vincular el pago al usuario. */
export function buildCheckoutMetadata({
  userId,
  planId,
  planName,
}: CheckoutMetadataInput): DodoCheckoutMetadata {
  return { userId, planId, planName };
}
