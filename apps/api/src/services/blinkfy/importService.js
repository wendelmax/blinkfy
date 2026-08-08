const { findCandidateDuplicate, normalizeEmail, normalizeLinkedinUrl } = require('./candidateService');
const { recordAuditEvent } = require('./auditService');

const candidateCsvHeaders = ['fullName', 'email', 'linkedinUrl', 'currentTitle', 'location', 'skills', 'source'];

class CandidateImportPersistenceError extends Error {
    constructor() {
        super('Candidate import could not be completed');
        this.name = 'CandidateImportPersistenceError';
    }
}

function parseCsv(csv) {
    if (typeof csv !== 'string' || csv.trim() === '') {
        throw new TypeError('csv must be a nonempty string');
    }

    const rows = [[]];
    let value = '';
    let quoted = false;
    for (let index = 0; index < csv.length; index += 1) {
        const character = csv[index];
        if (character === '"') {
            if (quoted && csv[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            rows.at(-1).push(value);
            value = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && csv[index + 1] === '\n') {
                index += 1;
            }
            rows.at(-1).push(value);
            value = '';
            if (index < csv.length - 1) {
                rows.push([]);
            }
        } else {
            value += character;
        }
    }
    if (quoted) {
        throw new TypeError('csv contains an unclosed quoted value');
    }
    if (value !== '' || rows.at(-1).length > 0) {
        rows.at(-1).push(value);
    }
    return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

function invalidRow(row, field, message) {
    return { row, field, message };
}

function normalizeCandidateRow(row, rowNumber) {
    if (row.length !== candidateCsvHeaders.length) {
        return { success: false, error: invalidRow(rowNumber, 'csv', 'Expected the configured candidate columns') };
    }
    const values = Object.fromEntries(candidateCsvHeaders.map((header, index) => [header, row[index].trim()]));
    if (!values.fullName) {
        return { success: false, error: invalidRow(rowNumber, 'fullName', 'Full name is required') };
    }
    if (!values.source) {
        return { success: false, error: invalidRow(rowNumber, 'source', 'Source is required') };
    }

    const email = normalizeEmail(values.email);
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: invalidRow(rowNumber, 'email', 'Email must be valid') };
    }

    let linkedinUrl = null;
    try {
        linkedinUrl = normalizeLinkedinUrl(values.linkedinUrl);
    } catch {
        return { success: false, error: invalidRow(rowNumber, 'linkedinUrl', 'LinkedIn URL must be valid') };
    }
    if (!email && !linkedinUrl) {
        return { success: false, error: invalidRow(rowNumber, 'identity', 'Email or LinkedIn URL is required') };
    }

    return {
        success: true,
        data: {
            fullName: values.fullName,
            email,
            linkedinUrl,
            currentTitle: values.currentTitle || null,
            location: values.location || null,
            skills: values.skills ? values.skills.split('|').map((skill) => skill.trim()).filter(Boolean) : [],
            source: values.source,
        },
    };
}

function parseCandidateCsv(csv) {
    const rows = parseCsv(csv);
    if (rows.length === 0 || candidateCsvHeaders.some((header, index) => rows[0]?.[index]?.trim() !== header) || rows[0].length !== candidateCsvHeaders.length) {
        return { validRows: [], invalidRows: [invalidRow(1, 'csv', `CSV headers must be ${candidateCsvHeaders.join(',')}`)] };
    }

    return rows.slice(1).reduce((result, row, index) => {
        const normalized = normalizeCandidateRow(row, index + 2);
        if (normalized.success) {
            result.validRows.push(normalized.data);
        } else {
            result.invalidRows.push(normalized.error);
        }
        return result;
    }, { validRows: [], invalidRows: [] });
}

async function lockCandidateIdentities(transaction, row) {
    const identityKeys = [
        row.email && `email:${row.email}`,
        row.linkedinUrl && `linkedin:${row.linkedinUrl}`,
    ].filter(Boolean).sort();

    for (const identityKey of identityKeys) {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identityKey}))`;
    }
}

async function persistFailedImport({ prisma, workspaceId, clientId, actorUserId, filename }) {
    const failedImport = await prisma.candidateImport.create({
        data: {
            workspaceId,
            clientId,
            filename: String(filename).trim() || 'candidates.csv',
            source: 'csv',
            status: 'failed',
            errors: [{ field: 'import', message: 'Import could not be processed' }],
        },
    });
    await recordAuditEvent({
        prisma,
        workspaceId,
        clientId,
        actorUserId,
        entityType: 'candidate_import',
        entityId: failedImport.id,
        action: 'candidate.import_failed',
        metadata: { reason: 'persistence_failure' },
    });
}

async function importCandidates({ prisma, workspaceId, clientId, actorUserId, csv, filename = 'candidates.csv' }) {
    const { validRows, invalidRows } = parseCandidateCsv(csv);
    try {
        return await prisma.$transaction(async (transaction) => {
            const candidateImport = await transaction.candidateImport.create({
                data: {
                    workspaceId,
                    clientId,
                    filename: String(filename).trim() || 'candidates.csv',
                    source: 'csv',
                    status: invalidRows.length > 0 ? 'completed_with_errors' : 'completed',
                    invalidCount: invalidRows.length,
                    errors: invalidRows.length > 0 ? invalidRows : undefined,
                },
            });
            const created = [];
            const duplicates = [];

            for (const row of validRows) {
                await lockCandidateIdentities(transaction, row);
                const duplicate = await findCandidateDuplicate({
                    prisma: transaction,
                    workspaceId,
                    email: row.email,
                    linkedinUrl: row.linkedinUrl,
                });
                if (duplicate) {
                    await transaction.candidateIdentity.create({
                        data: { candidateId: duplicate.id, importId: candidateImport.id, source: row.source },
                    });
                    await recordAuditEvent({
                        prisma: transaction,
                        workspaceId,
                        clientId,
                        actorUserId,
                        entityType: 'candidate',
                        entityId: duplicate.id,
                        action: 'candidate.duplicate_detected',
                        metadata: { importId: candidateImport.id, source: row.source },
                    });
                    duplicates.push({ id: duplicate.id, row: validRows.indexOf(row) + 2 });
                    continue;
                }

                const candidate = await transaction.candidate.create({
                    data: {
                        workspaceId,
                        fullName: row.fullName,
                        normalizedEmail: row.email,
                        normalizedLinkedinUrl: row.linkedinUrl,
                        profile: { currentTitle: row.currentTitle, location: row.location, skills: row.skills },
                        sourceMetadata: { source: row.source },
                        identities: { create: { importId: candidateImport.id, source: row.source } },
                    },
                });
                await recordAuditEvent({
                    prisma: transaction,
                    workspaceId,
                    clientId,
                    actorUserId,
                    entityType: 'candidate',
                    entityId: candidate.id,
                    action: 'candidate.imported',
                    metadata: { importId: candidateImport.id, source: row.source },
                });
                created.push(candidate);
            }

            await transaction.candidateImport.update({
                where: { id: candidateImport.id },
                data: { createdCount: created.length, duplicateCount: duplicates.length },
            });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId,
                clientId,
                actorUserId,
                entityType: 'candidate_import',
                entityId: candidateImport.id,
                action: 'candidate.import_completed',
                metadata: { created: created.length, duplicates: duplicates.length, invalidRows: invalidRows.length },
            });

            return { importId: candidateImport.id, created, duplicates, invalidRows };
        });
    } catch (error) {
        try {
            await persistFailedImport({ prisma, workspaceId, clientId, actorUserId, filename });
        } catch {
            // The original failure remains the useful diagnostic for callers and logs.
        }
        throw new CandidateImportPersistenceError();
    }
}

module.exports = {
    CandidateImportPersistenceError,
    candidateCsvHeaders,
    importCandidates,
    parseCandidateCsv,
    persistFailedImport,
};
