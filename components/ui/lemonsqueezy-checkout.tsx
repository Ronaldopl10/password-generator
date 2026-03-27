"use client";
import React from "react";
import Image from "next/image";

interface LemonSqueezyCheckoutProps {
  variantId: string;
  email?: string;
  userId?: string;
  /** Si se pasa y no hay userId, redirige aquí en lugar de al checkout */
  loginRedirect?: string;
}

export function LemonSqueezyCheckout({ variantId, email, userId, loginRedirect }: LemonSqueezyCheckoutProps) {
  const [loading, setLoading] = React.useState(false);

  const handleCheckout = () => {
    if (!userId) {
      window.location.href = loginRedirect ?? "/login?callbackUrl=/pricing";
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (email) params.set("checkout[email]", email);
    if (userId) params.set("checkout[custom][user_id]", userId);
    const url = `https://passgen.lemonsqueezy.com/buy/${variantId}?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-accent text-foreground shadow hover:scale-[1.02] transition-transform text-sm font-medium"
    >
      <Image src="/lemonsqueezy.svg" alt="Lemon Squeezy" width={22} height={22} style={{ width: 22, height: 22 }} />
      <span className="font-medium">{loading ? "Redirigiendo..." : "Lemon Squeezy"}</span>
    </button>
  );
}
