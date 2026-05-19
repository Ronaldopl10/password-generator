import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding plans...");

  const plans = [
    {
      name: "free",
      displayName: "Free",
      maxPasswords: 18,
      price: 0,
    },
    {
      name: "starter",
      displayName: "Starter",
      maxPasswords: 40,
      price: 2.99,
    },
    {
      name: "pro",
      displayName: "Pro+",
      maxPasswords: -1, // unlimited
      price: 9.99,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  ✅ Plan "${plan.displayName}" upserted`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
