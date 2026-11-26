import { describe, expect, it } from "vitest";

import { drainQueue } from "@/lib/billing/dodo/drain";
import type { DrainStore } from "@/lib/billing/dodo/drain";

const NOW = new Date("2026-11-22T12:00:00.000Z");

/**
 * Cola en memoria: nunca toca una base de datos. `greedy` ignora el `limit`
 * del store a propósito, para probar que el drenaje igual no procesa de más.
 */
class FakeQueue implements DrainStore {
  readonly ids: string[];
  readonly greedy: boolean;
  readonly claims: Array<{ limit: number; now: Date }> = [];
  readonly sweeps: Date[] = [];
  /** Orden de las operaciones: `event:<id>` y `sweep`. */
  readonly calls: string[] = [];
  swept = 0;

  constructor(ids: string[], greedy = false) {
    this.ids = ids;
    this.greedy = greedy;
  }

  async claimableEventIds(limit: number, now: Date): Promise<string[]> {
    this.claims.push({ limit, now });

    return this.greedy ? [...this.ids] : this.ids.slice(0, limit);
  }

  async sweepExpired(now: Date): Promise<number> {
    this.sweeps.push(now);
    this.calls.push("sweep");

    return this.swept;
  }
}

function runner(
  calls: string[],
  failing: string[] = []
): (eventId: string) => Promise<void> {
  return async (eventId: string) => {
    calls.push(`event:${eventId}`);

    if (failing.includes(eventId)) {
      throw new Error(`boom:${eventId}`);
    }
  };
}

describe("drainQueue", () => {
  it("procesa todo lo reclamable y devuelve los conteos", async () => {
    const store = new FakeQueue(["evt_1", "evt_2", "evt_3"]);
    store.swept = 2;
    const calls: string[] = [];

    const result = await drainQueue(store, runner(calls), NOW);

    expect(result).toEqual({ processed: 3, failed: 0, swept: 2 });
    expect(calls).toEqual(["event:evt_1", "event:evt_2", "event:evt_3"]);
    expect(store.claims).toEqual([{ limit: 20, now: NOW }]);
    expect(store.calls).toEqual(["sweep"]);
  });

  it("nunca procesa más eventos que el límite, ni con un store que devuelve de más", async () => {
    const store = new FakeQueue(["evt_1", "evt_2", "evt_3"], true);
    const calls: string[] = [];

    const result = await drainQueue(store, runner(calls), NOW, { limit: 2 });

    expect(result).toEqual({ processed: 2, failed: 0, swept: 0 });
    expect(calls).toEqual(["event:evt_1", "event:evt_2"]);
    expect(store.claims).toEqual([{ limit: 2, now: NOW }]);
  });

  it("corta en el límite por defecto cuando la cola es más grande", async () => {
    const ids = Array.from({ length: 25 }, (_, index) => `evt_${index + 1}`);
    const store = new FakeQueue(ids, true);
    const calls: string[] = [];

    const result = await drainQueue(store, runner(calls), NOW);

    expect(result.processed).toBe(20);
    expect(calls).toHaveLength(20);
    expect(calls[19]).toBe("event:evt_20");
  });

  it("un evento que falla no corta el drenaje y se cuenta aparte", async () => {
    const store = new FakeQueue(["evt_1", "evt_2", "evt_3"]);
    const calls: string[] = [];

    const result = await drainQueue(store, runner(calls, ["evt_2"]), NOW);

    expect(result).toEqual({ processed: 2, failed: 1, swept: 0 });
    expect(calls).toEqual(["event:evt_1", "event:evt_2", "event:evt_3"]);
    expect(store.claims).toHaveLength(1);
  });

  it("procesa en serie: cada evento termina antes de empezar el siguiente", async () => {
    const store = new FakeQueue(["evt_1", "evt_2"]);
    const order: string[] = [];

    await drainQueue(
      store,
      async (eventId) => {
        order.push(`start:${eventId}`);
        await Promise.resolve();
        order.push(`end:${eventId}`);
      },
      NOW
    );

    expect(order).toEqual(["start:evt_1", "end:evt_1", "start:evt_2", "end:evt_2"]);
  });

  it("corre el barrido una sola vez, después de los eventos", async () => {
    const store = new FakeQueue(["evt_1", "evt_2"]);

    // Los eventos se anotan en la misma lista que el barrido para ver el orden real.
    await drainQueue(
      store,
      async (eventId) => {
        store.calls.push(`event:${eventId}`);
      },
      NOW
    );

    expect(store.calls).toEqual(["event:evt_1", "event:evt_2", "sweep"]);
    expect(store.sweeps).toEqual([NOW]);
  });

  it("con la cola vacía devuelve ceros y barre igual", async () => {
    const store = new FakeQueue([]);
    const calls: string[] = [];

    const result = await drainQueue(store, runner(calls), NOW);

    expect(result).toEqual({ processed: 0, failed: 0, swept: 0 });
    expect(calls).toEqual([]);
    expect(store.sweeps).toEqual([NOW]);
  });
});
