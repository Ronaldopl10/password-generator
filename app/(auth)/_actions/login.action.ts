"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/schema/auth.schema";

export async function loginAction(
  formData: { email: string; password: string },
  callbackUrl?: string
) {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Solo aceptar rutas relativas para evitar open redirect
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Credenciales inválidas" };
    }
    // Re-throw redirect (NEXT_REDIRECT) so Next.js handles the navigation
    throw error;
  }
}
