"use client";
import React from "react";
import Image from "next/image";

interface MercadoPagoCheckoutProps {
  planName: string;
  userId?: string;
  email?: string;
  /** Si se pasa y no hay userId, redirige aquí en lugar de al checkout */
  loginRedirect?: string;
}

export function MercadoPagoCheckout({ planName, userId, email, loginRedirect }: MercadoPagoCheckoutProps) {
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async () => {
    if (!userId) {
      window.location.href = loginRedirect ?? "/login?callbackUrl=/pricing";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName, userId, email }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.error || "Error iniciando checkout con Mercado Pago");
      }
    } catch {
      alert("Error de red al conectar con Mercado Pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-accent text-foreground shadow hover:scale-[1.02] transition-transform text-sm font-medium"
    >
      <Image src="/mercado-pago.svg" alt="Mercado Pago" width={28} height={20} style={{ width: 28, height: 20 }} />
      <span className="font-medium">{loading ? "Redirigiendo..." : "Mercado Pago"}</span>
    </button>
  );
}
