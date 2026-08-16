const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function errorDiagnostic(error) {
    return [error?.message, error?.meta?.constraint, error?.meta?.field_name, error?.meta?.database_error]
        .filter(Boolean)
        .join('\n');
}

function exactConstraintFrom(error) {
    const diagnostic = errorDiagnostic(error);
    const patterns = [
        /constraint violated: `([^`]+?)(?: \(index\))?`/,
        /constraint (?:\\)?[`"]([^`"\\]+)(?:\\)?[`"]/,
        /constraint [`"]([^`"]+)[`"]/,
        /field: `([^`]+?)(?: \(index\))?`/,
        /constraint: ([^\s,]+)/,
    ];
    for (const pattern of patterns) {
        const match = diagnostic.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function expectRestrictConstraint(operation, constraintName) {
    try {
        await operation();
        throw new Error(`Expected RESTRICT constraint ${constraintName} to reject the operation`);
    } catch (error) {
        if (error.message?.startsWith('Expected RESTRICT constraint')) throw error;

        const diagnostic = errorDiagnostic(error);
        const isPg15P2003 = error.code === 'P2003';
        const isPg15Unknown23503 = error.name === 'PrismaClientUnknownRequestError'
            && /(?:(?:code|Code):\s*[`"]?23503[`"]?|SQLSTATE\s*23503)/.test(diagnostic);
        const isPg18Unknown23001 = error.name === 'PrismaClientUnknownRequestError'
            && /(?:(?:code|Code):\s*[`"]?23001[`"]?|SQLSTATE\s*23001)/.test(diagnostic);

        expect(
            isPg15P2003 || isPg15Unknown23503 || isPg18Unknown23001,
            `Unexpected RESTRICT error shape: name=${error.name} code=${error.code} diagnostic=${diagnostic}`,
        ).toBe(true);
        expect(
            exactConstraintFrom(error),
            `Expected exact constraint ${constraintName} in: ${diagnostic}`,
        ).toBe(constraintName);
    }
}

async function expectNamedConstraint(operation, constraintName) {
    try {
        await operation();
        throw new Error(`Expected constraint ${constraintName} to reject the operation`);
    } catch (error) {
        if (error.message?.startsWith('Expected constraint')) throw error;
        expect(errorDiagnostic(error)).toContain(constraintName);
    }
}

async function createTenant(label = 'tenant') {
    const suffix = `${runId}-${label}-${Math.random().toString(16).slice(2)}`;
    const recruiter = await prisma.user.create({
        data: {
            email: `revenue-${suffix}@example.test`,
            fullName: `Revenue Recruiter ${label}`,
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Revenue Workspace ${suffix}` } });
    const membership = await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
    });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: `Revenue Client ${suffix}` },
    });
    const candidate = await prisma.candidate.create({
        data: {
            workspaceId: workspace.id,
            fullName: `Revenue Candidate ${label}`,
            normalizedEmail: `candidate-${suffix}@example.test`,
            profile: {},
        },
    });
    const application = await prisma.candidateApplication.create({
        data: { candidateId: candidate.id, clientId: client.id, stage: 'shortlisted' },
    });

    return { recruiter, workspace, membership, client, candidate, application };
}

async function createPlacement(context, overrides = {}) {
    return prisma.marketplacePlacement.create({
        data: {
            workspaceId: context.workspace.id,
            clientId: context.client.id,
            applicationId: context.application.id,
            recruiterUserId: context.recruiter.id,
            ...overrides,
        },
    });
}

async function createAllocation(context, placement, overrides = {}) {
    return prisma.placementRevenueAllocation.create({
        data: {
            workspaceId: context.workspace.id,
            clientId: context.client.id,
            placementId: placement.id,
            recruiterUserId: context.recruiter.id,
            currency: 'BRL',
            grossAmountMinor: 101,
            recruiterAmountMinor: 70,
            platformAmountMinor: 31,
            ...overrides,
        },
    });
}

async function createLedgerEntry(allocation, overrides = {}) {
    return prisma.placementRevenueLedgerEntry.create({
        data: {
            allocationId: allocation.id,
            kind: 'allocation',
            recruiterAmountMinor: allocation.recruiterAmountMinor,
            platformAmountMinor: allocation.platformAmountMinor,
            currency: allocation.currency,
            ...overrides,
        },
    });
}

afterAll(async () => {
    await prisma.$disconnect();
});

test('stores exact lifecycle values and applies financial defaults in PostgreSQL', async () => {
    const context = await createTenant('defaults');
    const hiredCandidate = await prisma.candidate.create({
        data: {
            workspaceId: context.workspace.id,
            fullName: 'Hired Candidate',
            normalizedEmail: `hired-${runId}@example.test`,
            profile: {},
        },
    });
    const hiredAt = new Date();
    const hiredApplication = await prisma.candidateApplication.create({
        data: { candidateId: hiredCandidate.id, clientId: context.client.id, stage: 'hired', hiredAt },
    });
    expect(hiredApplication).toMatchObject({ stage: 'hired', hiredAt });

    const placement = await createPlacement(context);
    const allocation = await createAllocation(context, placement);
    await expect(createPlacement(context)).rejects.toMatchObject({ code: 'P2002' });

    expect(placement.status).toBe('confirmed');
    expect(allocation).toMatchObject({
        recruiterUserId: context.recruiter.id,
        status: 'pending',
        recruiterBasisPoints: 7000,
        platformBasisPoints: 3000,
        recruiterAmountMinor: 70,
        platformAmountMinor: 31,
        availableAt: null,
        reversedAt: null,
    });
});

test('rejects workspace, client, application, and recruiter membership mismatches on placements', async () => {
    const first = await createTenant('placement-first');
    const second = await createTenant('placement-second');

    await expectNamedConstraint(
        () => createPlacement(first, { workspaceId: second.workspace.id }),
        'marketplace_placements_workspace_client_fkey',
    );
    await expectNamedConstraint(
        () => createPlacement(first, { applicationId: second.application.id }),
        'marketplace_placements_client_application_fkey',
    );
    await expectNamedConstraint(
        () => createPlacement(first, { recruiterUserId: second.recruiter.id }),
        'marketplace_placements_workspace_recruiter_fkey',
    );
});

test('rejects allocation tenant fields that do not match its placement', async () => {
    const first = await createTenant('allocation-first');
    const second = await createTenant('allocation-second');
    const placement = await createPlacement(first);

    await expectNamedConstraint(
        () => createAllocation(second, placement),
        'revenue_allocations_placement_tenant_fkey',
    );
});

test('enforces allocation uniqueness, basis-point bounds, deterministic split, residual, and uppercase currency', async () => {
    const duplicateContext = await createTenant('allocation-duplicate');
    const duplicatePlacement = await createPlacement(duplicateContext);
    await createAllocation(duplicateContext, duplicatePlacement);
    await expect(createAllocation(duplicateContext, duplicatePlacement)).rejects.toMatchObject({ code: 'P2002' });

    const invalidCases = [
        ['revenue_allocations_gross_positive_check', { grossAmountMinor: 0, recruiterAmountMinor: 0, platformAmountMinor: 0 }],
        ['revenue_allocations_recruiter_bps_range_check', { recruiterBasisPoints: -1, platformBasisPoints: 3000 }],
        ['revenue_allocations_platform_bps_range_check', { recruiterBasisPoints: 7000, platformBasisPoints: 10001 }],
        ['revenue_allocations_basis_points_total_check', { recruiterBasisPoints: 7000, platformBasisPoints: 2999 }],
        ['revenue_allocations_amounts_nonnegative_check', { recruiterAmountMinor: -1, platformAmountMinor: 102 }],
        ['revenue_allocations_amounts_total_check', { recruiterAmountMinor: 70, platformAmountMinor: 30 }],
        ['revenue_allocations_recruiter_split_check', { recruiterAmountMinor: 71, platformAmountMinor: 30 }],
        ['revenue_allocations_currency_uppercase_check', { currency: 'brl' }],
        ['revenue_allocations_status_timestamps_check', { status: 'available' }],
    ];

    for (const [constraintName, overrides] of invalidCases) {
        const context = await createTenant(constraintName);
        const placement = await createPlacement(context);
        await expectNamedConstraint(() => createAllocation(context, placement, overrides), constraintName);
    }
});

test('enforces same-currency ledger entries, amount signs, and one entry of each kind', async () => {
    const context = await createTenant('ledger-constraints');
    const placement = await createPlacement(context);
    const allocation = await createAllocation(context, placement);

    await expectNamedConstraint(
        () => createLedgerEntry(allocation, { currency: 'USD' }),
        'revenue_ledger_allocation_currency_fkey',
    );
    await expectNamedConstraint(
        () => createLedgerEntry(allocation, { recruiterAmountMinor: -70, platformAmountMinor: -31 }),
        'revenue_ledger_amount_sign_check',
    );
    await expectNamedConstraint(
        () => createLedgerEntry(allocation, { recruiterAmountMinor: 69, platformAmountMinor: 32 }),
        'revenue_ledger_amounts_match_allocation_check',
    );

    await createLedgerEntry(allocation);
    await expect(createLedgerEntry(allocation)).rejects.toMatchObject({ code: 'P2002' });

    await createLedgerEntry(allocation, {
        kind: 'reversal',
        recruiterAmountMinor: -70,
        platformAmountMinor: -31,
    });
    await expect(createLedgerEntry(allocation, {
        kind: 'reversal',
        recruiterAmountMinor: -70,
        platformAmountMinor: -31,
    })).rejects.toMatchObject({ code: 'P2002' });
});

test('makes ledger rows append-only and allocation financial evidence immutable after ledger creation', async () => {
    const context = await createTenant('immutability');
    const placement = await createPlacement(context);
    let allocation = await createAllocation(context, placement);

    allocation = await prisma.placementRevenueAllocation.update({
        where: { id: allocation.id },
        data: { grossAmountMinor: 202, recruiterAmountMinor: 141, platformAmountMinor: 61 },
    });
    const ledgerEntry = await createLedgerEntry(allocation);

    const otherContext = await createTenant('immutability-other-tenant');
    const otherPlacement = await createPlacement(otherContext);
    const immutableUpdates = [
        {
            grossAmountMinor: 303,
            recruiterAmountMinor: 212,
            platformAmountMinor: 91,
        },
        { currency: 'USD' },
        {
            workspaceId: otherContext.workspace.id,
            clientId: otherContext.client.id,
            placementId: otherPlacement.id,
            recruiterUserId: otherContext.recruiter.id,
        },
        {
            recruiterBasisPoints: 6000,
            platformBasisPoints: 4000,
            recruiterAmountMinor: 121,
            platformAmountMinor: 81,
        },
    ];
    for (const data of immutableUpdates) {
        await expectNamedConstraint(
            () => prisma.placementRevenueAllocation.update({
                where: { id: allocation.id },
                data,
            }),
            'revenue_allocation_financial_fields_immutable',
        );
    }

    const unchanged = await prisma.placementRevenueAllocation.findUniqueOrThrow({
        where: { id: allocation.id },
    });
    expect(unchanged).toMatchObject({
        workspaceId: context.workspace.id,
        clientId: context.client.id,
        placementId: placement.id,
        recruiterUserId: context.recruiter.id,
        currency: 'BRL',
        grossAmountMinor: 202,
        recruiterBasisPoints: 7000,
        platformBasisPoints: 3000,
        recruiterAmountMinor: 141,
        platformAmountMinor: 61,
    });

    const reversedAt = new Date();
    const reversed = await prisma.placementRevenueAllocation.update({
        where: { id: allocation.id },
        data: { status: 'reversed', reversedAt },
    });
    expect(reversed.status).toBe('reversed');
    expect(reversed.reversedAt).toEqual(reversedAt);

    await expectNamedConstraint(
        () => prisma.placementRevenueLedgerEntry.update({
            where: { id: ledgerEntry.id },
            data: { createdAt: new Date(Date.now() + 1000) },
        }),
        'revenue_ledger_entries_append_only',
    );
    await expectNamedConstraint(
        () => prisma.placementRevenueLedgerEntry.delete({ where: { id: ledgerEntry.id } }),
        'revenue_ledger_entries_append_only',
    );
});

test('serializes a ledger insert against a concurrent allocation financial update', async () => {
    const context = await createTenant('concurrency');
    const placement = await createPlacement(context);
    const allocation = await createAllocation(context, placement);
    const updateClient = new PrismaClient();
    const insertClient = new PrismaClient();
    let releaseUpdate;
    let signalUpdateLocked;
    const updateLocked = new Promise((resolve) => {
        signalUpdateLocked = resolve;
    });
    const updateRelease = new Promise((resolve) => {
        releaseUpdate = resolve;
    });
    let updateTransaction;
    let insertOutcomePromise;

    try {
        updateTransaction = updateClient.$transaction(async (tx) => {
            const updated = await tx.placementRevenueAllocation.update({
                where: { id: allocation.id },
                data: {
                    grossAmountMinor: 202,
                    recruiterBasisPoints: 6000,
                    platformBasisPoints: 4000,
                    recruiterAmountMinor: 121,
                    platformAmountMinor: 81,
                },
            });
            signalUpdateLocked();
            await updateRelease;
            return updated;
        });
        await updateLocked;

        insertOutcomePromise = insertClient.placementRevenueLedgerEntry.create({
            data: {
                allocationId: allocation.id,
                kind: 'allocation',
                recruiterAmountMinor: allocation.recruiterAmountMinor,
                platformAmountMinor: allocation.platformAmountMinor,
                currency: allocation.currency,
            },
        }).then(
            (value) => ({ status: 'fulfilled', value }),
            (error) => ({ status: 'rejected', error }),
        );

        const beforeRelease = await Promise.race([
            insertOutcomePromise,
            new Promise((resolve) => setTimeout(() => resolve({ status: 'blocked' }), 100)),
        ]);
        releaseUpdate();
        const updated = await updateTransaction;
        const insertOutcome = beforeRelease.status === 'blocked'
            ? await insertOutcomePromise
            : beforeRelease;

        expect(beforeRelease.status).toBe('blocked');
        expect(insertOutcome.status).toBe('rejected');
        expect(errorDiagnostic(insertOutcome.error)).toContain(
            'revenue_ledger_amounts_match_allocation_check',
        );
        expect(updated).toMatchObject({
            grossAmountMinor: 202,
            recruiterBasisPoints: 6000,
            platformBasisPoints: 4000,
            recruiterAmountMinor: 121,
            platformAmountMinor: 81,
        });
        await expect(prisma.placementRevenueLedgerEntry.count({
            where: { allocationId: allocation.id },
        })).resolves.toBe(0);
    } finally {
        releaseUpdate?.();
        await Promise.allSettled([updateTransaction, insertOutcomePromise].filter(Boolean));
        await Promise.all([updateClient.$disconnect(), insertClient.$disconnect()]);
    }
});

test('rejects a financial update that waits behind a concurrent ledger insert', async () => {
    const context = await createTenant('concurrency-ledger-first');
    const placement = await createPlacement(context);
    const allocation = await createAllocation(context, placement);
    const insertClient = new PrismaClient();
    const updateClient = new PrismaClient();
    let releaseInsert;
    let signalInsertLocked;
    const insertLocked = new Promise((resolve) => {
        signalInsertLocked = resolve;
    });
    const insertRelease = new Promise((resolve) => {
        releaseInsert = resolve;
    });
    let insertTransaction;
    let updateOutcomePromise;

    try {
        insertTransaction = insertClient.$transaction(async (tx) => {
            const ledgerEntry = await tx.placementRevenueLedgerEntry.create({
                data: {
                    allocationId: allocation.id,
                    kind: 'allocation',
                    recruiterAmountMinor: allocation.recruiterAmountMinor,
                    platformAmountMinor: allocation.platformAmountMinor,
                    currency: allocation.currency,
                },
            });
            signalInsertLocked();
            await insertRelease;
            return ledgerEntry;
        });
        await insertLocked;

        updateOutcomePromise = updateClient.placementRevenueAllocation.update({
            where: { id: allocation.id },
            data: {
                grossAmountMinor: 202,
                recruiterBasisPoints: 6000,
                platformBasisPoints: 4000,
                recruiterAmountMinor: 121,
                platformAmountMinor: 81,
            },
        }).then(
            (value) => ({ status: 'fulfilled', value }),
            (error) => ({ status: 'rejected', error }),
        );

        const beforeRelease = await Promise.race([
            updateOutcomePromise,
            new Promise((resolve) => setTimeout(() => resolve({ status: 'blocked' }), 100)),
        ]);
        releaseInsert();
        const ledgerEntry = await insertTransaction;
        const updateOutcome = beforeRelease.status === 'blocked'
            ? await updateOutcomePromise
            : beforeRelease;

        expect(beforeRelease.status).toBe('blocked');
        expect(updateOutcome.status).toBe('rejected');
        expect(errorDiagnostic(updateOutcome.error)).toContain(
            'revenue_allocation_financial_fields_immutable',
        );
        expect(ledgerEntry).toMatchObject({
            allocationId: allocation.id,
            recruiterAmountMinor: 70,
            platformAmountMinor: 31,
            currency: 'BRL',
        });
        await expect(prisma.placementRevenueAllocation.findUniqueOrThrow({
            where: { id: allocation.id },
        })).resolves.toMatchObject({
            grossAmountMinor: 101,
            recruiterBasisPoints: 7000,
            platformBasisPoints: 3000,
            recruiterAmountMinor: 70,
            platformAmountMinor: 31,
        });
    } finally {
        releaseInsert?.();
        await Promise.allSettled([insertTransaction, updateOutcomePromise].filter(Boolean));
        await Promise.all([insertClient.$disconnect(), updateClient.$disconnect()]);
    }
});

test('RESTRICT preserves the complete tenant and financial evidence chain', async () => {
    const context = await createTenant('restrict');
    const placement = await createPlacement(context);
    const allocation = await createAllocation(context, placement);
    await createLedgerEntry(allocation);

    await expectRestrictConstraint(
        () => prisma.workspace.delete({ where: { id: context.workspace.id } }),
        'marketplace_placements_workspace_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.client.delete({ where: { id: context.client.id } }),
        'marketplace_placements_workspace_client_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.candidateApplication.delete({ where: { id: context.application.id } }),
        'marketplace_placements_client_application_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.workspaceMembership.delete({ where: { id: context.membership.id } }),
        'marketplace_placements_workspace_recruiter_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.user.delete({ where: { id: context.recruiter.id } }),
        'marketplace_placements_recruiter_user_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.marketplacePlacement.delete({ where: { id: placement.id } }),
        'revenue_allocations_placement_tenant_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.placementRevenueAllocation.delete({ where: { id: allocation.id } }),
        'revenue_ledger_allocation_currency_fkey',
    );
    await expectRestrictConstraint(
        () => prisma.marketplacePlacement.update({
            where: { id: placement.id },
            data: { id: `${placement.id}-changed` },
        }),
        'revenue_allocations_placement_tenant_fkey',
    );
});
