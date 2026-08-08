-- CreateEnum
CREATE TYPE "CandidateImportStatus" AS ENUM ('completed', 'completed_with_errors', 'failed');

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedEmail" TEXT,
    "normalizedLinkedinUrl" TEXT,
    "profile" JSONB NOT NULL,
    "sourceMetadata" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_identities" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "importId" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_consents" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "purpose" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "evidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_imports" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "CandidateImportStatus" NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'mapped',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidates_workspaceId_idx" ON "candidates"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_workspace_normalized_email_key"
ON "candidates"("workspaceId", "normalizedEmail")
WHERE "normalizedEmail" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "candidates_workspace_normalized_linkedin_url_key"
ON "candidates"("workspaceId", "normalizedLinkedinUrl")
WHERE "normalizedLinkedinUrl" IS NOT NULL;

-- CreateIndex
CREATE INDEX "candidate_identities_candidateId_source_idx" ON "candidate_identities"("candidateId", "source");

-- CreateIndex
CREATE INDEX "candidate_identities_importId_idx" ON "candidate_identities"("importId");

-- CreateIndex
CREATE INDEX "candidate_consents_candidateId_purpose_clientId_revokedAt_idx" ON "candidate_consents"("candidateId", "purpose", "clientId", "revokedAt");

-- CreateIndex
CREATE INDEX "candidate_consents_workspaceId_purpose_idx" ON "candidate_consents"("workspaceId", "purpose");

-- CreateIndex
CREATE INDEX "candidate_imports_workspaceId_createdAt_idx" ON "candidate_imports"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "candidate_imports_clientId_createdAt_idx" ON "candidate_imports"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "candidate_applications_clientId_stage_idx" ON "candidate_applications"("clientId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_applications_candidateId_clientId_key" ON "candidate_applications"("candidateId", "clientId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_identities" ADD CONSTRAINT "candidate_identities_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_identities" ADD CONSTRAINT "candidate_identities_importId_fkey" FOREIGN KEY ("importId") REFERENCES "candidate_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_consents" ADD CONSTRAINT "candidate_consents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_consents" ADD CONSTRAINT "candidate_consents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_consents" ADD CONSTRAINT "candidate_consents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "candidate_imports_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_imports" ADD CONSTRAINT "candidate_imports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
