const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { validateMessageSuggestionInput } = require('../../services/blinkfy/messageSuggestionService');

function createMessageSuggestionsController({ prisma }) {
    async function findApplication(req) {
        return prisma.candidateApplication.findFirst({
            where: { id: req.params.applicationId, jobId: req.params.jobId, candidate: { workspaceId: req.workspace.id }, job: { client: { workspaceId: req.workspace.id } } },
        });
    }

    async function list(req, res) {
        const application = await findApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const items = await prisma.messageSuggestion.findMany({ where: { applicationId: application.id }, orderBy: { createdAt: 'desc' } });
        return res.json({ items });
    }

    async function create(req, res) {
        const application = await findApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        let input;
        try { input = validateMessageSuggestionInput(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
        const suggestion = await prisma.messageSuggestion.create({ data: { applicationId: application.id, ...input } });
        await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'message_suggestion', entityId: suggestion.id, action: 'message_suggestion.created', metadata: { channel: suggestion.channel } });
        return res.status(201).json({ suggestion });
    }

    async function decide(req, res) {
        const application = await findApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const status = req.body?.status;
        if (!['approved', 'rejected'].includes(status)) return res.status(422).json({ message: 'status must be approved or rejected' });
        const current = await prisma.messageSuggestion.findFirst({ where: { id: req.params.suggestionId, applicationId: application.id } });
        if (!current) return res.status(404).json({ message: 'Message suggestion not found' });
        if (current.status !== 'draft') return res.status(409).json({ message: 'Message suggestion has already been decided' });
        const suggestion = await prisma.messageSuggestion.update({ where: { id: current.id }, data: { status, approvedAt: status === 'approved' ? new Date() : null, approvedById: status === 'approved' ? req.user.id : null } });
        await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'message_suggestion', entityId: suggestion.id, action: `message_suggestion.${status}`, metadata: { channel: suggestion.channel } });
        return res.json({ suggestion });
    }

    return { list, create, decide };
}

module.exports = { createMessageSuggestionsController };
