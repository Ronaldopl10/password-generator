// Define Mercado Pago webhook body type for preapproval
type MercadoPagoPreapprovalBody = {
  status: string;
  external_reference: string;
  reason?: string;
};
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";



export async function POST(req: NextRequest) {
  // Mercado Pago envía los datos en query params y body
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");
  // const id = url.searchParams.get("id") || url.searchParams.get("data.id");

  // Opcional: validar la firma del webhook si usas clave secreta
  // const signature = req.headers.get("x-signature");
  // if (MP_WEBHOOK_SECRET && signature !== MP_WEBHOOK_SECRET) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  // }

  // Lee el body (puede ser JSON o x-www-form-urlencoded)
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Puede venir vacío
  }

  // Ejemplo: manejar evento de suscripción aprobada
  if (
    topic === "preapproval" &&
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    (body as MercadoPagoPreapprovalBody).status === "authorized"
  ) {
    const preapproval = body as MercadoPagoPreapprovalBody;
    const userId = preapproval.external_reference;
    const planName = preapproval.reason?.toLowerCase();
    if (userId && planName) {
      const plan = await prisma.plan.findFirst({ where: { name: planName } });
      if (plan) {
        await prisma.subscription.update({
          where: { userId },
          data: { planId: plan.id, status: "active" },
        });
      }
    }
  }

  // Puedes manejar otros eventos aquí (payment, cancellation, etc.)

  return NextResponse.json({ ok: true });
}
