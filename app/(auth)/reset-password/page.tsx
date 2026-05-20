"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  ResetPasswordInput,
} from "@/schema/auth.schema";
import { resetPasswordAction } from "../_actions/reset-password.action";
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
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await resetPasswordAction(token, values);
      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
      }
      // On success, resetPasswordAction throws a redirect
    } catch {
      // redirect throws internally, this is expected
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md mb-4">
          <Button variant="ghost" asChild className="pl-0">
            <Link href="/forgot-password">← Solicitar nuevo enlace</Link>
          </Button>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enlace inválido</CardTitle>
            <CardDescription>
              No se encontró un token de restablecimiento. Solicita un nuevo
              enlace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/forgot-password">
                Solicitar nuevo enlace
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md mb-4">
        <Button variant="ghost" asChild className="pl-0">
          <Link href="/login">← Volver al login</Link>
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showConfirm ? "text" : "password"} className="pr-10" placeholder="••••••••" {...field} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-muted-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Restableciendo..." : "Restablecer contraseña"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
