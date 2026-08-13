CREATE TABLE "concierge_messages" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "content" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "concierge_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "concierge_messages_externalMessageId_key" ON "concierge_messages"("externalMessageId");
CREATE INDEX "concierge_messages_applicationId_receivedAt_idx" ON "concierge_messages"("applicationId", "receivedAt");
ALTER TABLE "concierge_messages" ADD CONSTRAINT "concierge_messages_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
