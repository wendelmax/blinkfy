const { generateProofPdf, getIncomeHistory, verifyValidationHash, generateValidationHash } = require('../services/blinkfy/proofOfIncomeService');
const { recordAuditEvent } = require('../services/blinkfy/auditService');

function createProofOfIncomeController({ prisma }) {
    async function downloadProof(req, res) {
        try {
            const period = req.query.period || '6m';
            const { pdfBuffer, validationHash } = await generateProofPdf({
                userId: req.user.id,
                period,
                baseUrl: `${req.protocol}://${req.get('host')}`,
            });

            await recordAuditEvent({
                prisma,
                workspaceId: req.workspace?.id,
                actorUserId: req.user.id,
                entityType: 'proof_of_income',
                entityId: req.user.id,
                action: 'candidate.proof_of_income_generated',
                metadata: { period, validationHash },
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="blinkfy-proof-of-income-${period}-${Date.now()}.pdf"`);
            res.setHeader('X-Validation-Hash', validationHash);
            res.send(pdfBuffer);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async function getHistory(req, res) {
        try {
            const period = req.query.period || '6m';
            const history = await getIncomeHistory({ userId: req.user.id, period });
            return res.json(history);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async function validateProof(req, res) {
        try {
            const { hash } = req.query;
            if (!hash) return res.status(422).json({ message: 'hash query parameter is required' });

            const userId = req.query.userId;
            const period = req.query.period || '6m';
            const history = await getIncomeHistory({ userId, period });
            const valid = verifyValidationHash(hash, history);
            return res.json({ valid, hash, period });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    return { downloadProof, getHistory, validateProof };
}

module.exports = { createProofOfIncomeController };
