CREATE TYPE "MessageSuggestionStatus" AS ENUM ('draft', 'approved', 'rejected');

CREATE TABLE "message_suggestions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageSuggestionStatus" NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "message_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_suggestions_applicationId_status_createdAt_idx" ON "message_suggestions"("applicationId", "status", "createdAt");
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
