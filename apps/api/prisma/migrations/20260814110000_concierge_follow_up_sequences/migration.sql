CREATE TABLE "concierge_follow_up_sequences" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "delaysInDays" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "interruptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "concierge_follow_up_sequences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "concierge_follow_up_sequences_applicationId_key" ON "concierge_follow_up_sequences"("applicationId");
ALTER TABLE "concierge_follow_up_sequences" ADD CONSTRAINT "concierge_follow_up_sequences_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
