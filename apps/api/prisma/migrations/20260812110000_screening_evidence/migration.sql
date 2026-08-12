CREATE TYPE "ScreeningEvidenceKind" AS ENUM ('recording', 'transcript', 'insight');

CREATE TABLE "screening_evidences" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" "ScreeningEvidenceKind" NOT NULL,
    "uri" TEXT,
    "content" TEXT,
    "confidence" INTEGER,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screening_evidences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "screening_evidences_sessionId_kind_idx" ON "screening_evidences"("sessionId", "kind");
CREATE INDEX "screening_evidences_retentionUntil_idx" ON "screening_evidences"("retentionUntil");
ALTER TABLE "screening_evidences" ADD CONSTRAINT "screening_evidences_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
