-- Candidate-controlled Talent profile. Existing imported candidates remain valid.
CREATE TYPE "candidate_visibility" AS ENUM ('private', 'available', 'recruiters_only', 'paused');

ALTER TABLE "candidates"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "targetRole" TEXT,
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "location" TEXT,
  ADD COLUMN "workModel" TEXT,
  ADD COLUMN "availability" TEXT,
  ADD COLUMN "portfolioUrl" TEXT;

ALTER TABLE "candidates"
  ALTER COLUMN "visibility" DROP DEFAULT,
  ALTER COLUMN "visibility" TYPE "candidate_visibility" USING (
    CASE "visibility"
      WHEN 'available' THEN 'available'::"candidate_visibility"
      WHEN 'recruiters_only' THEN 'recruiters_only'::"candidate_visibility"
      WHEN 'paused' THEN 'paused'::"candidate_visibility"
      ELSE 'private'::"candidate_visibility"
    END
  ),
  ALTER COLUMN "visibility" SET DEFAULT 'private';

CREATE UNIQUE INDEX "candidates_userId_key" ON "candidates"("userId");
CREATE INDEX "candidates_workspaceId_userId_idx" ON "candidates"("workspaceId", "userId");
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
