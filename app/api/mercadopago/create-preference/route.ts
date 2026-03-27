import { NextRequest, NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  if (!MP_ACCESS_TOKEN) {
    return NextResponse.json({ error: "No access token" }, { status: 500 });
  }

  const body = await req.json();
  // Espera: { planName: string, userId: string, email: string }
  const { planName, userId, email } = body;

  // Precios en COP equivalentes a USD (1 USD ≈ 4,200 COP — ajusta si cambia el tipo de cambio)
  const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
    starter: { amount: 12600, label: "PassGen Starter - $2.99 USD/mes" },  // $2.99 USD
    pro:     { amount: 41960, label: "PassGen Pro+ - $9.99 USD/mes" },      // $9.99 USD
  };

  const planData = PLAN_PRICES[planName];
  if (!planData) {
    return NextResponse.json({ error: `Plan '${planName}' no válido` }, { status: 400 });
  }

  // MP_BACK_URL debe ser una URL HTTPS pública válida (requerida por MP)
  // En local usa cualquier URL HTTPS válida como placeholder
  const backUrl =
    process.env.MP_BACK_URL ||
    (() => {
      const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      return base.startsWith("https://") ? `${base}/dashboard` : undefined;
    })();

  if (!backUrl) {
    return NextResponse.json(
      { error: "MP_BACK_URL no configurada. Agrega una URL HTTPS válida en las variables de entorno." },
      { status: 500 }
    );
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // empieza mañana

  const preference = {
    reason: planData.label,
    external_reference: userId,
    payer_email: email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planData.amount,
      currency_id: "COP",
      start_date: startDate.toISOString(),
    },
    back_url: backUrl,
  };

  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(preference),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[MP preapproval error]", JSON.stringify(data));
    return NextResponse.json(
      { error: data.message || data.error || "Error creando preferencia de pago" },
      { status: 500 }
    );
  }

  // En sandbox MP retorna sandbox_init_point; en producción retorna init_point
  const initPoint = data.sandbox_init_point || data.init_point;
  if (!initPoint) {
    console.error("[MP] Respuesta sin init_point:", JSON.stringify(data));
    return NextResponse.json({ error: "No se obtuvo URL de pago" }, { status: 500 });
  }

  return NextResponse.json({ init_point: initPoint });
}
