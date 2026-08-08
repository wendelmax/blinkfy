-- Baseline for the legacy schema that existed before Prisma migration history.
CREATE TYPE "UserType" AS ENUM ('candidate', 'recruiter', 'company', 'admin');

CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT, "keycloakId" TEXT, "fullName" TEXT NOT NULL, "userType" "UserType" NOT NULL, "emailVerified" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Session" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CandidateProfile" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "githubUsername" TEXT, "linkedinUrl" TEXT, "primaryStack" TEXT, "experienceLevel" TEXT, "englishLevel" TEXT, "salaryExpectationUsd" INTEGER, "taxResidence" TEXT, "taxId" TEXT, "cityState" TEXT, "eScore" INTEGER, "speechScore" INTEGER, "readinessScore" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Company" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "website" TEXT, "size" TEXT, "roleTypes" TEXT, "hiringVolume" TEXT, "companyType" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Company_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TechStack" ("id" SERIAL NOT NULL, "name" TEXT NOT NULL, "category" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TechStack_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Job" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "location" TEXT, "jobType" TEXT NOT NULL, "salaryMinUsd" INTEGER, "salaryMaxUsd" INTEGER, "stack" TEXT[], "status" TEXT NOT NULL DEFAULT 'open', "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Job_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Application" ("id" TEXT NOT NULL, "jobId" TEXT NOT NULL, "candidateId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'applied', "eScoreAtApply" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Application_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Placement" ("id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "recruiterId" TEXT, "successFeeUsd" DOUBLE PRECISION NOT NULL, "retentionBonusUsd" DOUBLE PRECISION NOT NULL DEFAULT 0, "successFeeReleased" BOOLEAN NOT NULL DEFAULT false, "retentionReleased" BOOLEAN NOT NULL DEFAULT false, "retentionReleaseDate" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Placement_pkey" PRIMARY KEY ("id"));
CREATE TABLE "WalletTransaction" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "amountUsd" DOUBLE PRECISION NOT NULL, "amountBrl" DOUBLE PRECISION, "exchangeRate" DOUBLE PRECISION, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'completed', "referenceId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ExchangeRateLog" ("id" SERIAL NOT NULL, "fromCur" TEXT NOT NULL DEFAULT 'USD', "toCur" TEXT NOT NULL DEFAULT 'BRL', "rate" DOUBLE PRECISION NOT NULL, "source" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ExchangeRateLog_pkey" PRIMARY KEY ("id"));
CREATE TABLE "MarketRate" ("id" SERIAL NOT NULL, "roleLabel" TEXT NOT NULL, "salaryAvgUsd" DOUBLE PRECISION NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD', "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id"));
CREATE TABLE "EmailVerificationToken" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_keycloakId_key" ON "User"("keycloakId");
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");
CREATE UNIQUE INDEX "TechStack_name_key" ON "TechStack"("name");
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
