ALTER TABLE "message_suggestions" ADD COLUMN "sourceMessageId" TEXT;
ALTER TABLE "message_suggestions" ADD COLUMN "grounding" JSONB;
CREATE INDEX "message_suggestions_sourceMessageId_idx" ON "message_suggestions"("sourceMessageId");
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "concierge_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
