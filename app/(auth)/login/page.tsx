"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/schema/auth.schema";
import { loginAction } from "../_actions/login.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      toast.success("Cuenta creada. Inicia sesión.");
    }
  }, [searchParams]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setIsLoading(true);
    const result = await loginAction(values, callbackUrl);
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    }
    // On success, loginAction throws a redirect — no code runs after
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md mb-4">
        <Button variant="ghost" asChild className="pl-0">
          <Link href="/">← Volver</Link>
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Accede a tus contraseñas guardadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showPassword ? "text" : "password"} className="pr-10" placeholder="••••••••" {...field} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Iniciar sesión"}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            ¿No tienes cuenta?{" "}
            <Link
              href={callbackUrl !== "/" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
              className="text-primary hover:underline"
            >
              Regístrate gratis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
