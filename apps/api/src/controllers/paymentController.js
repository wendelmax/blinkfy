const paymentService = require('../services/paymentService');
const taxService = require('../services/taxService');

exports.getWalletSummary = async (req, res) => {
    const { salaryUsd } = req.query;
    const amount = parseFloat(salaryUsd) || 5000;

    const currencyData = paymentService.calculateNetSalary(amount);
    const taxData = taxService.calculateBrazilTaxes(currencyData.grossBrl);

    res.json({
        wallet: {
            balanceUsd: amount,
            availableForWithdrawal: amount * 0.9, // 10% safety buffer
            pendingEscrow: 0
        },
        projections: {
            ...currencyData,
            ...taxData
        },
        fees: {
            platformSpread: 0.02, // 2% exchange spread
            transferFeeUsd: 15
        }
    });
};

exports.getRecruiterEarnings = async (req, res) => {
    // Mock earning report
    res.json({
        totalEarned: 12450,
        pendingRetention: 2400,
        nextPayout: '2026-03-01',
        transactions: [
            { id: 'tx_1', date: '2026-02-01', candidate: 'Eduardo Silva', amount: 1200, status: 'PAID' },
            { id: 'tx_2', date: '2026-02-15', candidate: 'Mariana Costa', amount: 800, status: 'PENDING_RETENTION' }
        ]
    });
};
