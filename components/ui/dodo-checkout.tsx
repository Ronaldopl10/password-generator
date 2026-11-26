"use client";
import React from "react";
import Image from "next/image";
import { toast } from "sonner";

interface DodoCheckoutProps {
  /** `Plan.id` de la DB: el precio se resuelve en el servidor. */
  planId: string;
}

type CheckoutResponse = {
  url?: string;
  error?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  already_subscribed: "You already have an active subscription.",
  free_plan: "This plan is free, no checkout needed.",
  billing_not_configured: "Card payments are not available yet. Please try again later.",
  checkout_unavailable: "We could not start the checkout. Please try again.",
  checkout_failed: "We could not start the checkout. Please try again.",
  plan_not_found: "This plan is no longer available.",
  unauthorized: "Please sign in to continue.",
};

const FALLBACK_ERROR = "We could not start the checkout. Please try again.";

export function DodoCheckout({ planId }: DodoCheckoutProps) {
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data: CheckoutResponse | null = await res.json().catch(() => null);

      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }

      toast.error(ERROR_MESSAGES[data?.error ?? ""] ?? FALLBACK_ERROR);
    } catch {
      toast.error("Network error while contacting Dodo Payments.");
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-accent text-foreground shadow hover:scale-[1.02] transition-transform text-sm font-medium"
    >
      <Image src="/dodo-payments.svg" alt="Dodo Payments" width={28} height={20} style={{ width: 28, height: 20 }} />
      <span className="font-medium">{loading ? "Redirecting..." : "Dodo Payments"}</span>
    </button>
  );
}
