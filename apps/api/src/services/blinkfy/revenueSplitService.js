const DEFAULT_RECRUITER_BASIS_POINTS = 7000;
const DEFAULT_PLATFORM_BASIS_POINTS = 3000;
const BASIS_POINT_TOTAL = 10000;

function calculateRevenueSplit({
    currency,
    grossAmountMinor,
    recruiterBasisPoints = DEFAULT_RECRUITER_BASIS_POINTS,
    platformBasisPoints = DEFAULT_PLATFORM_BASIS_POINTS,
}) {
    const normalizedCurrency = typeof currency === 'string' ? currency.toUpperCase() : currency;

    if (typeof normalizedCurrency !== 'string' || !/^[A-Z]{3}$/.test(normalizedCurrency)) {
        throw new TypeError('currency must be a three-letter ISO code');
    }
    if (!Number.isSafeInteger(grossAmountMinor) || grossAmountMinor <= 0) {
        throw new RangeError('grossAmountMinor must be a positive safe integer');
    }
    if (!Number.isSafeInteger(recruiterBasisPoints) || recruiterBasisPoints < 0
        || recruiterBasisPoints > BASIS_POINT_TOTAL) {
        throw new RangeError('recruiterBasisPoints must be an integer from 0 to 10000');
    }
    if (!Number.isSafeInteger(platformBasisPoints) || platformBasisPoints < 0
        || platformBasisPoints > BASIS_POINT_TOTAL) {
        throw new RangeError('platformBasisPoints must be an integer from 0 to 10000');
    }
    if (recruiterBasisPoints + platformBasisPoints !== BASIS_POINT_TOTAL) {
        throw new RangeError('basis points must total 10000');
    }

    const recruiterAmountMinor = Math.floor(grossAmountMinor * recruiterBasisPoints / BASIS_POINT_TOTAL);

    return {
        currency: normalizedCurrency,
        grossAmountMinor,
        recruiterBasisPoints,
        platformBasisPoints,
        recruiterAmountMinor,
        platformAmountMinor: grossAmountMinor - recruiterAmountMinor,
        confirmed: false,
        transferred: false,
    };
}

module.exports = { calculateRevenueSplit };
