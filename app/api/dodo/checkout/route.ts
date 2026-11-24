import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDodoClient } from "@/lib/billing/dodo/client";
import {
  buildCheckoutMetadata,
  decideCheckoutAccess,
} from "@/lib/billing/dodo/checkout";
import { DodoConfigError, readDodoConfig } from "@/lib/billing/dodo/env";
import { getProductIdForPlan } from "@/lib/billing/dodo/products";
import type { DodoProducts } from "@/lib/billing/dodo/products";
import { requireAuth } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creación de la sesión de checkout de Dodo Payments.
 *
 * El usuario sale de la sesión y el precio de `Plan.price`: el body sólo trae
 * un `planId` que se resuelve contra la DB. Ningún monto ni identidad viaja
 * desde el cliente.
 */

const checkoutBodySchema = z.object({
  planId: z.string().trim().min(1),
});

const LOG_PREFIX = "[dodo checkout]";

/** Base pública del sitio, igual que en el checkout de Mercado Pago. */
function resolveBaseUrl(req: NextRequest): string {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let planId: string;

  try {
    const parsed = checkoutBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    planId = parsed.data.planId;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const session = await requireAuth().catch(() => null);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const email = user.email?.trim() ?? "";
  const name = user.name?.trim() || null;

  // Dodo necesita un email para crear el customer; sin él no hay checkout.
  if (!email) {
    console.error(`${LOG_PREFIX} session without email`, { userId });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let plan;
  let subscription;

  try {
    plan = await prisma.plan.findUnique({ where: { id: planId } });

    subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} database error`, {
      userId,
      planId,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const decision = decideCheckoutAccess(
    { price: plan.price },
    subscription === null
      ? null
      : {
          provider: subscription.provider,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
    new Date()
  );

  if (!decision.allowed) {
    if (decision.reason === "free_plan") {
      return NextResponse.json({ error: "free_plan" }, { status: 400 });
    }

    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  let productId: string | null;
  let products: DodoProducts;

  try {
    ({ products } = readDodoConfig());
  } catch (error) {
    if (error instanceof DodoConfigError) {
      // Nunca se loguea el valor de las variables: sólo las que faltan.
      console.error(`${LOG_PREFIX} Dodo is not configured`, {
        issues: error.issues,
      });
      return NextResponse.json(
        { error: "billing_not_configured" },
        { status: 503 }
      );
    }

    throw error;
  }

  try {
    productId = getProductIdForPlan(plan.name, products);
  } catch (error) {
    // Un plan sin producto de Dodo es un problema de configuración, no del
    // usuario: se responde igual que una config incompleta.
    console.error(`${LOG_PREFIX} no Dodo product for plan`, {
      planId: plan.id,
      planName: plan.name,
      reason: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "billing_not_configured" },
      { status: 503 }
    );
  }

  if (productId === null) {
    // Inalcanzable en la práctica: el plan free ya se rechazó por precio.
    console.error(`${LOG_PREFIX} plan has no purchasable product`, {
      planId: plan.id,
      planName: plan.name,
    });
    return NextResponse.json({ error: "free_plan" }, { status: 400 });
  }

  const baseUrl = resolveBaseUrl(req);
  const metadata = buildCheckoutMetadata({
    userId,
    planId: plan.id,
    planName: plan.name,
  });

  try {
    const checkout = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      metadata,
      return_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
    });

    if (!checkout.checkout_url) {
      console.error(`${LOG_PREFIX} Dodo returned no checkout_url`, {
        sessionId: checkout.session_id,
        planId: plan.id,
      });
      return NextResponse.json(
        { error: "checkout_unavailable" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: checkout.checkout_url }, { status: 200 });
  } catch (error) {
    // El cuerpo del error del proveedor se queda del lado del servidor.
    console.error(`${LOG_PREFIX} Dodo checkout session failed`, {
      planId: plan.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
