const escrowService = require('../services/blinkfy/escrowService');
const invoiceService = require('../services/blinkfy/invoiceService');
const platformFeeService = require('../services/blinkfy/platformFeeService');
const paymentService = require('../services/paymentService');
const { createNfeEmission } = require('../services/blinkfy/nfeEmissionService');

exports.getEscrowSummary = async (req, res) => {
    try {
        const summary = await escrowService.getEscrowSummary(req.user.id);
        res.json(summary);
    } catch (err) {
        console.error('getEscrowSummary error:', err);
        res.status(500).json({ message: 'Failed to load escrow summary' });
    }
};

exports.listEscrowHolds = async (req, res) => {
    try {
        const { status, holdReason } = req.query;
        const holds = await escrowService.listEscrowHolds({ status, holdReason });
        res.json({ holds });
    } catch (err) {
        console.error('listEscrowHolds error:', err);
        res.status(500).json({ message: 'Failed to list escrow holds' });
    }
};

exports.createEscrowHold = async (req, res) => {
    try {
        const { placementId, amountUsd, currency, holdReason, releaseDays } = req.body;
        const hold = await escrowService.createEscrowHold({ placementId, amountUsd, currency, holdReason, releaseDays });
        res.status(201).json(hold);
    } catch (err) {
        console.error('createEscrowHold error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.releaseEscrowHold = async (req, res) => {
    try {
        const { holdId } = req.params;
        const hold = await escrowService.releaseEscrowHold(holdId);
        res.json(hold);
    } catch (err) {
        console.error('releaseEscrowHold error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.forfeitEscrowHold = async (req, res) => {
    try {
        const { holdId } = req.params;
        const hold = await escrowService.forfeitEscrowHold(holdId);
        res.json(hold);
    } catch (err) {
        console.error('forfeitEscrowHold error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.processReleases = async (req, res) => {
    try {
        const released = await escrowService.processEligibleReleases();
        res.json({ released: released.length, holds: released });
    } catch (err) {
        console.error('processReleases error:', err);
        res.status(500).json({ message: 'Failed to process releases' });
    }
};

exports.getInvoiceSummary = async (req, res) => {
    try {
        const summary = await invoiceService.getInvoiceSummary(req.user.id);
        res.json(summary);
    } catch (err) {
        console.error('getInvoiceSummary error:', err);
        res.status(500).json({ message: 'Failed to load invoice summary' });
    }
};

exports.listInvoices = async (req, res) => {
    try {
        const { status } = req.query;
        const invoices = await invoiceService.listInvoices(req.user.id, { status });
        res.json({ invoices });
    } catch (err) {
        console.error('listInvoices error:', err);
        res.status(500).json({ message: 'Failed to list invoices' });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { placementId, amountUsd, amountBrl, exchangeRate, taxResidence, cnaeCode } = req.body;
        const invoice = await invoiceService.createInvoice({
            userId: req.user.id,
            placementId,
            amountUsd,
            amountBrl,
            exchangeRate,
            taxResidence,
            cnaeCode,
        });
        res.status(201).json(invoice);
    } catch (err) {
        console.error('createInvoice error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.issueInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoiceService.issueInvoice(invoiceId);
        res.json(invoice);
    } catch (err) {
        console.error('issueInvoice error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.markInvoicePaid = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoiceService.markInvoicePaid(invoiceId);

        if (invoice.taxResidence === 'brazil' || !invoice.taxResidence) {
            try {
                await createNfeEmission({ invoiceId: invoice.id, userId: invoice.userId });
            } catch (nfeError) {
                console.warn('NF-e auto-creation skipped:', nfeError.message);
            }
        }

        res.json(invoice);
    } catch (err) {
        console.error('markInvoicePaid error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.voidInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoiceService.voidInvoice(invoiceId);
        res.json(invoice);
    } catch (err) {
        console.error('voidInvoice error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amountUsd } = req.body;
        if (!amountUsd || amountUsd <= 0) {
            return res.status(400).json({ message: 'amountUsd must be positive' });
        }
        if (amountUsd < escrowService.MIN_WITHDRAWAL_USD) {
            return res.status(400).json({ message: `Minimum withdrawal is $${escrowService.MIN_WITHDRAWAL_USD}` });
        }

        const escrowSummary = await escrowService.getEscrowSummary(req.user.id);
        if (escrowSummary.totalHeldUsd > 0 && amountUsd > (escrowSummary.totalHeldUsd * 0.5)) {
            return res.status(400).json({
                message: 'Withdrawal exceeds 50% of held escrow. Wait for escrow to release or reduce amount.',
                heldUsd: escrowSummary.totalHeldUsd,
            });
        }

        const wallet = await paymentService.getWalletSummaryForUser(req.user.id, 0);
        const available = wallet.wallet.availableForWithdrawal;
        if (amountUsd > available) {
            return res.status(400).json({
                message: `Insufficient balance. Available: $${available.toFixed(2)}`,
                available,
            });
        }

        const tx = await paymentService.createWalletTransaction(req.user.id, {
            type: 'withdrawal',
            amountUsd,
            description: `Withdrawal requested by ${req.user.email || req.user.id}`,
            status: 'pending',
        });

        res.status(201).json({
            withdrawal: {
                id: tx.id,
                amountUsd: tx.amountUsd,
                status: tx.status,
                createdAt: tx.createdAt,
            },
            escrowWarning: escrowSummary.totalHeldUsd > 0
                ? { heldUsd: escrowSummary.totalHeldUsd, nextRelease: escrowSummary.nextReleaseDate }
                : null,
        });
    } catch (err) {
        console.error('requestWithdrawal error:', err);
        res.status(500).json({ message: 'Failed to process withdrawal' });
    }
};

exports.listPendingFees = async (req, res) => {
    try {
        const fees = await platformFeeService.listPendingFees();
        res.json({ fees });
    } catch (err) {
        console.error('listPendingFees error:', err);
        res.status(500).json({ message: 'Failed to list pending fees' });
    }
};
