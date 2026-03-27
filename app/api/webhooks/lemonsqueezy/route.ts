import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-lsz-event");
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {}

  // Ejemplo: manejar suscripción pagada
  if (
    event === "order_created" &&
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof (body as any).data === "object" &&
    (body as any).data !== null
  ) {
    const data = (body as any).data;
    const email = data.attributes?.user_email;
    const planName = data.attributes?.order_items?.[0]?.product_name?.toLowerCase();
    // Busca el usuario por email y actualiza su plan
    if (email && planName) {
      const user = await prisma.user.findUnique({ where: { email } });
      const plan = await prisma.plan.findFirst({ where: { name: planName } });
      if (user && plan) {
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { planId: plan.id, status: "active" },
        });
      }
    }
  }

  // Puedes manejar otros eventos aquí (subscription_cancelled, etc)

  return NextResponse.json({ ok: true });
}
