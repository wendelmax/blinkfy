const kycService = require('../services/blinkfy/kycVerificationService');

function createKycController({ prisma }) {
    async function initiate(req, res) {
        try {
            const result = await kycService.initiateVerification(req.user.id, {
                triggerReason: req.body.triggerReason,
                verificationType: req.body.verificationType,
            });
            res.status(201).json(result);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to initiate verification' });
        }
    }

    async function submitCapture(req, res) {
        try {
            const result = await kycService.submitCapture(req.user.id, {
                verificationId: req.params.verificationId,
                imageBase64: req.body.imageBase64,
                consentIp: req.ip || req.connection?.remoteAddress,
            });
            res.json(result);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to submit capture' });
        }
    }

    async function getStatus(req, res) {
        try {
            const status = await kycService.getVerificationStatus(req.user.id, req.params.verificationId);
            res.json(status);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get status' });
        }
    }

    async function list(req, res) {
        try {
            const { status, verificationType } = req.query;
            const items = await kycService.listVerifications(req.user.id, { status, verificationType });
            res.json({ items });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to list verifications' });
        }
    }

    async function getKycStatus(req, res) {
        try {
            const kycStatus = await kycService.getCandidateKycStatus(req.user.id);
            res.json(kycStatus);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get KYC status' });
        }
    }

    async function revoke(req, res) {
        try {
            const result = await kycService.revokeVerification(req.user.id, req.params.verificationId);
            res.json(result);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to revoke verification' });
        }
    }

    return { initiate, submitCapture, getStatus, list, getKycStatus, revoke };
}

module.exports = { createKycController };
