import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { MercadoPagoCheckout } from "@/components/ui/mercadopago-checkout";
import { LemonSqueezyCheckout } from "@/components/ui/lemonsqueezy-checkout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/theme-toggle";
import AuthHeader from "../(dashboard)/_components/auth-header";

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Hasta 5 contraseñas guardadas",
    "Generador de contraseñas ilimitado",
    "Cifrado AES de extremo a extremo",
    "Copia al portapapeles",
  ],
  starter: [
    "Hasta 15 contraseñas guardadas",
    "Generador de contraseñas ilimitado",
    "Cifrado AES de extremo a extremo",
    "Copia al portapapeles",
    "Soporte por email",
  ],
  pro: [
    "Contraseñas ilimitadas",
    "Generador de contraseñas ilimitado",
    "Cifrado AES de extremo a extremo",
    "Copia al portapapeles",
    "Soporte prioritario",
    "Acceso anticipado a nuevas features",
  ],
};

export default async function PricingPage() {
  const [session, plans] = await Promise.all([
    auth(),
    prisma.plan.findMany({ orderBy: { price: "asc" } }),
  ]);

  const userSubscription = session?.user?.id
    ? await prisma.subscription.findUnique({
        where: { userId: session.user.id as string },
        include: { plan: true },
      })
    : null;

  const currentPlanName = userSubscription?.plan.name ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <header className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="text-xl font-bold text-foreground hover:text-primary transition-colors"
          >
            PassGen
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthHeader />
          </div>
        </header>

        <main className="py-12 space-y-10">
          <section className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground">
              Planes y Precios
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Elige el plan que mejor se adapte a tus necesidades. Empieza
              gratis y escala cuando lo necesites.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const features = PLAN_FEATURES[plan.name] ?? [];
              const isCurrentPlan = currentPlanName === plan.name;
              const isPro = plan.name === "pro";

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col relative ${isPro ? "border-primary shadow-lg" : ""}`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                        Más popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-4 space-y-1">
                    <h2 className="text-xl font-bold text-foreground">
                      {plan.displayName}
                    </h2>
                    <div className="flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold text-foreground">
                          Gratis
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-foreground">
                            ${plan.price}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            /mes
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.maxPasswords === -1
                        ? "Contraseñas ilimitadas"
                        : `Hasta ${plan.maxPasswords} contraseñas`}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    <ul className="space-y-2">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckIcon className="size-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    {isCurrentPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Plan actual ✓
                      </Button>
                    ) : plan.price === 0 ? (
                      !session?.user ? (
                        <Button className="w-full" asChild variant="outline">
                          <Link href="/register">Comenzar gratis</Link>
                        </Button>
                      ) : null
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <MercadoPagoCheckout
                          planName={plan.name}
                          userId={session?.user?.id ?? undefined}
                          email={session?.user?.email ?? undefined}
                          loginRedirect="/login?callbackUrl=/pricing"
                        />
                        <LemonSqueezyCheckout
                          variantId={
                            plan.name === "starter"
                              ? (process.env.LS_STARTER_VARIANT_ID ?? "")
                              : (process.env.LS_PRO_VARIANT_ID ?? "")
                          }
                          email={session?.user?.email ?? undefined}
                          userId={session?.user?.id ?? undefined}
                          loginRedirect="/login?callbackUrl=/pricing"
                        />
                      </div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </section>

          <section className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Paga con Mercado Pago (Colombia) o Lemon Squeezy (tarjeta
              internacional).
            </p>
            <p>
              <Link href="/" className="text-primary hover:underline">
                ← Volver al generador
              </Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
