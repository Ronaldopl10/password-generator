/**
 * Adaptador prisma de la provisión de licencias de Dodo Payments.
 *
 * Es el único archivo del módulo que importa prisma: el reducer y la
 * orquestación (`events.ts`, `provision.ts`) son puros y se testean sin base de
 * datos. Acá vive también el drenaje de una fila de `BillingWebhookEvent`:
 * lease atómico, aplicación y estado final, sin re-lanzar errores.
 */

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

import type { DrainStore } from "./drain";
import { readDodoConfig } from "./env";
import { FREE_PLAN_NAME, type CurrentState } from "./events";
import {
  applyEventToStore,
  sweepExpired as sweepExpiredSubscriptions,
  type SubscriptionStore,
  type SubscriptionWrite,
} from "./provision";

/** Cuánto dura el lease de una fila antes de que otro proceso la tome. */
const LEASE_MS = 2 * 60 * 1000;
/** Intentos después de los cuales la fila queda `dead` esperando revisión. */
const MAX_ATTEMPTS = 5;
const MAX_ERROR_LENGTH = 500;

/**
 * Espera antes del próximo intento, por número de intento ya consumado:
 * 60 s, 5 min, 15 min, 60 min y 6 h. El intento 5 no reintenta (la fila queda
 * `dead`), pero igual se le escribe el lease de 6 h: deja registrado cuándo se
 * dio por muerta, y la tabla de backoff queda completa.
 *
 * El reloj es la columna `leaseUntil`, que ya existe: un `failed` con lease en
 * el futuro no se reclama, y uno vencido vuelve a entrar a la cola.
 */
const RETRY_BACKOFF_MS: readonly number[] = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

function retryDelayMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), RETRY_BACKOFF_MS.length) - 1;

  return RETRY_BACKOFF_MS[index];
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.length > MAX_ERROR_LENGTH
    ? message.slice(0, MAX_ERROR_LENGTH)
    : message;
}

async function findPlanIdByName(name: string): Promise<string | null> {
  const plan = await prisma.plan.findUnique({
    where: { name },
    select: { id: true },
  });

  return plan?.id ?? null;
}

/**
 * Store real sobre prisma. `reconcileExpired` degrada al plan free las
 * suscripciones vencidas que quedaron en `cancelled`/`past_due` y las marca
 * `expired`, para que un drenaje nuevo no las vuelva a tocar.
 */
export const prismaSubscriptionStore: SubscriptionStore = {
  async findSubscription(userId: string): Promise<CurrentState | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { name: true } } },
    });

    if (subscription === null) {
      return null;
    }

    return {
      provider: subscription.provider,
      externalId: subscription.externalId,
      planName: subscription.plan?.name ?? null,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      lastEventAt: subscription.lastEventAt,
    };
  },

  planIdByName(name: string): Promise<string | null> {
    return findPlanIdByName(name);
  },

  freePlanId(): Promise<string | null> {
    return findPlanIdByName(FREE_PLAN_NAME);
  },

  async upsertFromWebhook(
    userId: string,
    data: SubscriptionWrite
  ): Promise<void> {
    // El nombre del plan es del reducer; la única fuente de verdad del plan en
    // la DB es `planId`.
    const { planName: _planName, ...fields } = data;

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...fields },
      update: fields,
    });
  },

  async reconcileExpired(now: Date): Promise<number> {
    const freePlanId = await findPlanIdByName(FREE_PLAN_NAME);

    if (freePlanId === null) {
      return 0;
    }

    const result = await prisma.subscription.updateMany({
      where: {
        status: { in: ["cancelled", "past_due"] },
        currentPeriodEnd: { lt: now },
      },
      data: { planId: freePlanId, status: "expired" },
    });

    return result.count;
  },
};

/** Productos de Dodo configurados; sin config no hay mapa y no se rompe. */
function readProducts(): Record<string, string> {
  try {
    return readDodoConfig().products;
  } catch {
    return {};
  }
}

/**
 * Condición de "reclamable" a un instante dado, compartida por el lease del
 * `runEvent` y por el listado del drenaje:
 *
 * - `pending` / `failed` sin lease o con el lease vencido (una fila que sólo
 *   espera su backoff no se reclama), y
 * - `processing` con el lease vencido: el proceso que la tenía murió.
 */
function claimableWhere(now: Date): Prisma.BillingWebhookEventWhereInput {
  return {
    OR: [
      {
        status: { in: ["pending", "failed"] },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      { status: "processing", leaseUntil: { lte: now } },
    ],
  };
}

/**
 * Usuario al que pertenece el evento.
 *
 * Primero `data.metadata.userId`, que es lo que escribe nuestro checkout. Un
 * pago puede llegar sin esa metadata (una suscripción creada a mano en el panel
 * de Dodo, por ejemplo), así que el fallback es el email del customer contra
 * `User.email`, que es `@unique`. Sin usuario no se provisiona: el evento se
 * parquea como `ignored`.
 */
async function resolveUserId(
  data: Record<string, unknown> | null
): Promise<string | null> {
  const metadata = asObject(data?.metadata);
  const fromMetadata = asString(metadata?.userId);

  if (fromMetadata !== null) {
    return fromMetadata;
  }

  const customer = asObject(data?.customer);
  const email = asString(customer?.email);

  if (email === null) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

/**
 * Drena una fila de la cola de webhooks.
 *
 * 1. Toma el lease de forma atómica; si otro proceso ya la tomó, no hace nada.
 * 2. Aplica el evento con la orquestación pura.
 * 3. Deja la fila en `done`/`ignored`, o en `failed`/`dead` con el error
 *    truncado y, si queda reintento, el lease corriendo al final del backoff.
 *    Nunca re-lanza después de persistir el resultado.
 */
export async function runEvent(eventId: string): Promise<void> {
  const now = new Date();

  const leased = await prisma.billingWebhookEvent.updateMany({
    where: { id: eventId, ...claimableWhere(now) },
    data: {
      status: "processing",
      attempts: { increment: 1 },
      leaseUntil: new Date(now.getTime() + LEASE_MS),
    },
  });

  if (leased.count === 0) {
    // Otro proceso (o un drenaje anterior) es dueño de la fila.
    return;
  }

  const row = await prisma.billingWebhookEvent.findUnique({
    where: { id: eventId },
  });

  if (row === null) {
    return;
  }

  const payload = asObject(row.payload);
  const data = asObject(payload?.data);
  const userId = await resolveUserId(data);

  if (userId === null) {
    // Sin usuario no hay a quién provisionar: se cierra la fila para que no
    // vuelva a la cola indefinidamente.
    await markIgnored(eventId, "missing_user_id");
    return;
  }

  // La marca de tiempo sale del payload o no existe. Nunca se sustituye por
  // `receivedAt`: un evento sin marca de tiempo verificable lo descarta el
  // reducer (`ignored`), no la cola.
  const payloadTimestamp = payload?.timestamp;
  const eventTimestamp =
    typeof payloadTimestamp === "string" || payloadTimestamp instanceof Date
      ? payloadTimestamp
      : undefined;

  try {
    const result = await applyEventToStore(
      {
        eventType: row.eventType || asString(payload?.type) || "",
        // `EventInput.timestamp` no admite `undefined` en su tipo; el valor se
        // pasa igual y el reducer lo resuelve a `null`.
        timestamp: eventTimestamp as string | Date,
        userId,
        payload: {
          type: asString(payload?.type) ?? row.eventType,
          timestamp: payload?.timestamp as string | undefined,
          data,
        },
      },
      prismaSubscriptionStore,
      new Date(),
      { products: readProducts() }
    );

    await prisma.billingWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: result.outcome === "applied" ? "done" : "ignored",
        processedAt: new Date(),
        leaseUntil: null,
        lastError: null,
      },
    });
  } catch (error) {
    // El error se guarda en la fila: hacia arriba no se re-lanza.
    const exhausted = row.attempts >= MAX_ATTEMPTS;
    const status = exhausted ? "dead" : "failed";
    // El reintento lo habilita el fin del lease: `failed` con lease futuro no
    // se reclama hasta que el backoff vence. En `dead` no hay reintento igual.
    const retryAt = new Date(Date.now() + retryDelayMs(row.attempts));

    try {
      await prisma.billingWebhookEvent.update({
        where: { id: eventId },
        data: { status, lastError: truncateError(error), leaseUntil: retryAt },
      });
    } catch (persistError) {
      console.error("[dodo webhook] could not persist failure", {
        eventId,
        attempts: row.attempts,
        status,
        reason: truncateError(persistError),
      });
    }

    console.error("[dodo webhook] provisioning failed", {
      eventId,
      attempts: row.attempts,
      status,
      retryAt: retryAt.toISOString(),
      reason: truncateError(error),
    });
  }
}

async function markIgnored(eventId: string, reason: string): Promise<void> {
  try {
    await prisma.billingWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: "ignored",
        processedAt: new Date(),
        leaseUntil: null,
        lastError: reason,
      },
    });
  } catch (error) {
    console.error("[dodo webhook] could not mark event as ignored", {
      eventId,
      reason: truncateError(error),
    });
  }
}

/**
 * Adaptador prisma del drenaje: qué filas se pueden reclamar ahora y el barrido
 * de suscripciones vencidas.
 */
export const prismaDrainStore: DrainStore = {
  async claimableEventIds(limit: number, now: Date): Promise<string[]> {
    if (limit <= 0) {
      return [];
    }

    // Primero lo más viejo: la cola es FIFO y un reintento no se cuela delante
    // de un evento que nunca se procesó.
    const rows = await prisma.billingWebhookEvent.findMany({
      where: claimableWhere(now),
      orderBy: { receivedAt: "asc" },
      take: limit,
      select: { id: true },
    });

    return rows.map((row) => row.id);
  },

  sweepExpired(now: Date): Promise<number> {
    return sweepExpiredSubscriptions(prismaSubscriptionStore, now);
  },
};
