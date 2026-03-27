"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/schema/auth.schema";
import { redirect } from "next/navigation";

export async function registerAction(
  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  },
  callbackUrl?: string
) {
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const freePlan = await prisma.plan.findUnique({ where: { name: "free" } });
  if (!freePlan) {
    return { error: "Error interno: plan por defecto no encontrado" };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      subscription: {
        create: {
          planId: freePlan.id,
          status: "active",
        },
      },
    },
  });

  if (!user) {
    return { error: "Error al crear el usuario" };
  }

  const loginUrl =
    callbackUrl && callbackUrl.startsWith("/")
      ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login?registered=true";
  redirect(loginUrl);
}
