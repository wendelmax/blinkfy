/**
 * Payment Service
 * Handles currency conversion and simulated escrow transactions.
 */

const MOCK_EXCHANGE_RATE = 5.42; // USD to BRL

exports.getExchangeRate = async (from = 'USD', to = 'BRL') => {
    return MOCK_EXCHANGE_RATE;
};

exports.calculateNetSalary = (grossUsd) => {
    const grossBrl = grossUsd * MOCK_EXCHANGE_RATE;
    return {
        grossUsd,
        grossBrl,
        exchangeRate: MOCK_EXCHANGE_RATE
    };
};

exports.holdInEscrow = async (amountUsd, jobId, recruiterId) => {
    // Simulates holding funds until retention milestone (90 days)
    return {
        transactionId: `esc_${Math.random().toString(36).substr(2, 9)}`,
        amountUsd,
        status: 'HELD_IN_ESCROW',
        releaseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
};
