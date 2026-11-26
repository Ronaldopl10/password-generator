import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { drainQueue } from "@/lib/billing/dodo/drain";
import { prismaDrainStore, runEvent } from "@/lib/billing/dodo/provision-prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Drenaje de la cola de webhooks de Dodo Payments (S6).
 *
 * El webhook persiste el evento y lo intenta una vez con `after()`; si esa
 * corrida muere, la fila queda `pending`/`processing`. Lo que la recupera es
 * esto, disparado desde afuera de Vercel porque el cron de Hobby corre como
 * mucho una vez por día.
 *
 * Sin secreto configurado no se ejecuta nada: 503, nunca modo abierto.
 * POST es el único método expuesto; el resto lo rechaza Next con 405.
 */

const LOG_PREFIX = "[billing drain]";

/** Compara dos strings en tiempo constante, sin filtrar el largo. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();

  return timingSafeEqual(a, b);
}

/** `Authorization: Bearer <secreto>` → el secreto, o `null` si no está. */
function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");

  if (!header) {
    return null;
  }

  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());

  return match === null ? null : match[1].trim();
}

export async function POST(req: NextRequest) {
  const secret = (process.env.BILLING_CRON_SECRET ?? "").trim();

  if (!secret) {
    // Sin secreto no hay forma de autenticar: se apaga, no se abre.
    console.error(`${LOG_PREFIX} BILLING_CRON_SECRET is not set`);
    return NextResponse.json(
      { error: "billing_not_configured" },
      { status: 503 }
    );
  }

  const token = bearerToken(req);

  if (token === null || !secretMatches(token, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await drainQueue(prismaDrainStore, runEvent, new Date());

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // El detalle queda en el server; el cliente sólo recibe el código.
    console.error(`${LOG_PREFIX} drain failed`, {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "drain_failed" }, { status: 500 });
  }
}
