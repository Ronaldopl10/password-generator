"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export const GetSubscriptionAction = async () => {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const userId = session.user.id as string;

  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prisma.password.count({ where: { userId } }),
  ]);

  if (!subscription) return null;

  return {
    plan: subscription.plan,
    currentCount,
  };
};
