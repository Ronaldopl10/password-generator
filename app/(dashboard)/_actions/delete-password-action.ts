"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

export const DeletePasswordAction = async (id: string) => {
  const session = await requireAuth();

  // Verify ownership before deleting
  const password = await prisma.password.findFirst({
    where: { id, userId: session.user!.id },
  });

  if (!password) {
    throw new Error("No autorizado");
  }

  return await prisma.password.delete({
    where: { id },
  });
};
