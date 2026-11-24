/**
 * Drenaje de la cola de webhooks de Dodo Payments.
 *
 * Puro: no importa prisma, no lee `process.env` y no hace red. El store y el
 * runner los inyecta el llamador (`provision-prisma.ts` sobre prisma en
 * runtime, un fake en los tests).
 *
 * Los eventos se procesan de a uno, en serie: el pooler es el mismo que atiende
 * el tráfico de producción. Si un evento falla se cuenta y se sigue con el
 * siguiente; sólo un error del propio store (leer la cola o barrer) sube, y la
 * ruta lo convierte en 500.
 */

/** Cuántos eventos procesa una corrida si el llamador no dice otra cosa. */
export const DEFAULT_DRAIN_LIMIT = 20;

/**
 * Lo que el drenaje necesita de la persistencia. Las dos operaciones las
 * implementa el adaptador de prisma.
 */
export interface DrainStore {
  /**
   * Ids reclamables en este momento, del más viejo al más nuevo, como máximo
   * `limit`. Reclamable = lease libre o vencido (ver `provision-prisma.ts`).
   */
  claimableEventIds(limit: number, now: Date): Promise<string[]>;
  /** Degrada lo vencido; devuelve cuántas suscripciones cambió. */
  sweepExpired(now: Date): Promise<number>;
}

/** Procesa un evento. No debe lanzar por un fallo de negocio. */
export type RunEvent = (eventId: string) => Promise<void>;

export interface DrainOptions {
  limit?: number;
}

export interface DrainResult {
  /** Eventos que el runner terminó sin lanzar. */
  processed: number;
  /** Eventos que lanzaron; la fila decide su reintento por su cuenta. */
  failed: number;
  /** Suscripciones vencidas degradadas por el barrido. */
  swept: number;
}

/**
 * Vacía hasta `limit` eventos reclamables y después barre lo vencido una vez.
 *
 * El recorte a `limit` se hace acá también, no sólo en el store: la garantía de
 * "nunca más de N por corrida" no depende de que el adaptador se porte bien.
 */
export async function drainQueue(
  store: DrainStore,
  runEvent: RunEvent,
  now: Date,
  options: DrainOptions = {}
): Promise<DrainResult> {
  const limit = options.limit ?? DEFAULT_DRAIN_LIMIT;

  const ids = (await store.claimableEventIds(limit, now)).slice(
    0,
    Math.max(0, limit)
  );

  let processed = 0;
  let failed = 0;

  for (const eventId of ids) {
    try {
      await runEvent(eventId);
      processed += 1;
    } catch (error) {
      // `runEvent` no debería lanzar (persiste el error en la fila), así que
      // esto es un fallo inesperado: se cuenta, se loguea y se sigue.
      failed += 1;
      console.error("[billing drain] event failed", {
        eventId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const swept = await store.sweepExpired(now);

  return { processed, failed, swept };
}
