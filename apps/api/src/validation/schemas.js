const { z } = require('zod');
const optionalText = (max = 255) => z.string().trim().max(max).optional();
const registerSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(128), fullName: z.string().trim().min(2).max(160), userType: z.enum(['candidate', 'recruiter', 'company']), githubUsername: optionalText(), linkedinUrl: z.string().url().max(500).optional(), primaryStack: optionalText(), experienceLevel: optionalText(), englishLevel: optionalText(), salaryExpectationUsd: z.coerce.number().int().nonnegative().optional(), taxResidence: optionalText(), taxId: optionalText(), cityState: optionalText(), companyName: optionalText(200), website: z.string().url().max(500).optional(), size: optionalText(), roleTypes: optionalText(), hiringVolume: optionalText(), companyType: z.enum(['agency', 'company']).optional() }).passthrough();
const loginSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) });
const verifyEmailSchema = z.object({ token: z.string().trim().min(16).max(256) });
const jobCreateSchema = z.object({ title: z.string().trim().min(2).max(200), description: optionalText(10000), location: optionalText(), jobType: z.string().trim().min(1).max(80), salaryMinUsd: z.coerce.number().int().nonnegative().optional(), salaryMaxUsd: z.coerce.number().int().nonnegative().optional(), stack: z.array(z.string().trim().min(1).max(80)).max(50).optional() });
const jobApplySchema = z.object({ jobId: z.string().trim().min(1).max(100) });
const companyPatchSchema = z.object({ name: optionalText(200), website: z.string().url().max(500).nullable().optional(), size: optionalText(), roleTypes: optionalText(), hiringVolume: optionalText() }).strict();

const escrowHoldSchema = z.object({
    placementId: z.string().trim().min(1),
    amountUsd: z.coerce.number().positive(),
    currency: z.string().trim().length(3).optional().default('USD'),
    holdReason: z.enum(['success_fee', 'retention_bonus']).optional().default('success_fee'),
    releaseDays: z.coerce.number().int().positive().max(365).optional(),
});

const invoiceCreateSchema = z.object({
    placementId: z.string().trim().min(1).optional(),
    amountUsd: z.coerce.number().positive(),
    amountBrl: z.coerce.number().nonnegative().optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    taxResidence: optionalText(10),
    cnaeCode: z.string().trim().max(20).optional(),
});

const withdrawalSchema = z.object({
    amountUsd: z.coerce.number().positive(),
});

module.exports = {
    registerSchema, loginSchema, verifyEmailSchema, jobCreateSchema, jobApplySchema, companyPatchSchema,
    escrowHoldSchema, invoiceCreateSchema, withdrawalSchema,
};
