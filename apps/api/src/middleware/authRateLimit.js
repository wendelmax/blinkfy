const rateLimit = require('express-rate-limit');

function createAuthRateLimit({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Too many authentication attempts. Try again later.' },
    });
}

module.exports = { createAuthRateLimit };
