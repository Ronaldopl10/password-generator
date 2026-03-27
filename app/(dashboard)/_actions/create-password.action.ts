"use server";

import { cryptr } from "@/lib/cripto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import { passwordSchema, PasswordSchemaType } from "@/schema/password.schema";
import { validatePasswordLimit } from "@/lib/validate-plan-limit";

export const CreatePasswordAction = async (newPassword: PasswordSchemaType) => {
  const session = await requireAuth();

  const parseBody = passwordSchema.safeParse(newPassword);

  if (!parseBody.success) {
    throw new Error(
      `Validation failed: ${parseBody.error.issues
        .map((e) => e.message)
        .join(", ")}`
    );
  }

  const userId = session.user!.id as string;
  const { password, ...restItems } = parseBody.data;

  await validatePasswordLimit(userId);

  const encryptedPassword = cryptr.encrypt(password);

  return await prisma.password.create({
    data: { ...restItems, encryptedPassword, userId },
  });
};
