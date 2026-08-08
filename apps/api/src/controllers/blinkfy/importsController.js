const { CandidateImportPersistenceError, importCandidates } = require('../../services/blinkfy/importService');

function createImportsController({ prisma }) {
    async function importCandidatesFromCsv(req, res) {
        try {
            const result = await importCandidates({
                prisma,
                workspaceId: req.workspace.id,
                clientId: req.client.id,
                actorUserId: req.user.id,
                csv: req.body?.csv,
                filename: req.body?.filename,
            });
            return res.status(201).json({
                import: { id: result.importId },
                created: result.created.length,
                candidates: result.created.map((candidate) => ({ id: candidate.id, fullName: candidate.fullName })),
                duplicates: result.duplicates,
                invalidRows: result.invalidRows,
            });
        } catch (error) {
            if (error instanceof TypeError) {
                return res.status(422).json({ message: error.message });
            }
            if (!(error instanceof CandidateImportPersistenceError)) {
                console.error('Candidate import failed:', error);
            }
            return res.status(500).json({ message: 'Candidate import could not be completed' });
        }
    }

    return { importCandidatesFromCsv };
}

module.exports = { createImportsController };
