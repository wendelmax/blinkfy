CREATE TABLE "concierge_webhook_outbox" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_approval',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "concierge_webhook_outbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "concierge_webhook_outbox_clientId_eventId_key" ON "concierge_webhook_outbox"("clientId", "eventId");
CREATE INDEX "concierge_webhook_outbox_clientId_status_createdAt_idx" ON "concierge_webhook_outbox"("clientId", "status", "createdAt");
ALTER TABLE "concierge_webhook_outbox" ADD CONSTRAINT "concierge_webhook_outbox_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
