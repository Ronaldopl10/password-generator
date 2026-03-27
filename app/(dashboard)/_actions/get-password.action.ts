"use server";

import { cryptr } from "@/lib/cripto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export const GetPasswordAction = async () => {
  const session = await getSession();

  if (!session?.user?.id) return [];

  const passwords = await prisma.password.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return passwords.map((item) => ({
    ...item,
    decryptedPassword: cryptr.decrypt(item.encryptedPassword),
  }));
};
