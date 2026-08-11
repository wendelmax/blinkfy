import { describe, expect, it, vi } from 'vitest';

const { hashToken, issueSession } = require('../src/services/authSessionService');

describe('auth session service', () => {
    it('hashes tokens deterministically without exposing the raw value', () => {
        const digest = hashToken('token-a');
        expect(digest).toHaveLength(64);
        expect(digest).toBe(hashToken('token-a'));
        expect(digest).not.toBe(hashToken('token-b'));
        expect(digest).not.toContain('token-a');
    });

    it('issues a token with a session id and persists only its hash', async () => {
        const prisma = { session: { create: vi.fn().mockResolvedValue({}) } };
        const user = { id: 'user-1', email: 'candidate@example.com', fullName: 'Candidate', userType: 'candidate' };
        const expiresAt = new Date(Date.now() + 60_000);
        const token = await issueSession(prisma, user, (claims) => JSON.stringify(claims), expiresAt);
        const claims = JSON.parse(token);

        expect(claims).toEqual(expect.objectContaining({ id: 'user-1', sid: expect.any(String) }));
        expect(prisma.session.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                id: claims.sid,
                userId: 'user-1',
                tokenHash: hashToken(token),
                expiresAt,
            }),
        });
    });
});
