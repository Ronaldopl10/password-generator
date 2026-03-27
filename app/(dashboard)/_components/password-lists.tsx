"use client";

import { useQuery } from "@tanstack/react-query";
import { GetPasswordAction } from "../_actions/get-password.action";
import { GetSubscriptionAction } from "../_actions/get-subscription.action";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import PasswordOptionsTags from "./password-options-tags";
import PasswordDeleteDialog from "./password-delete-dialog";
import Link from "next/link";

type Plan = {
  name: string;
  displayName: string;
  maxPasswords: number;
  price: number;
};

type SubscriptionData = {
  plan: Plan;
  currentCount: number;
} | null;

const PlanUsageBar = ({ subscription }: { subscription: SubscriptionData }) => {
  if (!subscription) return null;

  const { plan, currentCount } = subscription;
  const isUnlimited = plan.maxPasswords === -1;
  const isAtLimit = !isUnlimited && currentCount >= plan.maxPasswords;
  const pct = isUnlimited ? 0 : Math.min((currentCount / plan.maxPasswords) * 100, 100);

  return (
    <div className="space-y-2 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          Plan{" "}
          <span className="text-primary font-bold">{plan.displayName}</span>
        </span>
        <span className="text-muted-foreground">
          {isUnlimited ? (
            <span className="text-primary font-medium">Ilimitadas ✓</span>
          ) : (
            <span className={isAtLimit ? "text-destructive font-bold" : ""}>
              {currentCount} / {plan.maxPasswords} contraseñas
            </span>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtLimit ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isAtLimit && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-destructive">
            Límite alcanzado. Actualiza tu plan para guardar más contraseñas.
          </p>
          <Button size="sm" variant="default" asChild className="shrink-0 ml-3 h-7 text-xs">
            <Link href="/pricing">
              <TrendingUp className="size-3 mr-1" />
              Mejorar plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

const PasswordLists = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: GetSubscriptionAction,
    enabled: isAuthenticated,
  });

  const { data, error, isPending } = useQuery({
    queryKey: ["password", isAuthenticated],
    queryFn: GetPasswordAction,
    enabled: isAuthenticated,
  });

  const handleCopyPassword = (pasword: string) => {
    navigator.clipboard.writeText(pasword).then(() => {
      toast.success("contraseña copiada en el portapapeles");
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Mis contraseñas guardadas</h2>
        <p className="text-muted-foreground text-sm">
          <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link>
          {" "}para ver y gestionar tus contraseñas guardadas.
        </p>
      </div>
    );
  }

  if (isPending) {
    return <p className="text-center text-muted-foreground">Cargando Contraseñas...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-destructive">
        Ocurrió un error: {error.message}
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <section className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground">
          Mis contraseñas guardadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Tus contraseñas están protegidas. Puedes copiarlas cuando lo necesites
        </p>
      </section>

      <PlanUsageBar subscription={subscription ?? null} />

      <section className="space-y-4">
        {data.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex justify-between items-center gap-4">
              <section>
                <p className="font-bold text-foreground">Título: {item.title}</p>
                <p className="text-sm text-muted-foreground my-2">
                  Longitud contraseña:{" "}
                  <span className="font-bold text-foreground"> {item.length}</span>
                </p>
                <PasswordOptionsTags passwordConfig={item} />
              </section>
              <section className="flex flex-col space-y-2">
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    handleCopyPassword(item.decryptedPassword);
                  }}
                >
                  <CopyIcon />
                  Copiar
                </Button>
                {/* Dialog Eliminar */}
                <PasswordDeleteDialog id={item.id} />
              </section>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
};
export default PasswordLists;

