# Blinkfy Hire Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-safe operational analytics for the Blinkfy Hire funnel, covering conversion, stage duration, consent coverage and Fit Score distribution in API and UI.

**Architecture:** Add a pure analytics service that receives already-authorized client/job scope and computes metrics from `CandidateApplication`, score snapshots, consent state and immutable audit events. Expose it through a read-only workspace-protected route, then consume the exact response in a dashboard with explicit loading, empty and error states. No analytics query mutates state or makes hiring decisions.

**Tech Stack:** Node.js, Express, Prisma/PostgreSQL, Vitest, Next.js 16, React, TypeScript, `@recruitment-platform/shared`, existing workspace middleware and audit model.

## Global Constraints

- Preserve workspace and client isolation for every query; `jobId`, when present, must belong to `clientId`.
- Do not include candidate email, phone, consent evidence or private documents in analytics responses.
- Fit Score remains advisory; analytics must not reject candidates or change stages.
- Use UTC dates with an inclusive `from` and exclusive `to` boundary.
- Percentages are numbers from `0` to `1`, rounded to four decimals; missing denominators return `null`.
- Applications count once per stage and once per transition; incomplete stage durations are excluded from averages.
- Do not add LinkedIn scraping, login automation, autonomous outreach, voice screening or external integrations.
- Keep the existing Node `>=20.9.0` and package/workspace conventions.
- Use a dedicated `blinkfy_test` database for integration verification; never use production data.

---

### Task 1: Analytics domain service and deterministic calculations

**Files:**
- Create: `apps/api/src/services/blinkfy/analyticsService.js`
- Create: `apps/api/test/blinkfy/analytics.test.js`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/constants.ts`

**Interfaces:**
- Consumes: `prisma`, `{ workspaceId, clientId, jobId?, from?, to? }`.
- Produces: `getClientAnalytics({ prisma, workspaceId, clientId, jobId, from, to })` returning `{ scope, applications, conversion, stageTime, consent, score, generatedAt }`.

- [ ] **Step 1: Write failing service tests**

Cover: stage totals; `null` conversion when the denominator is empty; four-decimal conversion; duration from audit transitions; missing exit excluded; active/revoked/missing consent; score min/max/average; job filtering; UTC date boundaries; no cross-client records.

```js
const summary = await getClientAnalytics({ prisma, workspaceId, clientId, from, to });
expect(summary.applications.byStage.mapped).toBe(1);
expect(summary.conversion.mappedToReviewed).toBeNull();
expect(summary.consent).toEqual({ active: 1, revoked: 1, missing: 1 });
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- analytics.test.js
```

Expected: FAIL because `analyticsService.js` and the exported result types do not yet exist.

- [ ] **Step 3: Define shared response contracts**

Add TypeScript interfaces for `AnalyticsScope`, `AnalyticsSummary`, `StageMetrics`, `ConversionMetrics`, `ConsentMetrics` and `ScoreMetrics`. Keep stage values sourced from the existing `APPLICATION_STAGES` constant.

- [ ] **Step 4: Implement the pure aggregation service**

Validate scope inputs, query only applications whose job client matches the authorized client, load the latest score snapshot and consent state, and load audit events needed for stage timing. Use an in-memory map keyed by application ID to prevent duplicate stage/transition contributions. Do not return private candidate fields.

- [ ] **Step 5: Run focused and existing API tests**

Run the focused analytics test and the existing API suite in the Docker Node runner. Expected: all analytics assertions and the existing 29 API tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/blinkfy/analyticsService.js apps/api/test/blinkfy/analytics.test.js packages/shared/src/types.ts packages/shared/src/constants.ts
git commit -m "feat: add Blinkfy Hire analytics calculations"
```

### Task 2: Workspace-protected analytics API

**Files:**
- Create: `apps/api/src/controllers/blinkfy/analyticsController.js`
- Create: `apps/api/src/routes/blinkfy/analytics.js`
- Create: `apps/api/test/blinkfy/analyticsRoute.test.js`
- Modify: `apps/api/src/routes/blinkfy/index.js`

**Interfaces:**
- Consumes: `getClientAnalytics`, `requireWorkspaceRole`, `req.workspace.id` and `req.params.clientId`.
- Produces: `GET /api/blinkfy/clients/:clientId/analytics` with viewer access and JSON response matching `AnalyticsSummary`.

- [ ] **Step 1: Write failing route tests**

Cover authorized viewer access, missing workspace membership, cross-workspace client, job belonging to another client, invalid ISO dates, `from >= to`, and response shape. Assert that route failures return safe messages and that no private candidate fields are serialized.

- [ ] **Step 2: Run route tests and verify RED**

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- analyticsRoute.test.js
```

Expected: FAIL because the route and controller are not registered.

- [ ] **Step 3: Implement controller validation**

Parse `jobId`, `from` and `to`; reject malformed dates with `400`; reject an inverted/empty interval with `400`; find the client scoped to `req.workspace.id`; return `404` for inaccessible client/job to avoid enumeration.

- [ ] **Step 4: Register the read-only route**

Mount the controller under the existing Blinkfy client router with `requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer')`. The controller must call the service only after scope checks.

- [ ] **Step 5: Run route, API and migration checks**

```bash
node apps/api/node_modules/prisma/build/index.js migrate status --schema apps/api/prisma/schema.prisma
```

Then run the focused route test and the complete API suite. Expected: clean migration status and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/blinkfy/analyticsController.js apps/api/src/routes/blinkfy/analytics.js apps/api/src/routes/blinkfy/index.js apps/api/test/blinkfy/analyticsRoute.test.js
git commit -m "feat: expose tenant-safe Hire analytics API"
```

### Task 3: Recruiter analytics dashboard

**Files:**
- Create: `apps/web/app/hire/analytics/page.tsx`
- Create: `apps/web/components/hire/AnalyticsDashboard.tsx`
- Create: `apps/web/test/analytics.spec.tsx`
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/app/hire/page.tsx`

**Interfaces:**
- Consumes: `AnalyticsSummary` from `@recruitment-platform/shared`, active client selection and `GET /api/blinkfy/clients/:clientId/analytics`.
- Produces: `/hire/analytics` with client/job/date filters and the cards, funnel and stage-duration table described in the design.

- [ ] **Step 1: Write failing UI tests**

Cover loading state, empty analytics state, API error state, filter query construction, conversion card rendering, consent counts, score distribution and navigation to a job pipeline.

- [ ] **Step 2: Run focused UI tests and verify RED**

```bash
npm run test --workspace=apps/web -- analytics.spec.tsx
```

Expected: FAIL because the dashboard route and component do not yet exist.

- [ ] **Step 3: Implement the typed dashboard**

Use the persisted active client ID from the existing API helper. Keep API response types sourced from shared contracts; do not duplicate `ApplicationStage`. Render explicit `loading`, `empty`, `error` and `ready` branches. Use `null` conversion as “No sample” rather than `0%`.

- [ ] **Step 4: Add navigation and accessible controls**

Add a link from `/hire` to `/hire/analytics`, use labeled client/job/date controls, and link each job row to `/hire/jobs/:jobId`.

- [ ] **Step 5: Run UI tests, TypeScript and build**

```bash
npm run test --workspace=apps/web -- analytics.spec.tsx
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace=@recruitment-platform/web
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/hire/analytics/page.tsx apps/web/components/hire/AnalyticsDashboard.tsx apps/web/test/analytics.spec.tsx apps/web/lib/types.ts apps/web/app/hire/page.tsx
git commit -m "feat: add Blinkfy Hire analytics dashboard"
```

### Task 4: E2E analytics acceptance and pilot documentation

**Files:**
- Modify: `apps/api/test/blinkfy/hireCore.e2e.test.js`
- Modify: `docs/blinkfy-hire-pilot.md`
- Create: `docs/superpowers/sdd/2026-08-08-blinkfy-hire-analytics/progress.md`

**Interfaces:**
- Consumes: the API and dashboard from Tasks 1–3.
- Produces: an executable acceptance path proving shortlist data appears in analytics without leaking cross-client data.

- [ ] **Step 1: Extend the E2E test**

After the existing consented candidate reaches `shortlisted`, call the analytics endpoint and assert total applications, shortlist count, active consent and score count. Create a second client and assert its analytics response cannot include the first client’s application.

- [ ] **Step 2: Run the E2E test and verify RED**

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- hireCore.e2e.test.js
```

Expected: FAIL until the analytics endpoint and aggregation are complete.

- [ ] **Step 3: Update the pilot runbook**

Document the analytics URL, filter semantics, interpretation of `null` conversion and incomplete duration samples, plus the rule that metrics never make hiring decisions.

- [ ] **Step 4: Run the complete verification set**

Run the full API suite against `blinkfy_test`, web tests, TypeScript, shared build, web build and `git diff --check`. Expected: all tests pass and the branch is clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/blinkfy/hireCore.e2e.test.js docs/blinkfy-hire-pilot.md docs/superpowers/sdd/2026-08-08-blinkfy-hire-analytics/progress.md
git commit -m "test: validate Blinkfy Hire analytics pilot flow"
```

## Execution Order

Tasks are sequential: service calculations → protected API → dashboard → E2E/runbook. Each task must pass its focused tests and an independent review before the next task begins.
