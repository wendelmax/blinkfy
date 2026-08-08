-- CreateEnum
CREATE TYPE "talent_job_status" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "JobImportStatus" AS ENUM ('completed', 'failed');

-- CreateTable
CREATE TABLE "talent_jobs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "workModel" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "requirements" JSONB NOT NULL,
    "status" "talent_job_status" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_scorecards" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skills" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "context" INTEGER NOT NULL,
    "preferences" INTEGER NOT NULL,
    "signals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_imports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "JobImportStatus" NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "source" JSONB NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "talent_jobs_clientId_status_idx" ON "talent_jobs"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_scorecards_jobId_key" ON "job_scorecards"("jobId");

-- CreateIndex
CREATE INDEX "job_imports_clientId_createdAt_idx" ON "job_imports"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "talent_jobs" ADD CONSTRAINT "talent_jobs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_scorecards" ADD CONSTRAINT "job_scorecards_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "talent_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_imports" ADD CONSTRAINT "job_imports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
