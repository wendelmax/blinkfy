import { describe, expect, test } from 'vitest';
import { getClientAnalytics } from '../../src/services/blinkfy/analyticsService.js';

function prismaFixture() {
    const workspaceId = 'workspace-1';
    const clientId = 'client-1';
    const mappedAt = new Date('2026-01-01T00:00:00.000Z');
    const app = (id, stage, consent, score) => ({ id, clientId, jobId: 'job-1', stage, mappedAt, candidate: { consents: consent ? [consent] : [] }, scoreSnapshots: score == null ? [] : [{ score, overrideScore: null, computedAt: mappedAt }] });
    const applications = [
        app('a1', 'reviewed', { purpose: 'client_presentation', revokedAt: null }, 80),
        app('a2', 'shortlisted', { purpose: 'client_presentation', revokedAt: new Date('2026-01-02T00:00:00.000Z') }, 90),
        app('a3', 'mapped', null, null),
        app('a4', 'rejected', null, null),
    ];
    return {
        workspaceId,
        clientId,
        candidateApplication: { findMany: async ({ where }) => applications.filter((item) => item.clientId === where.clientId && (!where.jobId || item.jobId === where.jobId)) },
        auditEvent: { findMany: async () => [
            { entityId: 'a1', action: 'application.stage_changed', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { from: 'mapped', to: 'reviewed' } },
            { entityId: 'a2', action: 'application.stage_changed', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { from: 'mapped', to: 'reviewed' } },
            { entityId: 'a2', action: 'application.stage_changed', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { from: 'reviewed', to: 'interested' } },
            { entityId: 'a2', action: 'application.stage_changed', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { from: 'interested', to: 'screened' } },
            { entityId: 'a2', action: 'application.stage_changed', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { from: 'screened', to: 'shortlisted' } },
            { entityId: 'a2', action: 'application.rejected', createdAt: new Date('2026-01-03T00:00:00.000Z'), metadata: { reason: 'role closed' } },
            { entityId: 'a4', action: 'application.rejected', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: { reason: 'not a fit' } },
        ] },
    };
}

describe('getClientAnalytics', () => {
    test('aggregates stages, conversion, duration, consent and score without private fields', async () => {
        const prisma = prismaFixture();
        const summary = await getClientAnalytics({ prisma, workspaceId: prisma.workspaceId, clientId: prisma.clientId });
        expect(summary.applications).toEqual(expect.objectContaining({ total: 4 }));
        expect(summary.applications.byStage).toMatchObject({ mapped: 4, reviewed: 2, shortlisted: 1, rejected: 2 });
        expect(summary.conversion.mappedToReviewed).toBeCloseTo(0.5, 4);
        expect(summary.stageTime.mapped).toEqual({ averageSeconds: 86400, sampleSize: 3 });
        expect(summary.stageTime.shortlisted).toEqual({ averageSeconds: 86400, sampleSize: 1 });
        expect(summary.consent).toEqual({ active: 1, revoked: 1, missing: 2 });
        expect(summary.score).toEqual({ count: 2, average: 85, minimum: 80, maximum: 90 });
        expect(JSON.stringify(summary)).not.toContain('email');
    });

    test('returns null conversion for an empty denominator and supports job/date scope', async () => {
        const prisma = prismaFixture();
        const summary = await getClientAnalytics({ prisma, workspaceId: prisma.workspaceId, clientId: prisma.clientId, jobId: 'missing-job', from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' });
        expect(summary.applications.total).toBe(0);
        expect(summary.conversion.mappedToReviewed).toBeNull();
        expect(summary.scope).toMatchObject({ jobId: 'missing-job', from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' });
    });
});
