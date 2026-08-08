const { getClientAnalytics } = require('../../services/blinkfy/analyticsService');

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z)?$/;

class AnalyticsValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AnalyticsValidationError';
        this.status = 400;
    }
}

function parseDate(value, name) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') {
        throw new AnalyticsValidationError(`${name} must be a valid ISO date`);
    }
    const match = ISO_DATE.exec(value);
    if (!match) throw new AnalyticsValidationError(`${name} must be a valid ISO date`);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AnalyticsValidationError(`${name} must be a valid ISO date`);
    }
    const [, year, month, day, hour, minute, second, millisecond] = match;
    if (date.getUTCFullYear() !== Number(year)
        || date.getUTCMonth() + 1 !== Number(month)
        || date.getUTCDate() !== Number(day)
        || (hour != null && (date.getUTCHours() !== Number(hour)
            || date.getUTCMinutes() !== Number(minute)
            || date.getUTCSeconds() !== Number(second)
            || date.getUTCMilliseconds() !== Number(millisecond || 0)))) {
        throw new AnalyticsValidationError(`${name} must be a valid ISO date`);
    }
    return date;
}

function createAnalyticsController({ prisma }) {
    async function getAnalytics(req, res) {
        try {
            const client = await prisma.client.findFirst({
                where: { id: req.params.clientId, workspaceId: req.workspace.id },
                select: { id: true },
            });
            if (!client) return res.status(404).json({ message: 'Client not found' });

            if (req.query.jobId != null && (typeof req.query.jobId !== 'string' || !req.query.jobId.trim())) {
                throw new AnalyticsValidationError('jobId must be a nonempty string');
            }
            const jobId = req.query.jobId ? req.query.jobId.trim() : null;
            if (jobId) {
                const job = await prisma.blinkfyJob.findFirst({ where: { id: jobId, clientId: client.id }, select: { id: true } });
                if (!job) return res.status(404).json({ message: 'Job not found' });
            }
            const from = parseDate(req.query.from, 'from');
            const to = parseDate(req.query.to, 'to');
            if (from && to && from >= to) throw new AnalyticsValidationError('from must be before to');

            const analytics = await getClientAnalytics({ prisma, workspaceId: req.workspace.id, clientId: client.id, jobId, from, to });
            return res.json(analytics);
        } catch (error) {
            if (error instanceof AnalyticsValidationError) return res.status(400).json({ message: error.message });
            return res.status(500).json({ message: 'Unable to load analytics' });
        }
    }

    return { getAnalytics };
}

module.exports = { AnalyticsValidationError, createAnalyticsController, parseDate };
