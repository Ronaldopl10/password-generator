/**
 * Regresión de la forma REAL del payload de Dodo.
 *
 * Los fixtures tienen que reflejar los tipos del SDK en
 * `node_modules/dodopayments/resources/subscriptions.d.ts`: el objeto
 * `Subscription` trae `next_billing_date` como fin del período de facturación
 * corriente y **no** tiene `current_period_end`. Un fixture que inventa un
 * campo hace que los tests pasen mientras producción queda rota: por eso este
 * archivo no agrega campos que Dodo no manda.
 */

import { describe, expect, it } from "vitest";

import { FREE_PLAN_NAME, reduceEvent } from "@/lib/billing/dodo/events";
import type { CurrentState, DodoEvent } from "@/lib/billing/dodo/events";

const NOW = new Date("2026-11-22T12:00:00.000Z");
const EVENT_AT = "2026-11-22T11:59:00.000Z";
const NEXT_BILLING_DATE = "2026-12-22T11:59:00.000Z";
const PREVIOUS_BILLING_DATE = "2026-11-22T11:59:00.000Z";

const SUBSCRIPTION_ID = "sub_live_123";
const OLD_SUBSCRIPTION_ID = "sub_vieja_456";

/** `Subscription` del SDK, recortado a los campos que el reducer mira. */
function subscriptionPayload(overrides: Record<string, unknown> = {}) {
  return {
    subscription_id: SUBSCRIPTION_ID,
    product_id: "pdt_pro_456",
    status: "active",
    metadata: { userId: "user_1", planId: "plan_pro", planName: "pro" },
    customer: { customer_id: "cus_1", email: "user@example.com", name: "User" },
    next_billing_date: NEXT_BILLING_DATE,
    previous_billing_date: PREVIOUS_BILLING_DATE,
    created_at: PREVIOUS_BILLING_DATE,
    cancel_at_next_billing_date: false,
    recurring_pre_tax_amount: 999,
    quantity: 1,
    currency: "USD",
    ...overrides,
  };
}

function subscriptionEvent(
  type: string,
  data: Record<string, unknown> = subscriptionPayload()
): DodoEvent {
  return { type, timestamp: EVENT_AT, data };
}

/** Suscripción pagada vigente, tal como quedó tras el primer pago. */
function activeState(overrides: Partial<CurrentState> = {}): CurrentState {
  return {
    provider: "dodo",
    externalId: SUBSCRIPTION_ID,
    planName: "pro",
    status: "active",
    currentPeriodEnd: new Date(NEXT_BILLING_DATE),
    cancelAtPeriodEnd: false,
    lastEventAt: null,
    ...overrides,
  };
}

/** free, starter y pro existen en la base para estos tests. */
function planIds(name: string): string | null {
  const known: Record<string, string> = {
    [FREE_PLAN_NAME]: "plan_free",
    starter: "plan_starter",
    pro: "plan_pro",
  };

  return known[name] ?? null;
}

describe("payload real de Dodo: next_billing_date", () => {
  it("subscription.active sin current_period_end aplica el fin de período", () => {
    const data = subscriptionPayload();

    // El campo inventado no existe ni en el fixture ni en el SDK.
    expect("current_period_end" in data).toBe(false);

    const result = reduceEvent(
      subscriptionEvent("subscription.active", data),
      activeState({ externalId: null, planName: null, status: "inactive", currentPeriodEnd: null }),
      NOW,
      planIds
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.currentPeriodEnd).toEqual(new Date(NEXT_BILLING_DATE));
    expect(result.next?.status).toBe("active");
  });

  it("subscription.cancelled guarda el fin de período y conserva el plan", () => {
    const result = reduceEvent(
      subscriptionEvent("subscription.cancelled"),
      activeState(),
      NOW,
      planIds
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.currentPeriodEnd).toEqual(new Date(NEXT_BILLING_DATE));
    expect(result.next?.status).toBe("cancelled");
    // El plan no viaja en el `next`: se conserva el actual, no se degrada.
    expect(result.next?.planName).toBeUndefined();
  });

  it("un expired de una suscripción vieja no degrada al usuario que sigue pagando", () => {
    const result = reduceEvent(
      subscriptionEvent("subscription.expired", subscriptionPayload({ subscription_id: OLD_SUBSCRIPTION_ID })),
      activeState(),
      NOW,
      planIds
    );

    expect(result.outcome).not.toBe("applied");
    expect(result.next).toBeUndefined();
  });

  it("un active de otra suscripción se aplica y adopta el id nuevo (resubscribe)", () => {
    const result = reduceEvent(
      subscriptionEvent("subscription.active", subscriptionPayload({ subscription_id: OLD_SUBSCRIPTION_ID })),
      activeState(),
      NOW,
      planIds
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.externalId).toBe(OLD_SUBSCRIPTION_ID);
    expect(result.next?.planName).toBe("pro");
    expect(result.next?.status).toBe("active");
  });
});
