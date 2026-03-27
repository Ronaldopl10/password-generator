"use server";

import { prisma } from "@/lib/prisma";

export async function validatePasswordLimit(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription?.plan) {
    throw new Error("Sin plan asignado. Por favor contacta soporte.");
  }

  const { maxPasswords, displayName } = subscription.plan;

  // -1 = ilimitado (plan Pro)
  if (maxPasswords === -1) return;

  const currentCount = await prisma.password.count({
    where: { userId },
  });

  if (currentCount >= maxPasswords) {
    throw new Error(
      `Límite alcanzado: el plan ${displayName} permite hasta ${maxPasswords} contraseña${maxPasswords === 1 ? "" : "s"}. Actualiza tu plan para guardar más.`
    );
  }
}
