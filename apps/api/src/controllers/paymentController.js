const paymentService = require('../services/paymentService');
const taxService = require('../services/taxService');

exports.getWalletSummary = async (req, res) => {
    try {
        const { salaryUsd } = req.query;
        const data = await paymentService.getWalletSummaryForUser(req.user.id, salaryUsd);
        res.json(data);
    } catch (err) {
        console.error('getWalletSummary error:', err);
        res.status(500).json({ message: 'Failed to load wallet' });
    }
};

exports.getRecruiterEarnings = async (req, res) => {
    try {
        const data = await paymentService.getRecruiterEarnings(req.user.id);
        res.json(data);
    } catch (err) {
        console.error('getRecruiterEarnings error:', err);
        res.status(500).json({ message: 'Failed to load earnings' });
    }
};
