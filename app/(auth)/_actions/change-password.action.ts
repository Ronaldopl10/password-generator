"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/schema/auth.schema";
import { requireAuth } from "@/lib/get-session";

export async function changePasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const parsed = changePasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const session = await requireAuth();
  const userId = session.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) {
    return {
      error: "No se puede cambiar la contraseña con este método de autenticación",
    };
  }

  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password
  );
  if (!isValid) {
    return { error: "La contraseña actual es incorrecta" };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { success: true, message: "Contraseña actualizada correctamente" };
}
