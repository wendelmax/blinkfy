const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { chunkText, searchChunks, validateKnowledgeDocument } = require('../../services/blinkfy/knowledgeBaseService');

function createKnowledgeController({ prisma }) {
  async function createDocument(req, res) {
    let input;
    try { input = validateKnowledgeDocument(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    const document = await prisma.$transaction(async (transaction) => {
      const created = await transaction.knowledgeDocument.create({ data: { clientId: req.client.id, title: input.title, chunks: { create: chunkText(input.content).map((content, position) => ({ content, position })) } }, include: { chunks: true } });
      await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'knowledge_document', entityId: created.id, action: 'knowledge_document.created', metadata: { title: created.title, chunkCount: created.chunks.length } });
      return created;
    });
    return res.status(201).json({ document });
  }
  async function listDocuments(req, res) {
    const items = await prisma.knowledgeDocument.findMany({ where: { clientId: req.client.id }, include: { _count: { select: { chunks: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ items });
  }
  async function search(req, res) {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) return res.status(422).json({ message: 'q is required' });
    const documents = await prisma.knowledgeDocument.findMany({ where: { clientId: req.client.id }, include: { chunks: true } });
    const chunks = documents.flatMap((document) => document.chunks.map((chunk) => ({ ...chunk, title: document.title })));
    return res.json({ items: searchChunks(chunks, query) });
  }
  return { createDocument, listDocuments, search };
}

module.exports = { createKnowledgeController };
