CREATE TYPE "CandidateDraftStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "candidate_drafts" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "CandidateDraftStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "candidate_drafts_candidateId_createdAt_idx" ON "candidate_drafts"("candidateId", "createdAt");
ALTER TABLE "candidate_drafts" ADD CONSTRAINT "candidate_drafts_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
