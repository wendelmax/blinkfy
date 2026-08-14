CREATE TABLE "concierge_webhook_subscriptions" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "concierge_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "concierge_webhook_subscriptions_clientId_key" ON "concierge_webhook_subscriptions"("clientId");
ALTER TABLE "concierge_webhook_subscriptions" ADD CONSTRAINT "concierge_webhook_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
