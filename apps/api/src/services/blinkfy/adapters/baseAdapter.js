const crypto = require('crypto');

class RateLimiter {
    constructor(rpm) {
        this.rpm = rpm;
        this.windowMs = 60 * 1000;
        this.timestamps = [];
    }

    async acquire() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        if (this.timestamps.length >= this.rpm) {
            const waitMs = this.timestamps[0] + this.windowMs - now;
            throw Object.assign(new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitMs / 1000)}s`), { code: 'RATE_LIMITED', retryAfterMs: waitMs });
        }
        this.timestamps.push(now);
    }
}

class IntegrationAdapter {
    constructor({ provider, category, config = {} }) {
        this.provider = provider;
        this.category = category;
        this.config = config;
        this.rateLimiter = new RateLimiter(config.rateLimitRpm || 60);
    }

    generateIdempotencyKey(action, payload) {
        const hash = crypto.createHash('sha256')
            .update(JSON.stringify({ action, payload, timestamp: Date.now() }))
            .digest('hex')
            .slice(0, 16);
        return `${this.provider}_${action}_${hash}`;
    }

    async checkKillSwitch(killSwitchEnabled) {
        if (killSwitchEnabled) {
            throw Object.assign(new Error(`Kill switch is active for ${this.provider}. External calls blocked.`), { code: 'KILL_SWITCH' });
        }
    }

    async executeWithSafety({ action, payload, killSwitch, maxRetries = 3 }) {
        await this.checkKillSwitch(killSwitch);
        await this.rateLimiter.acquire();

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.executeAction(action, payload);
                return { success: true, result, attempts: attempt + 1 };
            } catch (error) {
                lastError = error;
                if (error.code === 'RATE_LIMITED' && error.retryAfterMs) {
                    await new Promise(r => setTimeout(r, Math.min(error.retryAfterMs, 5000)));
                } else if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 5000)));
                }
            }
        }

        return { success: false, error: lastError.message, attempts: maxRetries + 1 };
    }

    async executeAction(action, payload) {
        throw new Error(`Provider "${this.provider}" does not implement executeAction()`);
    }
}

module.exports = { IntegrationAdapter, RateLimiter };
