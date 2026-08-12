-- CreateEnum
CREATE TYPE "ScreeningSessionStatus" AS ENUM ('invited', 'consented', 'scheduled', 'in_progress', 'completed', 'withdrawn');

-- CreateTable
CREATE TABLE "screening_sessions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ScreeningSessionStatus" NOT NULL DEFAULT 'invited',
    "consentedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "screening_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screening_sessions_applicationId_status_idx" ON "screening_sessions"("applicationId", "status");

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
