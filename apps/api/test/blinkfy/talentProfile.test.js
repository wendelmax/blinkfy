const { PrismaClient } = require('@prisma/client');
const { getCandidateProfile, updateCandidateProfile, setCandidateVisibility } = require('../../src/services/blinkfy/talentProfileService');

const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function context(label) {
    const user = await prisma.user.create({
        data: { email: `talent-${label}-${runId}@example.test`, fullName: 'Talent Candidate', userType: 'candidate' },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Talent ${label} ${runId}` } });
    const candidate = await prisma.candidate.create({
        data: { workspaceId: workspace.id, userId: user.id, fullName: user.fullName, profile: {} },
    });
    return { user, workspace, candidate };
}

afterAll(() => prisma.$disconnect());

test('creates a private-by-default candidate profile and returns only safe fields', async () => {
    const { user, workspace } = await context('private');
    const profile = await getCandidateProfile({ prisma, userId: user.id, workspaceId: workspace.id });
    expect(profile).toMatchObject({ userId: user.id, visibility: 'private', skills: [] });
    expect(profile).not.toHaveProperty('normalizedEmail');
});

test('updates editable profile fields and rejects protected matching attributes', async () => {
    const { user, workspace } = await context('editable');
    const updated = await updateCandidateProfile({
        prisma, userId: user.id, workspaceId: workspace.id,
        updates: { targetRole: 'Account Executive', headline: 'B2B seller', skills: ['enterprise sales'] },
    });
    expect(updated).toMatchObject({ targetRole: 'Account Executive', skills: ['enterprise sales'] });
    await expect(updateCandidateProfile({ prisma, userId: user.id, workspaceId: workspace.id, updates: { age: 42 } }))
        .rejects.toThrow(/protected/i);
});

test('allows visibility transitions and audits profile/visibility mutations', async () => {
    const { user, workspace, candidate } = await context('visibility');
    await setCandidateVisibility({ prisma, userId: user.id, workspaceId: workspace.id, visibility: 'available' });
    await setCandidateVisibility({ prisma, userId: user.id, workspaceId: workspace.id, visibility: 'recruiters_only' });
    await expect(setCandidateVisibility({ prisma, userId: user.id, workspaceId: workspace.id, visibility: 'public' }))
        .rejects.toThrow(/invalid/i);
    const events = await prisma.auditEvent.findMany({ where: { workspaceId: workspace.id, entityId: candidate.id }, orderBy: { createdAt: 'asc' } });
    expect(events.map((event) => event.action)).toEqual(expect.arrayContaining(['candidate.visibility_changed']));
});
