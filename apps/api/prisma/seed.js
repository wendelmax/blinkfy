const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const techStacks = [
    'Fullstack (Node/React)',
    'Backend (Java/Spring)',
    'Backend (Go)',
    'Backend (Python/Django)',
    'Backend (Node.js)',
    'Frontend (React)',
    'Frontend (Vue.js)',
    'Frontend (Angular)',
    'Mobile (React Native)',
    'Mobile (Flutter)',
    'DevOps (AWS/Terraform)',
    'Data Science (Python)',
    'Data Engineering (Spark/Kafka)',
];

const marketRates = [
    { roleLabel: 'Senior Backend', salaryAvgUsd: 8000 },
    { roleLabel: 'Senior Frontend', salaryAvgUsd: 7500 },
    { roleLabel: 'Mid Backend', salaryAvgUsd: 5500 },
    { roleLabel: 'Junior', salaryAvgUsd: 3500 },
];

async function main() {
    console.log('Seeding tech stacks...');
    for (const name of techStacks) {
        await prisma.techStack.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Seeding market rates...');
    const existingRates = await prisma.marketRate.count();
    if (existingRates === 0) {
        for (const r of marketRates) {
            await prisma.marketRate.create({ data: r });
        }
    }
    await seedDemoPilot();
    console.log('Seeding finished.');
}

async function seedDemoPilot() {
    const now = new Date('2026-08-01T12:00:00.000Z');
    const workspace = await prisma.workspace.upsert({ where: { id: 'demo-m1-workspace' }, update: { name: 'Blinkfy M1 Demo Pilot' }, create: { id: 'demo-m1-workspace', name: 'Blinkfy M1 Demo Pilot' } });
    for (let index = 1; index <= 5; index += 1) {
        const recruiter = await prisma.user.upsert({ where: { email: `demo-recruiter-${index}@blinkfy.test` }, update: { fullName: `Demo Recruiter ${index}` }, create: { id: `demo-recruiter-${index}`, email: `demo-recruiter-${index}@blinkfy.test`, fullName: `Demo Recruiter ${index}`, userType: 'recruiter', emailVerified: true } });
        await prisma.workspaceMembership.upsert({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: recruiter.id } }, update: { role: 'recruiter' }, create: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' } });
        const client = await prisma.client.upsert({ where: { id: `demo-m1-client-${index}` }, update: { name: `Demo Company ${index}` }, create: { id: `demo-m1-client-${index}`, workspaceId: workspace.id, name: `Demo Company ${index}` } });
        const job = await prisma.blinkfyJob.upsert({ where: { id: `demo-m1-job-${index}` }, update: {}, create: { id: `demo-m1-job-${index}`, clientId: client.id, title: ['Senior Backend Engineer', 'Account Executive', 'Product Designer', 'Data Engineer', 'Customer Success Lead'][index - 1], description: 'Synthetic M1 pilot vacancy for product validation.', requirements: ['communication', 'relevant experience'], status: 'open', scorecard: { create: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 } } } });
        for (let candidateIndex = 1; candidateIndex <= 3; candidateIndex += 1) {
            const candidate = await prisma.candidate.upsert({ where: { id: `demo-m1-candidate-${index}-${candidateIndex}` }, update: {}, create: { id: `demo-m1-candidate-${index}-${candidateIndex}`, workspaceId: workspace.id, fullName: `Demo Candidate ${index}.${candidateIndex}`, normalizedEmail: `demo-candidate-${index}-${candidateIndex}@blinkfy.test`, profile: { currentTitle: 'Experienced professional', experienceYears: 5 + candidateIndex, skills: ['communication', 'relevant experience'], source: 'm1-demo-pilot' }, skills: ['communication', 'relevant experience'], targetRole: job.title, visibility: 'available' } });
            await prisma.candidateConsent.upsert({ where: { id: `demo-m1-consent-${index}-${candidateIndex}` }, update: { revokedAt: candidateIndex === 3 ? new Date('2026-08-05T12:00:00.000Z') : null }, create: { id: `demo-m1-consent-${index}-${candidateIndex}`, candidateId: candidate.id, workspaceId: workspace.id, clientId: client.id, purpose: 'client_presentation', evidence: 'Synthetic consent for M1 demo pilot.', grantedAt: now, revokedAt: candidateIndex === 3 ? new Date('2026-08-05T12:00:00.000Z') : null } });
            const stage = candidateIndex === 1 ? 'shortlisted' : candidateIndex === 2 ? 'screened' : 'mapped';
            const application = await prisma.candidateApplication.upsert({ where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } }, update: { stage }, create: { candidateId: candidate.id, clientId: client.id, jobId: job.id, stage, mappedAt: now, reviewedAt: stage !== 'mapped' ? new Date(now.getTime() + 86400000) : null, interestedAt: ['screened', 'shortlisted'].includes(stage) ? new Date(now.getTime() + 172800000) : null, screenedAt: ['screened', 'shortlisted'].includes(stage) ? new Date(now.getTime() + 259200000) : null, shortlistedAt: stage === 'shortlisted' ? new Date(now.getTime() + 345600000) : null } });
            await prisma.fitScoreSnapshot.upsert({ where: { id: `demo-m1-score-${index}-${candidateIndex}` }, update: { score: 70 + candidateIndex * 8 }, create: { id: `demo-m1-score-${index}-${candidateIndex}`, applicationId: application.id, score: 70 + candidateIndex * 8, confidence: candidateIndex === 1 ? 'high' : 'medium', policyVersion: 'fit-score-v1', factors: [{ key: 'skills', score: 1 }], gaps: candidateIndex === 3 ? ['consent revoked'] : [] } });
        }
        await prisma.auditEvent.create({ data: { workspaceId: workspace.id, clientId: client.id, actorUserId: recruiter.id, entityType: 'm1_demo_pilot', entityId: job.id, action: 'demo.pilot.seeded', metadata: { source: 'synthetic', companyIndex: index } } });
    }
    console.log('Seeded synthetic M1 pilot: 5 companies, 5 recruiters, 15 candidates, 15 applications.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
