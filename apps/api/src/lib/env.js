/**
 * Environment validation for production readiness.
 */

const { z } = require('zod');

const baseSchema = {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3001'),
    FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
};

function validateEnv() {
    const isProd = process.env.NODE_ENV === 'production';
    const schema = z.object({
        ...baseSchema,
        DATABASE_URL: isProd
            ? z.string().min(1, 'DATABASE_URL is required in production')
            : z.string().min(1).default('postgresql://admin:password@localhost:5432/newone'),
        JWT_SECRET: isProd
            ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
            : z.string().min(1).default('development_secret_change_in_production'),
    }).passthrough();
    const result = schema.safeParse(process.env);
    if (!result.success) {
        const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new Error(`Invalid environment: ${msg}`);
    }
    return result.data;
}

module.exports = { validateEnv };
