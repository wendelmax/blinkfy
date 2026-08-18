-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "credentialRef" TEXT,
    "config" JSONB,
    "killSwitch" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitRpm" INTEGER NOT NULL DEFAULT 60,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_executions" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "idempotencyKey" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_executions_idempotencyKey_key" ON "integration_executions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "integration_configs_userId_provider_idx" ON "integration_configs"("userId", "provider");

-- CreateIndex
CREATE INDEX "integration_configs_workspaceId_category_idx" ON "integration_configs"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "integration_executions_configId_status_idx" ON "integration_executions"("configId", "status");

-- CreateIndex
CREATE INDEX "integration_executions_userId_action_idx" ON "integration_executions"("userId", "action");

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_executions" ADD CONSTRAINT "integration_executions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_executions" ADD CONSTRAINT "integration_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
