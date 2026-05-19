"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/schema/auth.schema";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "Si el email existe, recibirás un enlace de restablecimiento";

export async function forgotPasswordAction(formData: { email: string }) {
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Anti-enumeration: always return same message
  if (!user) {
    return { success: true, message: GENERIC_MESSAGE };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expires },
  });

  // Send email silently — don't leak failure to user
  try {
    await sendPasswordResetEmail(user.email, token);
  } catch {
    // Email failed but we still return generic success
    console.error("Failed to send password reset email to:", user.email);
  }

  return { success: true, message: GENERIC_MESSAGE };
}
