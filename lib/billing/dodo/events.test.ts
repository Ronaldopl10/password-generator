import { describe, expect, it } from "vitest";

import {
  FREE_PLAN_NAME,
  planNameForProductId,
  reduceEvent,
} from "@/lib/billing/dodo/events";
import type { CurrentState, DodoEvent } from "@/lib/billing/dodo/events";

const NOW = new Date("2026-11-22T12:00:00.000Z");
const EVENT_AT = "2026-11-22T11:59:00.000Z";

/** Todo plan resuelve salvo los que el test marca como desconocidos. */
function planIds(known: string[] = ["free", "starter", "pro"]) {
  return (name: string) => (known.includes(name) ? `plan_${name}` : null);
}

function state(overrides: Partial<CurrentState> = {}): CurrentState {
  return {
    provider: null,
    externalId: null,
    planName: null,
    status: "inactive",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lastEventAt: null,
    ...overrides,
  };
}

function event(type: string, data: Record<string, unknown> = {}, timestamp = EVENT_AT): DodoEvent {
  return { type, timestamp, data };
}

function withMetadata(planName: string | null, extra: Record<string, unknown> = {}) {
  return { metadata: planName === null ? {} : { planName }, ...extra };
}

describe("reduceEvent: orden de los eventos", () => {
  it("descarta como stale un evento más viejo que el último aplicado", () => {
    const current = state({
      planName: "pro",
      status: "active",
      lastEventAt: new Date("2026-11-22T11:00:00.000Z"),
    });

    const result = reduceEvent(
      event("subscription.expired", {}, "2026-11-22T10:00:00.000Z"),
      current,
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "stale" });
    expect(result.next).toBeUndefined();
  });

  it("aplica un evento con la misma marca de tiempo que el último", () => {
    const lastEventAt = new Date("2026-11-22T11:00:00.000Z");
    const current = state({ planName: "pro", status: "active", lastEventAt });

    const result = reduceEvent(
      event(
        "subscription.active",
        withMetadata("pro", { subscription_id: "sub_1", next_billing_date: "2026-12-22T11:00:00.000Z" }),
        lastEventAt.toISOString()
      ),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.lastEventAt).toEqual(lastEventAt);
  });

  it("ignora un evento sin marca de tiempo válida", () => {
    const result = reduceEvent(
      event("subscription.active", withMetadata("pro"), "no-es-una-fecha"),
      state(),
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "ignored" });
  });
});

describe("reduceEvent: activación", () => {
  it("adopta el id externo de la suscripción en subscription.active", () => {
    const result = reduceEvent(
      event(
        "subscription.active",
        withMetadata("pro", {
          subscription_id: "sub_123",
          next_billing_date: "2026-12-22T11:59:00.000Z",
        })
      ),
      state(),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next).toEqual({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-12-22T11:59:00.000Z"),
      cancelAtPeriodEnd: false,
      lastEventAt: new Date(EVENT_AT),
    });
  });

  it("extiende el período en subscription.renewed", () => {
    const current = state({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-11-22T00:00:00.000Z"),
      lastEventAt: new Date("2026-10-22T00:00:00.000Z"),
    });

    const result = reduceEvent(
      event(
        "subscription.renewed",
        withMetadata("pro", {
          subscription_id: "sub_123",
          payment_id: "pay_1",
          renewal_amount: 999,
          next_billing_date: "2026-12-22T11:59:00.000Z",
        })
      ),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("active");
    expect(result.next?.currentPeriodEnd).toEqual(new Date("2026-12-22T11:59:00.000Z"));
  });

  it("trata subscription.updated y subscription.plan_changed como activación", () => {
    for (const type of ["subscription.updated", "subscription.plan_changed"]) {
      const result = reduceEvent(
        event(type, withMetadata("pro", { subscription_id: "sub_123" })),
        state(),
        NOW,
        planIds()
      );

      expect(result.outcome).toBe("applied");
      expect(result.next?.status).toBe("active");
      expect(result.next?.planName).toBe("pro");
    }
  });
});

describe("reduceEvent: mora y cancelación", () => {
  it("mantiene el plan en subscription.past_due y usa past_due_ends_at", () => {
    const current = state({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-11-22T00:00:00.000Z"),
    });

    const result = reduceEvent(
      event(
        "subscription.past_due",
        withMetadata("pro", {
          subscription_id: "sub_123",
          past_due_ends_at: "2026-11-29T00:00:00.000Z",
          next_billing_date: "2026-11-22T00:00:00.000Z",
        })
      ),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("past_due");
    expect(result.next?.planName).toBeUndefined();
    expect(result.next?.currentPeriodEnd).toEqual(new Date("2026-11-29T00:00:00.000Z"));
  });

  it("mantiene el plan en subscription.cancelled y marca cancelAtPeriodEnd", () => {
    const current = state({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-12-22T00:00:00.000Z"),
    });

    const result = reduceEvent(
      event(
        "subscription.cancelled",
        withMetadata("pro", {
          subscription_id: "sub_123",
          next_billing_date: "2026-12-22T00:00:00.000Z",
        })
      ),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next).toEqual({
      status: "cancelled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-12-22T00:00:00.000Z"),
      lastEventAt: new Date(EVENT_AT),
    });
  });
});

describe("reduceEvent: degradación al plan free", () => {
  it("degrada en subscription.on_hold", () => {
    const result = reduceEvent(
      event("subscription.on_hold", withMetadata("pro", { subscription_id: "sub_123" })),
      state({ planName: "pro", status: "active", provider: "dodo", externalId: "sub_123" }),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("on_hold");
    expect(result.next?.planName).toBe(FREE_PLAN_NAME);
  });

  it("degrada en subscription.paused con estado on_hold", () => {
    const result = reduceEvent(
      event("subscription.paused", withMetadata("pro")),
      state({ planName: "pro", status: "active" }),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("on_hold");
    expect(result.next?.planName).toBe(FREE_PLAN_NAME);
  });

  it("degrada en subscription.expired", () => {
    const result = reduceEvent(
      event("subscription.expired", withMetadata("pro")),
      state({ planName: "pro", status: "active" }),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("expired");
    expect(result.next?.planName).toBe(FREE_PLAN_NAME);
  });

  it("degrada en subscription.failed", () => {
    const result = reduceEvent(
      event("subscription.failed", withMetadata("pro")),
      state({ planName: "pro", status: "active" }),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("expired");
    expect(result.next?.planName).toBe(FREE_PLAN_NAME);
  });

  it("degrada en refund.succeeded", () => {
    const result = reduceEvent(
      event("refund.succeeded", { subscription_id: "sub_123" }),
      state({ planName: "pro", status: "active" }),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("refunded");
    expect(result.next?.planName).toBe(FREE_PLAN_NAME);
  });
});

describe("reduceEvent: reactivación tras on_hold", () => {
  it("restaura el plan en subscription.unpaused", () => {
    // Estado real después de un on_hold: el plan quedó degradado a free.
    const current = state({
      provider: "dodo",
      externalId: "sub_123",
      planName: FREE_PLAN_NAME,
      status: "on_hold",
      currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      lastEventAt: new Date("2026-11-10T00:00:00.000Z"),
    });

    const result = reduceEvent(
      event(
        "subscription.unpaused",
        withMetadata("pro", {
          subscription_id: "sub_123",
          next_billing_date: "2026-12-22T11:59:00.000Z",
        })
      ),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next).toEqual({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-12-22T11:59:00.000Z"),
      cancelAtPeriodEnd: false,
      lastEventAt: new Date(EVENT_AT),
    });
  });
});

describe("reduceEvent: eventos que no provisionan", () => {
  it("ignora payment.succeeded aunque traiga metadata de plan", () => {
    const result = reduceEvent(
      event("payment.succeeded", withMetadata("pro", { payment_id: "pay_1" })),
      state(),
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "ignored" });
    expect(result.next).toBeUndefined();
  });

  it("ignora los demás eventos de pago, refund.failed y dispute.*", () => {
    const types = [
      "payment.failed",
      "payment.processing",
      "payment.cancelled",
      "refund.failed",
      "dispute.opened",
      "dispute.won",
      "algo.desconocido",
    ];

    for (const type of types) {
      expect(reduceEvent(event(type, withMetadata("pro")), state(), NOW, planIds())).toEqual({
        outcome: "ignored",
      });
    }
  });
});

describe("reduceEvent: resolución de plan", () => {
  it("devuelve unresolved cuando el plan del metadata no existe localmente", () => {
    const current = state({ planName: "pro", status: "active" });

    const result = reduceEvent(
      event("subscription.active", withMetadata("enterprise", { subscription_id: "sub_123" })),
      current,
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "unresolved" });
    expect(result.next).toBeUndefined();
  });

  it("devuelve unresolved cuando el evento no trae nombre de plan ni mapa de producto", () => {
    const result = reduceEvent(
      event("subscription.active", withMetadata(null, { subscription_id: "sub_123" })),
      state(),
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "unresolved" });
  });

  it("nunca degrada cuando el plan free no existe: unresolved, sin next", () => {
    const result = reduceEvent(
      event("subscription.expired", withMetadata("pro")),
      state({ planName: "pro", status: "active" }),
      NOW,
      planIds(["pro"])
    );

    expect(result).toEqual({ outcome: "unresolved" });
    expect(result.next).toBeUndefined();
  });

  it("usa el nombre de plan ya resuelto desde el producto cuando falta el metadata", () => {
    const result = reduceEvent(
      { ...event("subscription.active", { subscription_id: "sub_123" }), planName: "starter" },
      state(),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.planName).toBe("starter");
  });
});

describe("reduceEvent: fin de período (next_billing_date)", () => {
  const NEXT_BILLING_DATE = "2026-12-22T11:59:00.000Z";
  const periodEndEvents = [
    "subscription.active",
    "subscription.renewed",
    "subscription.updated",
    "subscription.plan_changed",
    "subscription.unpaused",
    "subscription.cancelled",
  ];

  it("lee el fin del período pago desde next_billing_date en cada evento que lo trae", () => {
    const current = state({
      provider: "dodo",
      externalId: "sub_123",
      planName: "pro",
      status: "active",
    });

    for (const type of periodEndEvents) {
      const result = reduceEvent(
        event(type, withMetadata("pro", { subscription_id: "sub_123", next_billing_date: NEXT_BILLING_DATE })),
        current,
        NOW,
        planIds()
      );

      expect(result.outcome, type).toBe("applied");
      expect(result.next?.currentPeriodEnd, type).toEqual(new Date(NEXT_BILLING_DATE));
    }
  });

  // Fallback tolerante: `current_period_end` no existe en el SDK de Dodo, pero
  // un payload viejo podría traerlo. Es la única ruta que lo acepta, y nunca le
  // gana a `next_billing_date`.
  it("acepta current_period_end sólo como fallback y prefiere next_billing_date", () => {
    const fallback = reduceEvent(
      event(
        "subscription.active",
        withMetadata("pro", {
          subscription_id: "sub_123",
          current_period_end: NEXT_BILLING_DATE,
        })
      ),
      state(),
      NOW,
      planIds()
    );

    expect(fallback.outcome).toBe("applied");
    expect(fallback.next?.currentPeriodEnd).toEqual(new Date(NEXT_BILLING_DATE));

    const both = reduceEvent(
      event(
        "subscription.active",
        withMetadata("pro", {
          subscription_id: "sub_123",
          next_billing_date: NEXT_BILLING_DATE,
          current_period_end: "2027-01-22T00:00:00.000Z",
        })
      ),
      state(),
      NOW,
      planIds()
    );

    expect(both.next?.currentPeriodEnd).toEqual(new Date(NEXT_BILLING_DATE));
  });

  it("trata un fin de período ilegible como null sin romper el evento", () => {
    const result = reduceEvent(
      event(
        "subscription.active",
        withMetadata("pro", { subscription_id: "sub_123", next_billing_date: "no-es-una-fecha" })
      ),
      state(),
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.currentPeriodEnd).toBeNull();
  });

  it("cae al fin de período guardado cuando el evento no trae fecha", () => {
    const stored = new Date("2026-12-01T00:00:00.000Z");
    const result = reduceEvent(
      event("subscription.updated", withMetadata("pro", { subscription_id: "sub_123" })),
      state({ provider: "dodo", externalId: "sub_123", planName: "pro", status: "active", currentPeriodEnd: stored }),
      NOW,
      planIds()
    );

    expect(result.next?.currentPeriodEnd).toEqual(stored);
  });
});

describe("reduceEvent: eventos de otra suscripción", () => {
  const current = state({
    provider: "dodo",
    externalId: "sub_actual",
    planName: "pro",
    status: "active",
  });
  const foreign = { subscription_id: "sub_vieja" };

  it("ignora un downgrade que viene de otra suscripción", () => {
    for (const type of [
      "subscription.on_hold",
      "subscription.paused",
      "subscription.expired",
      "subscription.failed",
      "refund.succeeded",
    ]) {
      const result = reduceEvent(event(type, withMetadata("pro", foreign)), current, NOW, planIds());

      expect(result, type).toEqual({ outcome: "ignored" });
      expect(result.next, type).toBeUndefined();
    }
  });

  it("ignora una cancelación que viene de otra suscripción", () => {
    const result = reduceEvent(
      event("subscription.cancelled", withMetadata("pro", foreign)),
      current,
      NOW,
      planIds()
    );

    expect(result).toEqual({ outcome: "ignored" });
    expect(result.next).toBeUndefined();
  });

  it("aplica el downgrade cuando el evento es de la suscripción actual", () => {
    const result = reduceEvent(
      event("subscription.expired", withMetadata("pro", { subscription_id: "sub_actual" })),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("expired");
  });

  it("no aplica la guarda cuando el evento no trae subscription_id", () => {
    const result = reduceEvent(
      event("subscription.expired", withMetadata("pro")),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.status).toBe("expired");
  });

  it("una activación de otra suscripción adopta el id nuevo (resubscribe)", () => {
    const result = reduceEvent(
      event("subscription.active", withMetadata("pro", { subscription_id: "sub_nueva" })),
      current,
      NOW,
      planIds()
    );

    expect(result.outcome).toBe("applied");
    expect(result.next?.externalId).toBe("sub_nueva");
    expect(result.next?.planName).toBe("pro");
  });
});

describe("planNameForProductId", () => {
  const products = {
    DODO_PRODUCT_STARTER: "pdt_starter_123",
    DODO_PRODUCT_PRO: "pdt_pro_456",
  };

  it("invierte el mapa producto → nombre de plan", () => {
    expect(planNameForProductId("pdt_starter_123", products)).toBe("starter");
    expect(planNameForProductId("pdt_pro_456", products)).toBe("pro");
  });

  it("devuelve null para un producto desconocido, vacío o ausente", () => {
    expect(planNameForProductId("pdt_otro", products)).toBeNull();
    expect(planNameForProductId("   ", products)).toBeNull();
    expect(planNameForProductId(null, products)).toBeNull();
    expect(planNameForProductId(undefined, products)).toBeNull();
    expect(planNameForProductId("pdt_starter_123", {})).toBeNull();
  });
});
