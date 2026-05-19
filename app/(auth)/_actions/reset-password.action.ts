"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/schema/auth.schema";
import { redirect } from "next/navigation";

export async function resetPasswordAction(
  token: string,
  formData: { password: string; confirmPassword: string }
) {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    return { error: "Este enlace ya fue utilizado o no es válido." };
  }

  if (resetToken.expires < new Date()) {
    return { error: "Este enlace ha expirado. Solicita uno nuevo." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({ where: { token } }),
  ]);

  redirect("/login?reset=true");
}
