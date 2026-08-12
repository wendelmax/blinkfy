CREATE TABLE "candidate_usage" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "candidate_usage_candidateId_period_feature_key" ON "candidate_usage"("candidateId", "period", "feature");
CREATE INDEX "candidate_usage_candidateId_period_idx" ON "candidate_usage"("candidateId", "period");
ALTER TABLE "candidate_usage" ADD CONSTRAINT "candidate_usage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
