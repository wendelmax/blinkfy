-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL DEFAULT 'liveness',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerSessionId" TEXT,
    "faceEmbeddingHash" TEXT,
    "livenessScore" DOUBLE PRECISION,
    "matchScore" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "documentUri" TEXT,
    "selfieUri" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentIp" TEXT,
    "consentTimestamp" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "triggerReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kyc_verifications_userId_status_idx" ON "kyc_verifications"("userId", "status");

-- CreateIndex
CREATE INDEX "kyc_verifications_userId_verificationType_idx" ON "kyc_verifications"("userId", "verificationType");

-- CreateIndex
CREATE INDEX "kyc_verifications_providerSessionId_idx" ON "kyc_verifications"("providerSessionId");

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
