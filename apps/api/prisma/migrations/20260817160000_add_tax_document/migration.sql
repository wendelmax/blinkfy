-- CreateTable
CREATE TABLE "tax_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "formType" TEXT NOT NULL DEFAULT 'w8ben',
    "status" TEXT NOT NULL DEFAULT 'active',
    "fullName" TEXT NOT NULL,
    "countryOfBirth" TEXT,
    "permanentAddress" TEXT,
    "mailingAddress" TEXT,
    "taxId" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "isForeignIndividual" BOOLEAN NOT NULL DEFAULT true,
    "claimTreatyBenefits" BOOLEAN NOT NULL DEFAULT false,
    "treatyCountry" TEXT,
    "treatyArticle" TEXT,
    "documentUri" TEXT,
    "signatureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "supersededById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_documents_userId_status_idx" ON "tax_documents"("userId", "status");

-- CreateIndex
CREATE INDEX "tax_documents_userId_formType_idx" ON "tax_documents"("userId", "formType");

-- CreateIndex
CREATE INDEX "tax_documents_expiryDate_idx" ON "tax_documents"("expiryDate");

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
