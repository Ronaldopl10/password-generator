import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyEventToStore, sweepExpired } from "@/lib/billing/dodo/provision";
import type { SubscriptionStore, SubscriptionWrite } from "@/lib/billing/dodo/provision";
import type { CurrentState } from "@/lib/billing/dodo/events";
import { runEvent } from "@/lib/billing/dodo/provision-prisma";

/**
 * Prisma falso para `runEvent`: la cola y la provisión se ejercitan sin abrir
 * ninguna conexión. `vi.mock` reemplaza `@/lib/prisma` antes de que el módulo
 * adaptador se importe.
 */
const db = vi.hoisted(() => {
  type Row = Record<string, any>;

  const state = {
    row: null as Row | null,
    subscription: null as Row | null,
    users: new Map<string, string>(),
    planIds: { free: "plan_free", starter: "plan_starter", pro: "plan_pro" } as Record<string, string>,
  };
  const eventUpdates: Row[] = [];
  const subscriptionUpserts: Array<{ userId: string; data: Row }> = [];
  const userLookups: string[] = [];

  const prisma = {
    billingWebhookEvent: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => state.row,
      update: async (args: Row) => {
        eventUpdates.push(args.data);
        return args.data;
      },
    },
    plan: {
      findUnique: async (args: Row) => {
        const id = state.planIds[args?.where?.name as string];
        return id ? { id } : null;
      },
    },
    subscription: {
      findUnique: async () => state.subscription,
      upsert: async (args: Row) => {
        subscriptionUpserts.push({ userId: args.where.userId, data: args.create });
        return args.create;
      },
      updateMany: async () => ({ count: 0 }),
    },
    user: {
      findUnique: async (args: Row) => {
        const email = String(args?.where?.email ?? "");
        userLookups.push(email);
        const id = state.users.get(email);
        return id ? { id } : null;
      },
    },
  };

  return { state, eventUpdates, subscriptionUpserts, userLookups, prisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: db.prisma }));

const NOW = new Date("2026-11-22T12:00:00.000Z");
const EVENT_AT = "2026-11-22T11:59:00.000Z";
const FUTURE = new Date("2026-12-22T11:59:00.000Z");
const PAST = new Date("2026-11-01T11:59:00.000Z");

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

/** Store en memoria: nunca toca una base de datos. */
class FakeStore implements SubscriptionStore {
  readonly subscriptions = new Map<string, CurrentState>();
  readonly writes: Array<{ userId: string; data: SubscriptionWrite }> = [];
  readonly plans = new Map<string, string>([
    ["free", "plan_free"],
    ["starter", "plan_starter"],
    ["pro", "plan_pro"],
  ]);
  reconcileCalls: Date[] = [];
  reconcileResult = 0;

  constructor(initial: Record<string, CurrentState> = {}) {
    for (const [userId, sub] of Object.entries(initial)) {
      this.subscriptions.set(userId, sub);
    }
  }

  async findSubscription(userId: string): Promise<CurrentState | null> {
    return this.subscriptions.get(userId) ?? null;
  }

  async planIdByName(name: string): Promise<string | null> {
    return this.plans.get(name) ?? null;
  }

  async freePlanId(): Promise<string | null> {
    return this.plans.get("free") ?? null;
  }

  async upsertFromWebhook(userId: string, data: SubscriptionWrite): Promise<void> {
    this.writes.push({ userId, data });
    const planName =
      [...this.plans.entries()].find(([, id]) => id === data.planId)?.[0] ?? null;

    this.subscriptions.set(userId, {
      provider: data.provider,
      externalId: data.externalId,
      planName,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      lastEventAt: data.lastEventAt,
    });
  }

  async reconcileExpired(now: Date): Promise<number> {
    this.reconcileCalls.push(now);

    const freePlanId = this.plans.get("free");

    if (!freePlanId) {
      return 0;
    }

    let downgraded = 0;

    for (const [userId, sub] of this.subscriptions) {
      const isExpiredStatus = sub.status === "cancelled" || sub.status === "past_due";
      const isPast =
        sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() < now.getTime();

      if (isExpiredStatus && isPast) {
        this.subscriptions.set(userId, {
          ...sub,
          planName: "free",
          status: "expired",
        });
        downgraded += 1;
      }
    }

    return downgraded;
  }
}

const activeData = {
  subscription_id: "sub_123",
  next_billing_date: FUTURE.toISOString(),
  metadata: { planName: "pro", userId: "user_1", planId: "plan_pro" },
};

function activePayload(data: Record<string, unknown> = activeData) {
  return {
    business_id: "bus_1",
    type: "subscription.active",
    timestamp: EVENT_AT,
    data,
  };
}

describe("applyEventToStore: escritura", () => {
  it("escribe el estado cuando el evento se aplica", async () => {
    const store = new FakeStore();

    const result = await applyEventToStore(
      {
        eventType: "subscription.active",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: activePayload(),
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "applied" });
    expect(store.writes).toHaveLength(1);
    expect(store.writes[0].userId).toBe("user_1");
    expect(store.writes[0].data).toEqual({
      planId: "plan_pro",
      planName: "pro",
      status: "active",
      provider: "dodo",
      externalId: "sub_123",
      currentPeriodEnd: FUTURE,
      cancelAtPeriodEnd: false,
      lastEventAt: new Date(EVENT_AT),
    });
  });

  it("conserva el plan actual en past_due", async () => {
    const store = new FakeStore({
      user_1: state({
        provider: "dodo",
        externalId: "sub_123",
        planName: "pro",
        status: "active",
        currentPeriodEnd: FUTURE,
        lastEventAt: new Date("2026-11-21T00:00:00.000Z"),
      }),
    });

    const result = await applyEventToStore(
      {
        eventType: "subscription.past_due",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: {
          type: "subscription.past_due",
          timestamp: EVENT_AT,
          data: {
            subscription_id: "sub_123",
            past_due_ends_at: "2026-11-29T00:00:00.000Z",
            metadata: { planName: "pro" },
          },
        },
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "applied" });
    expect(store.writes[0].data.planId).toBe("plan_pro");
    expect(store.writes[0].data.status).toBe("past_due");
    expect(store.writes[0].data.currentPeriodEnd).toEqual(
      new Date("2026-11-29T00:00:00.000Z")
    );
  });

  it("resuelve el plan por el mapa de producto cuando falta el metadata", async () => {
    const store = new FakeStore();

    const result = await applyEventToStore(
      {
        eventType: "subscription.active",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: activePayload({
          subscription_id: "sub_123",
          product_id: "pdt_pro_456",
          next_billing_date: FUTURE.toISOString(),
          metadata: {},
        }),
      },
      store,
      NOW,
      { products: { DODO_PRODUCT_PRO: "pdt_pro_456" } }
    );

    expect(result).toEqual({ outcome: "applied" });
    expect(store.writes[0].data.planId).toBe("plan_pro");
  });
});

describe("applyEventToStore: sin escritura", () => {
  it("no escribe un evento stale", async () => {
    const store = new FakeStore({
      user_1: state({
        planName: "pro",
        status: "active",
        lastEventAt: new Date("2026-11-22T11:30:00.000Z"),
      }),
    });

    const result = await applyEventToStore(
      {
        eventType: "subscription.expired",
        timestamp: "2026-11-22T10:00:00.000Z",
        userId: "user_1",
        payload: activePayload(),
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "stale" });
    expect(store.writes).toHaveLength(0);
  });

  it("no escribe un evento ignorado", async () => {
    const store = new FakeStore();

    const result = await applyEventToStore(
      {
        eventType: "payment.succeeded",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: { ...activePayload(), type: "payment.succeeded" },
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "ignored" });
    expect(store.writes).toHaveLength(0);
  });

  it("no escribe cuando el plan no se resuelve y no degrada el plan actual", async () => {
    const store = new FakeStore({
      user_1: state({
        provider: "dodo",
        externalId: "sub_123",
        planName: "pro",
        status: "active",
      }),
    });

    const result = await applyEventToStore(
      {
        eventType: "subscription.active",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: activePayload({
          subscription_id: "sub_123",
          metadata: { planName: "enterprise" },
        }),
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "unresolved" });
    expect(store.writes).toHaveLength(0);
    expect(store.subscriptions.get("user_1")?.planName).toBe("pro");
  });

  it("no degrada a free cuando el plan free no existe en la base", async () => {
    const store = new FakeStore({
      user_1: state({
        provider: "dodo",
        externalId: "sub_123",
        planName: "pro",
        status: "active",
        lastEventAt: new Date("2026-11-21T00:00:00.000Z"),
      }),
    });
    store.plans.delete("free");

    const result = await applyEventToStore(
      {
        eventType: "subscription.expired",
        timestamp: EVENT_AT,
        userId: "user_1",
        payload: { ...activePayload(), type: "subscription.expired" },
      },
      store,
      NOW
    );

    expect(result).toEqual({ outcome: "unresolved" });
    expect(store.writes).toHaveLength(0);
    expect(store.subscriptions.get("user_1")?.planName).toBe("pro");
  });
});

describe("sweepExpired", () => {
  it("degrada sólo las suscripciones vencidas en cancelled/past_due", async () => {
    const store = new FakeStore({
      user_cancelled: state({
        provider: "dodo",
        planName: "pro",
        status: "cancelled",
        currentPeriodEnd: PAST,
      }),
      user_past_due: state({
        provider: "dodo",
        planName: "starter",
        status: "past_due",
        currentPeriodEnd: PAST,
      }),
      user_active: state({
        provider: "dodo",
        planName: "pro",
        status: "active",
        currentPeriodEnd: PAST,
      }),
      user_cancelled_future: state({
        provider: "dodo",
        planName: "pro",
        status: "cancelled",
        currentPeriodEnd: FUTURE,
      }),
    });

    const downgraded = await sweepExpired(store, NOW);

    expect(downgraded).toBe(2);
    expect(store.reconcileCalls).toEqual([NOW]);
    expect(store.subscriptions.get("user_cancelled")?.planName).toBe("free");
    expect(store.subscriptions.get("user_past_due")?.planName).toBe("free");
    expect(store.subscriptions.get("user_active")?.planName).toBe("pro");
    expect(store.subscriptions.get("user_cancelled_future")?.planName).toBe("pro");
  });

  it("no hace nada si no hay plan free que asignar", async () => {
    const store = new FakeStore({
      user_cancelled: state({
        planName: "pro",
        status: "cancelled",
        currentPeriodEnd: PAST,
      }),
    });
    store.plans.delete("free");

    const downgraded = await sweepExpired(store, NOW);

    expect(downgraded).toBe(0);
    expect(store.reconcileCalls).toHaveLength(0);
    expect(store.subscriptions.get("user_cancelled")?.planName).toBe("pro");
  });
});

/** Fila de `BillingWebhookEvent` como la deja el webhook verificado. */
function webhookRow(overrides: Record<string, any> = {}) {
  return {
    id: "evt_1",
    provider: "dodo",
    webhookId: "wh_1",
    eventType: "subscription.active",
    payload: {
      business_id: "bus_1",
      type: "subscription.active",
      timestamp: EVENT_AT,
      data: activeData,
    },
    status: "pending",
    attempts: 1,
    lastError: null,
    leaseUntil: null,
    receivedAt: new Date("2026-11-22T11:59:30.000Z"),
    processedAt: null,
    ...overrides,
  };
}

function lastEventUpdate(): Record<string, any> | undefined {
  return db.eventUpdates[db.eventUpdates.length - 1];
}

function resetDb(): void {
  db.eventUpdates.length = 0;
  db.subscriptionUpserts.length = 0;
  db.userLookups.length = 0;
  db.state.users.clear();
  db.state.users.set("user@example.com", "user_1");
  db.state.subscription = null;
  db.state.row = webhookRow();
}

describe("runEvent: marca de tiempo del evento", () => {
  beforeEach(resetDb);

  it("no sustituye un timestamp ausente por receivedAt: el evento queda ignored", async () => {
    db.state.row = webhookRow({
      payload: { type: "subscription.active", data: activeData },
    });

    await runEvent("evt_1");

    expect(db.subscriptionUpserts).toHaveLength(0);
    expect(lastEventUpdate()?.status).toBe("ignored");
  });

  it("aplica el evento cuando el payload trae su timestamp", async () => {
    await runEvent("evt_1");

    expect(db.subscriptionUpserts).toHaveLength(1);
    expect(db.subscriptionUpserts[0].data.lastEventAt).toEqual(new Date(EVENT_AT));
    expect(lastEventUpdate()?.status).toBe("done");
  });
});

describe("runEvent: resolución del usuario", () => {
  beforeEach(resetDb);

  /** Payload sin `metadata.userId`; el customer es la única pista. */
  function payloadWithCustomer(email: string | null) {
    return {
      type: "subscription.active",
      timestamp: EVENT_AT,
      data: {
        ...activeData,
        metadata: { planName: "pro" },
        customer:
          email === null
            ? { customer_id: "cus_1", name: "User" }
            : { customer_id: "cus_1", email, name: "User" },
      },
    };
  }

  it("usa metadata.userId primero y no consulta el email", async () => {
    await runEvent("evt_1");

    expect(db.userLookups).toHaveLength(0);
    expect(db.subscriptionUpserts[0].userId).toBe("user_1");
  });

  it("resuelve por el email del customer cuando falta metadata.userId", async () => {
    db.state.row = webhookRow({ payload: payloadWithCustomer("user@example.com") });

    await runEvent("evt_1");

    expect(db.userLookups).toEqual(["user@example.com"]);
    expect(db.subscriptionUpserts).toHaveLength(1);
    expect(db.subscriptionUpserts[0].userId).toBe("user_1");
    expect(lastEventUpdate()?.status).toBe("done");
  });

  it("parquea el evento como ignored cuando el email no existe en la base", async () => {
    db.state.row = webhookRow({ payload: payloadWithCustomer("nadie@example.com") });

    await runEvent("evt_1");

    expect(db.subscriptionUpserts).toHaveLength(0);
    expect(lastEventUpdate()?.status).toBe("ignored");
    expect(lastEventUpdate()?.lastError).toBe("missing_user_id");
  });

  it("parquea el evento cuando no hay ni userId ni email", async () => {
    db.state.row = webhookRow({ payload: payloadWithCustomer(null) });

    await runEvent("evt_1");

    expect(db.userLookups).toHaveLength(0);
    expect(db.subscriptionUpserts).toHaveLength(0);
    expect(lastEventUpdate()?.lastError).toBe("missing_user_id");
  });
});
