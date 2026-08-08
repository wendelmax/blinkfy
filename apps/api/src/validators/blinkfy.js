const { z } = require('zod');

const defaultScorecardWeights = Object.freeze({
    skills: 35,
    experience: 25,
    context: 15,
    preferences: 15,
    signals: 10,
});

const optionalText = z.string().trim().min(1).nullable().optional();
const optionalSalary = z.number().int().nonnegative().nullable().optional();

const scorecardWeightsSchema = z.object({
    skills: z.number().int().nonnegative(),
    experience: z.number().int().nonnegative(),
    context: z.number().int().nonnegative(),
    preferences: z.number().int().nonnegative(),
    signals: z.number().int().nonnegative(),
}).superRefine((weights, context) => {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (total !== 100) {
        context.addIssue({ code: 'custom', path: [], message: 'Scorecard weights must sum to 100' });
    }
});

const jobInputSchema = z.object({
    title: z.string().trim().min(1),
    description: optionalText,
    location: optionalText,
    workModel: optionalText,
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    requirements: z.array(z.string().trim().min(1)).min(1),
    weights: scorecardWeightsSchema,
}).superRefine((job, context) => {
    if (job.salaryMin != null && job.salaryMax != null && job.salaryMax < job.salaryMin) {
        context.addIssue({ code: 'custom', path: ['salaryMax'], message: 'salaryMax must be greater than or equal to salaryMin' });
    }
});

function formatZodErrors(error) {
    return error.issues.map((issue) => ({
        path: issue.path.join('.') || 'weights',
        message: issue.message,
    }));
}

function parseJobInput(input) {
    const parsed = jobInputSchema.safeParse(input);
    if (parsed.success) {
        return { success: true, data: parsed.data };
    }
    return { success: false, errors: formatZodErrors(parsed.error) };
}

module.exports = {
    defaultScorecardWeights,
    jobInputSchema,
    parseJobInput,
    formatZodErrors,
};
