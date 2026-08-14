const { aggregateInboxMessages } = require('../../services/blinkfy/conciergeUnifiedInboxService');

function createConciergeInboxController({ prisma }) {
  async function list(req, res) {
    const job = await prisma.blinkfyJob.findFirst({ where: { id: req.params.jobId, clientId: req.client.id } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const applications = await prisma.candidateApplication.findMany({ where: { jobId: job.id, clientId: req.client.id }, include: { candidate: true, conciergeMessages: { orderBy: { receivedAt: 'desc' } } } });
    return res.json({ items: aggregateInboxMessages(applications) });
  }
  return { list };
}

module.exports = { createConciergeInboxController };
