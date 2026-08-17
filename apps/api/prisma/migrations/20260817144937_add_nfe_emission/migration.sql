-- CreateTable
CREATE TABLE "nfe_emissions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nfeNumber" TEXT,
    "nfeKey" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'focus_nfe',
    "providerNfeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "cnaeCode" TEXT NOT NULL,
    "serviceDescription" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "amountBrl" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "exchangeRateSource" TEXT NOT NULL DEFAULT 'frankfurter',
    "taxResidence" TEXT,
    "taxRegime" TEXT,
    "issExempt" BOOLEAN NOT NULL DEFAULT false,
    "protocolNumber" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "xmlUri" TEXT,
    "pdfUri" TEXT,
    "emittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfe_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfe_emissions_nfeNumber_key" ON "nfe_emissions"("nfeNumber");

-- CreateIndex
CREATE INDEX "nfe_emissions_userId_status_idx" ON "nfe_emissions"("userId", "status");

-- CreateIndex
CREATE INDEX "nfe_emissions_invoiceId_idx" ON "nfe_emissions"("invoiceId");

-- CreateIndex
CREATE INDEX "nfe_emissions_providerNfeId_idx" ON "nfe_emissions"("providerNfeId");

-- AddForeignKey
ALTER TABLE "nfe_emissions" ADD CONSTRAINT "nfe_emissions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfe_emissions" ADD CONSTRAINT "nfe_emissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
