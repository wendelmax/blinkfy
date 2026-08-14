CREATE TABLE "concierge_scheduling_policies" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "windows" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "concierge_scheduling_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "concierge_scheduling_policies_clientId_key" ON "concierge_scheduling_policies"("clientId");
ALTER TABLE "concierge_scheduling_policies" ADD CONSTRAINT "concierge_scheduling_policies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
