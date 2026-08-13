CREATE TABLE "screening_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screening_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "screening_webhook_events_eventId_key" ON "screening_webhook_events"("eventId");
CREATE INDEX "screening_webhook_events_sessionId_receivedAt_idx" ON "screening_webhook_events"("sessionId", "receivedAt");
ALTER TABLE "screening_webhook_events" ADD CONSTRAINT "screening_webhook_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
