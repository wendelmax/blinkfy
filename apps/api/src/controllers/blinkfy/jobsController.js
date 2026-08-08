const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { defaultScorecardWeights, parseJobInput } = require('../../validators/blinkfy');

const csvHeaders = ['title', 'description', 'location', 'workModel', 'salaryMin', 'salaryMax', 'requirements'];

function toJobResponse(job) {
    return {
        id: job.id,
        clientId: job.clientId,
        title: job.title,
        description: job.description,
        location: job.location,
        workModel: job.workModel,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        requirements: job.requirements,
        status: job.status,
        scorecard: {
            weights: {
                skills: job.scorecard.skills,
                experience: job.scorecard.experience,
                context: job.scorecard.context,
                preferences: job.scorecard.preferences,
                signals: job.scorecard.signals,
            },
        },
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}

function parseCsv(csv) {
    if (typeof csv !== 'string' || csv.trim() === '') {
        throw new Error('csv must be a nonempty string');
    }

    const rows = [[]];
    let value = '';
    let quoted = false;
    let endedWithRecordSeparator = false;

    for (let index = 0; index < csv.length; index += 1) {
        const character = csv[index];
        if (character === '"') {
            endedWithRecordSeparator = false;
            if (quoted && csv[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            endedWithRecordSeparator = false;
            rows[rows.length - 1].push(value);
            value = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && csv[index + 1] === '\n') {
                index += 1;
            }
            rows[rows.length - 1].push(value);
            value = '';
            if (index < csv.length - 1) {
                rows.push([]);
            }
            endedWithRecordSeparator = true;
        } else {
            endedWithRecordSeparator = false;
            value += character;
        }
    }

    if (quoted) {
        throw new Error('csv contains an unclosed quoted value');
    }
    if (!endedWithRecordSeparator && (value !== '' || rows[rows.length - 1].length > 0)) {
        rows[rows.length - 1].push(value);
    }
    return rows.filter((row) => row.some((column) => column.trim() !== ''));
}

function normalizeImportedJob(csv) {
    const rows = parseCsv(csv);
    if (rows.length !== 2 || rows[0].length !== csvHeaders.length || rows[1].length !== csvHeaders.length) {
        return { success: false, rowNumber: rows.length > 1 ? 2 : 1, errors: [{ path: 'csv', message: 'CSV must contain a header and exactly one job row' }] };
    }
    if (csvHeaders.some((header, index) => rows[0][index].trim() !== header)) {
        return { success: false, rowNumber: 1, errors: [{ path: 'csv', message: `CSV headers must be ${csvHeaders.join(',')}` }] };
    }

    const raw = Object.fromEntries(csvHeaders.map((header, index) => [header, rows[1][index].trim()]));
    const parsed = parseJobInput({
        title: raw.title,
        description: raw.description || null,
        location: raw.location || null,
        workModel: raw.workModel || null,
        salaryMin: raw.salaryMin === '' ? null : Number(raw.salaryMin),
        salaryMax: raw.salaryMax === '' ? null : Number(raw.salaryMax),
        requirements: raw.requirements === '' ? [] : raw.requirements.split('|').map((requirement) => requirement.trim()),
        weights: { ...defaultScorecardWeights },
    });

    if (!parsed.success) {
        return { success: false, rowNumber: 2, errors: parsed.errors };
    }
    return { success: true, data: parsed.data, rowNumber: 2 };
}

function createJobRecord({ prisma, clientId, input }) {
    return prisma.blinkfyJob.create({
        data: {
            clientId,
            title: input.title,
            description: input.description ?? null,
            location: input.location ?? null,
            workModel: input.workModel ?? null,
            salaryMin: input.salaryMin ?? null,
            salaryMax: input.salaryMax ?? null,
            requirements: input.requirements,
            scorecard: { create: input.weights },
        },
        include: { scorecard: true },
    });
}

function createJobsController({ prisma }) {
    async function createManualJob(req, res) {
        const parsed = parseJobInput(req.body);
        if (!parsed.success) {
            return res.status(422).json({ errors: parsed.errors });
        }

        const job = await prisma.$transaction(async (transaction) => {
            const created = await createJobRecord({ prisma: transaction, clientId: req.client.id, input: parsed.data });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                entityType: 'job',
                entityId: created.id,
                action: 'job.created',
                metadata: { source: 'manual' },
            });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                entityType: 'job',
                entityId: created.id,
                action: 'job.scorecard_configured',
                metadata: { weights: parsed.data.weights },
            });
            return created;
        });

        return res.status(201).json(toJobResponse(job));
    }

    async function listJobs(req, res) {
        const jobs = await prisma.blinkfyJob.findMany({
            where: { clientId: req.client.id },
            include: { scorecard: true },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ items: jobs.map(toJobResponse) });
    }

    async function importJob(req, res) {
        let normalized;
        try {
            normalized = normalizeImportedJob(req.body?.csv);
        } catch (error) {
            normalized = { success: false, rowNumber: 1, errors: [{ path: 'csv', message: error.message }] };
        }

        if (!normalized.success) {
            const failedImport = await prisma.$transaction(async (transaction) => {
                const created = await transaction.jobImport.create({
                    data: {
                        clientId: req.client.id,
                        status: 'failed',
                        rowNumber: normalized.rowNumber,
                        source: { csv: req.body?.csv ?? null },
                        errors: normalized.errors,
                    },
                });
                await recordAuditEvent({
                    prisma: transaction,
                    workspaceId: req.workspace.id,
                    clientId: req.client.id,
                    actorUserId: req.user.id,
                    entityType: 'job_import',
                    entityId: created.id,
                    action: 'job.import_failed',
                    metadata: { rowNumber: normalized.rowNumber },
                });
                return created;
            });
            return res.status(422).json({ import: { id: failedImport.id, status: failedImport.status, rowNumber: failedImport.rowNumber }, rowNumber: normalized.rowNumber, errors: normalized.errors });
        }

        const result = await prisma.$transaction(async (transaction) => {
            const job = await createJobRecord({ prisma: transaction, clientId: req.client.id, input: normalized.data });
            const jobImport = await transaction.jobImport.create({
                data: {
                    clientId: req.client.id,
                    status: 'completed',
                    rowNumber: normalized.rowNumber,
                    source: { csv: req.body.csv },
                },
            });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                entityType: 'job',
                entityId: job.id,
                action: 'job.created',
                metadata: { source: 'import', importId: jobImport.id },
            });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                entityType: 'job',
                entityId: job.id,
                action: 'job.scorecard_configured',
                metadata: { weights: normalized.data.weights },
            });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                entityType: 'job_import',
                entityId: jobImport.id,
                action: 'job.imported',
                metadata: { jobId: job.id, rowNumber: normalized.rowNumber },
            });
            return { job, jobImport };
        });

        return res.status(201).json({
            job: toJobResponse(result.job),
            import: { id: result.jobImport.id, status: result.jobImport.status, rowNumber: result.jobImport.rowNumber },
        });
    }

    return { createManualJob, listJobs, importJob };
}

module.exports = { createJobsController, normalizeImportedJob };
