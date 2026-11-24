import { describe, expect, it } from "vitest";

import { buildCheckoutMetadata, decideCheckoutAccess } from "@/lib/billing/dodo/checkout";
import type { CheckoutSubscriptionInput } from "@/lib/billing/dodo/checkout";

const NOW = new Date("2026-11-22T12:00:00.000Z");

const paidPlan = { price: 2.99 };
const future = new Date("2026-12-22T12:00:00.000Z");
const past = new Date("2026-10-22T12:00:00.000Z");

/** Suscripción en el estado dado, con la pasarela y el fin de período explícitos. */
function sub(
  provider: string | null,
  status: string,
  currentPeriodEnd: Date | null
): CheckoutSubscriptionInput {
  return { provider, status, currentPeriodEnd };
}

/** Suscripción de Dodo en el estado dado; el fin de período es explícito. */
function dodo(status: string, currentPeriodEnd: Date | null): CheckoutSubscriptionInput {
  return sub("dodo", status, currentPeriodEnd);
}

describe("decisión de checkout de Dodo", () => {
  it("rechaza el plan free por precio cero", () => {
    expect(decideCheckoutAccess({ price: 0 }, null, NOW)).toEqual({
      allowed: false,
      reason: "free_plan",
    });
  });

  it("rechaza un precio negativo como plan free", () => {
    expect(decideCheckoutAccess({ price: -1 }, null, NOW)).toEqual({
      allowed: false,
      reason: "free_plan",
    });
  });

  it("rechaza a quien tiene la suscripción activa", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("active", future), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  it("rechaza a quien está en mora", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("past_due", future), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  // El bug que esto fija: `currentPeriodEnd` puede ser null porque el webhook
  // todavía no trajo la fecha. Un null no prueba que ya no haya suscripción.
  it("rechaza una suscripción activa aunque no tenga fin de período", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("active", null), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  it("rechaza una suscripción en mora sin fin de período", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("past_due", null), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  // El otro lado del bug: con el fin de período en null el usuario quedaba
  // bloqueado para siempre. Cancelado sin fecha conocida no es "vigente".
  it("permite pagar cuando la suscripción cancelada no tiene fin de período conocido", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("cancelled", null), NOW)).toEqual({
      allowed: true,
    });
  });

  it("rechaza una suscripción cancelada que todavía tiene período pago vigente", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("cancelled", future), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  it("permite pagar cuando la suscripción cancelada ya venció", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("cancelled", past), NOW)).toEqual({
      allowed: true,
    });
  });

  it("trata el fin de período igual a now como vencido", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("cancelled", new Date(NOW)), NOW)).toEqual({
      allowed: true,
    });
  });

  it("permite pagar cuando la suscripción de Dodo venció", () => {
    expect(decideCheckoutAccess(paidPlan, dodo("expired", past), NOW)).toEqual({
      allowed: true,
    });
  });

  it("permite pagar cuando la suscripción está en on_hold o reembolsada", () => {
    for (const status of ["on_hold", "refunded", "inactive"]) {
      expect(decideCheckoutAccess(paidPlan, dodo(status, future), NOW), status).toEqual({
        allowed: true,
      });
    }
  });

  // F3: la fila `Subscription` es única por usuario, así que un checkout de
  // Dodo sobre una suscripción de Mercado Pago vigente el webhook la pisaría:
  // doble cobro y entitlement perdido. Migrar es una decisión explícita.
  it("rechaza una suscripción activa de Mercado Pago: migrar no puede pisar el plan", () => {
    expect(
      decideCheckoutAccess(paidPlan, sub("mercadopago", "active", future), NOW)
    ).toEqual({ allowed: false, reason: "already_subscribed" });
  });

  it("rechaza una suscripción en mora de Mercado Pago", () => {
    expect(
      decideCheckoutAccess(paidPlan, sub("mercadopago", "past_due", future), NOW)
    ).toEqual({ allowed: false, reason: "already_subscribed" });
  });

  it("rechaza una suscripción vigente sin provider: cualquier acceso pago bloquea", () => {
    expect(decideCheckoutAccess(paidPlan, sub(null, "active", future), NOW)).toEqual({
      allowed: false,
      reason: "already_subscribed",
    });
  });

  // El otro lado de la regla: sin acceso pago vigente, cualquier pasarela deja
  // pagar. Si no, un usuario de Mercado Pago vencido quedaría sin checkout.
  it("permite pagar con una suscripción de Mercado Pago ya vencida", () => {
    for (const status of ["expired", "refunded", "on_hold"]) {
      expect(
        decideCheckoutAccess(paidPlan, sub("mercadopago", status, future), NOW),
        status
      ).toEqual({ allowed: true });
    }
  });

  it("no bloquea por una cancelación de Mercado Pago sin fin de período conocido", () => {
    expect(
      decideCheckoutAccess(paidPlan, sub("mercadopago", "cancelled", null), NOW)
    ).toEqual({ allowed: true });
  });

  it("permite pagar cuando no hay suscripción", () => {
    expect(decideCheckoutAccess(paidPlan, null, NOW)).toEqual({ allowed: true });
  });

  it("el plan free gana sobre la guardia de doble suscripción", () => {
    expect(decideCheckoutAccess({ price: 0 }, dodo("active", future), NOW)).toEqual({
      allowed: false,
      reason: "free_plan",
    });
  });
});

describe("metadata del checkout de Dodo", () => {
  it("devuelve exactamente userId, planId y planName como strings", () => {
    const metadata = buildCheckoutMetadata({
      userId: "user_123",
      planId: "plan_456",
      planName: "pro",
    });

    expect(metadata).toEqual({
      userId: "user_123",
      planId: "plan_456",
      planName: "pro",
    });
    expect(Object.keys(metadata).sort()).toEqual(["planId", "planName", "userId"]);

    for (const value of Object.values(metadata)) {
      expect(typeof value).toBe("string");
    }
  });
});
