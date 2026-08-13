CREATE TYPE "ScreeningFeedbackStatus" AS ENUM ('positive', 'neutral', 'negative', 'needs_review');

CREATE TABLE "screening_feedback" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ScreeningFeedbackStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "screening_feedback_applicationId_createdAt_idx" ON "screening_feedback"("applicationId", "createdAt");
ALTER TABLE "screening_feedback" ADD CONSTRAINT "screening_feedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
