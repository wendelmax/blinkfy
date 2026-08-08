-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('mapped', 'reviewed', 'interested', 'screened', 'shortlisted', 'rejected');

-- CreateEnum
CREATE TYPE "FitScoreConfidence" AS ENUM ('low', 'medium', 'high');

-- Preserve the pre-existing client-level presentation records while allowing
-- one job-scoped application for each candidate/job pair.
ALTER TABLE "candidate_applications" ADD COLUMN "jobId" TEXT;
ALTER TABLE "candidate_applications" ADD COLUMN "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "candidate_applications" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "candidate_applications" ADD COLUMN "interestedAt" TIMESTAMP(3);
ALTER TABLE "candidate_applications" ADD COLUMN "screenedAt" TIMESTAMP(3);
ALTER TABLE "candidate_applications" ADD COLUMN "shortlistedAt" TIMESTAMP(3);
ALTER TABLE "candidate_applications" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "candidate_applications" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "candidate_applications" ALTER COLUMN "stage" TYPE "ApplicationStage" USING "stage"::"ApplicationStage";
ALTER TABLE "candidate_applications" ALTER COLUMN "stage" SET DEFAULT 'mapped';

DROP INDEX "candidate_applications_candidateId_clientId_key";
CREATE UNIQUE INDEX "candidate_applications_candidateId_jobId_key" ON "candidate_applications"("candidateId", "jobId");
CREATE UNIQUE INDEX "candidate_applications_presentation_key" ON "candidate_applications"("candidateId", "clientId") WHERE "jobId" IS NULL;
CREATE INDEX "candidate_applications_jobId_stage_idx" ON "candidate_applications"("jobId", "stage");

ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "talent_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "fit_score_snapshots" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" "FitScoreConfidence" NOT NULL,
    "factors" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overrideScore" INTEGER,
    "overrideReason" TEXT,
    "overrideByUserId" TEXT,
    "overriddenAt" TIMESTAMP(3),

    CONSTRAINT "fit_score_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fit_score_snapshots_score_check" CHECK ("score" >= 0 AND "score" <= 100),
    CONSTRAINT "fit_score_snapshots_override_score_check" CHECK ("overrideScore" IS NULL OR ("overrideScore" >= 0 AND "overrideScore" <= 100))
);

CREATE INDEX "fit_score_snapshots_applicationId_computedAt_idx" ON "fit_score_snapshots"("applicationId", "computedAt");
ALTER TABLE "fit_score_snapshots" ADD CONSTRAINT "fit_score_snapshots_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
