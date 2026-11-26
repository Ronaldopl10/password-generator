-- Dodo Payments: esquema aditivo e idempotente.
--
-- Se aplica a mano (el owner la corre); no la ejecuta `prisma migrate` contra
-- producción. Todo está guardado con IF NOT EXISTS para que correrla dos veces
-- sea un no-op: no hay DROP, ni recreación de tablas, ni reescritura de datos.

-- AlterTable: Plan.interval (reservado para el plan anual; sin UI todavía)
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "interval" TEXT;

-- AlterTable: Subscription (estado de la suscripción en la pasarela)
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastEventAt" TIMESTAMP(3);
-- Mutex corto del checkout en curso (lo suelta la ruta o el webhook aplicado)
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "checkoutLockUntil" TIMESTAMP(3);

-- CreateTable: cola durable de webhooks
CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_externalId_key" ON "Subscription"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_webhookId_key" ON "BillingWebhookEvent"("webhookId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_status_receivedAt_idx" ON "BillingWebhookEvent"("status", "receivedAt");
