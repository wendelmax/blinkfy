CREATE TYPE "CandidatePlan" AS ENUM ('free', 'pro');
CREATE TYPE "CandidateSubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'expired');

CREATE TABLE "candidate_subscriptions" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "plan" "CandidatePlan" NOT NULL DEFAULT 'free',
  "status" "CandidateSubscriptionStatus" NOT NULL DEFAULT 'active',
  "provider" TEXT,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "candidate_subscriptions_candidateId_key" ON "candidate_subscriptions"("candidateId");
ALTER TABLE "candidate_subscriptions" ADD CONSTRAINT "candidate_subscriptions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
