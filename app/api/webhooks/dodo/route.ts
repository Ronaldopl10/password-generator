import { after, NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma";
import { getDodoClient } from "@/lib/billing/dodo/client";
import { DodoConfigError } from "@/lib/billing/dodo/env";
import { runEvent } from "@/lib/billing/dodo/provision-prisma";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Dodo Payments.
 *
 * El orden no se negocia (S5): cuerpo crudo → firma → persistencia → 200. Nunca
 * se parsea ni se procesa un cuerpo sin verificar, nunca se responde 2xx antes
 * de persistir el evento y nunca se devuelve el cuerpo, el secreto ni la firma.
 * El trabajo pesado corre después de responder, con `after()`; si falla, queda
 * la fila de la cola y la recupera el drenaje protegido.
 */

const LOG_PREFIX = "[dodo webhook]";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function POST(req: NextRequest) {
  // Bytes exactos: `req.text()` conserva el cuerpo tal como lo firmó Dodo.
  const raw = await req.text();

  const webhookId = req.headers.get("webhook-id") ?? "";
  const webhookSignature = req.headers.get("webhook-signature") ?? "";
  const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    // Faltar un header de firma es un 401, no un 500.
    console.warn(`${LOG_PREFIX} missing signature headers`);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let client: ReturnType<typeof getDodoClient>;

  try {
    client = getDodoClient();
  } catch (error) {
    if (error instanceof DodoConfigError) {
      // Nunca se loguean valores de variables: sólo las que faltan.
      console.error(`${LOG_PREFIX} Dodo is not configured`, {
        issues: error.issues,
      });
      return NextResponse.json(
        { error: "billing_not_configured" },
        { status: 503 }
      );
    }

    console.error(`${LOG_PREFIX} could not create Dodo client`, {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "webhook_error" }, { status: 500 });
  }

  let event: unknown;

  try {
    // Verifica la firma standard-webhooks (HMAC-SHA256, ventana de 5 minutos).
    // Si falla, tira y el body no se toca ni se loguea.
    event = client.webhooks.unwrap(raw, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": webhookSignature,
        "webhook-timestamp": webhookTimestamp,
      },
    });
  } catch (error) {
    console.warn(`${LOG_PREFIX} invalid signature`, {
      webhookId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const payload = event as { type?: unknown } | null;
  const eventType =
    typeof payload?.type === "string" && payload.type.trim()
      ? payload.type.trim()
      : "unknown";

  let eventId: string;

  try {
    const created = await prisma.billingWebhookEvent.create({
      data: {
        provider: "dodo",
        webhookId,
        eventType,
        payload: event as Prisma.InputJsonValue,
      },
    });

    eventId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      // `webhook-id` es la clave de idempotencia de Dodo.
      return NextResponse.json(
        { received: true, duplicate: true },
        { status: 200 }
      );
    }

    console.error(`${LOG_PREFIX} could not persist event`, {
      webhookId,
      eventType,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "webhook_storage_failed" }, { status: 500 });
  }

  // Best-effort después de responder: si falla, la fila queda pendiente para el
  // drenaje. Nada de esto puede subir como rechazo de la respuesta.
  after(async () => {
    try {
      await runEvent(eventId);
    } catch (error) {
      console.error(`${LOG_PREFIX} deferred provisioning failed`, {
        eventId,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
