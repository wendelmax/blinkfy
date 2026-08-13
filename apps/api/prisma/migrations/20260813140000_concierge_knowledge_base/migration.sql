CREATE TABLE "knowledge_documents" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "knowledge_chunks" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_documents_clientId_title_key" ON "knowledge_documents"("clientId", "title");
CREATE INDEX "knowledge_documents_clientId_createdAt_idx" ON "knowledge_documents"("clientId", "createdAt");
CREATE UNIQUE INDEX "knowledge_chunks_documentId_position_key" ON "knowledge_chunks"("documentId", "position");
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
