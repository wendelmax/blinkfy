# Blinkfy Hire Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first usable Blinkfy Hire workspace for an agency to create or import a job, import consented candidates, review an explainable Fit Score, and manage a client-isolated shortlist pipeline.

**Architecture:** Extend the existing Express/Prisma/PostgreSQL application into a multi-tenant agency workspace, while preserving the current recruitment entities until their replacement is complete. Extract an Express application factory for testability; expose a versioned `/api/blinkfy` surface; build a new Next.js web workspace that consumes those endpoints. All candidate reuse, score overrides, imports and stage transitions create audit events.

**Tech Stack:** Node.js 20, Express 5, Prisma 5, PostgreSQL 15, Zod, Vitest, Supertest, Next.js 16, React 19, TypeScript, Tailwind CSS 4.

## Global Constraints

- Blinkfy is a working brand name and must remain configurable; do not add it to database identifiers.
- The pilot persona is an agency recruiter; direct employers use the same model with one client.
- The implementation must never scrape LinkedIn, automate LinkedIn actions, or send a candidate-facing message without an explicit approval event.
- Candidate data sharing defaults to private; reuse across agency clients requires a recorded active consent for `client_presentation`.
- Fit Score is advisory: protected characteristics are excluded, low-confidence candidates are reviewed, and the application never auto-rejects a candidate.
- Every external import, score computation, manual override, candidate sharing action and pipeline transition creates an immutable audit event.
- The voice screening, RAG, calendar, ATS connectors, LinkedIn partnership integration, billing and Blinkfy Talent are separate post-Core plans.
- Add automated tests with each task; replace the existing API test stub.

---

## Deliverable boundaries

This plan implements only Foundation + Blinkfy Hire Core from the approved design. It deliberately stops before qualification workflows, external integrations and candidate communications. Those are independent subsystems and need separate plans after Core pilot feedback.

## Planned file structure

```text
apps/
  api/
    prisma/
      schema.prisma                         # Existing + Blinkfy Core tables
      migrations/<timestamp>_blinkfy_core/  # Generated SQL migration
    src/
      app.js                                # Express application factory
      lib/prisma.js                         # Single Prisma client instance
      middleware/workspace.js               # Workspace/client authorization
      routes/blinkfy/
        index.js                            # Router composition
        jobs.js                             # Job endpoints
        candidates.js                       # Candidate and consent endpoints
        applications.js                     # Pipeline and score endpoints
        imports.js                          # CSV parse/validation endpoints
      controllers/blinkfy/
        jobsController.js
        candidatesController.js
        applicationsController.js
        importsController.js
      services/blinkfy/
        auditService.js
        candidateService.js
        fitScoreService.js
        importService.js
      validators/blinkfy.js
    test/
      setup.js
      helpers/factories.js
      blinkfy/*.test.js
  web/
    package.json
    tsconfig.json
    next.config.ts
    app/
      layout.tsx
      page.tsx
      hire/page.tsx
      hire/jobs/new/page.tsx
      hire/jobs/[jobId]/page.tsx
      hire/candidates/import/page.tsx
    lib/api.ts
    lib/types.ts
    components/hire/
      JobForm.tsx
      CandidateImport.tsx
      FitScoreCard.tsx
      PipelineBoard.tsx
      ConsentBadge.tsx
packages/shared/
  src/constants.ts                           # Blinkfy stage/role constants
  src/types.ts                               # Shared API contracts
```

## Task 1: Establish a testable application and a working web workspace

**Files:**
- Create: `apps/api/src/app.js`
- Create: `apps/api/src/lib/prisma.js`
- Create: `apps/api/test/setup.js`
- Create: `apps/api/test/health.test.js`
- Modify: `apps/api/src/index.js`
- Modify: `apps/api/package.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces `createApp({ prisma? }): Express` for route tests without a listening server.
- Produces `getPrisma(): PrismaClient` and `disconnectPrisma(): Promise<void>` as the only API Prisma lifecycle functions.
- Produces `npm run test --workspace=apps/api` and `npm run test` at root.

- [ ] **Step 1: Add the failing health integration test**

```js
import request from 'supertest';
import { createApp } from '../src/app';

test('GET /health returns API and database status', async () => {
  const app = createApp({ prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) } });
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ status: 'ok', db: 'ok' });
});
```

- [ ] **Step 2: Run the health test to verify the missing application factory**

Run: `npm run test --workspace=apps/api -- health.test.js`

Expected: FAIL because `../src/app` does not exist.

- [ ] **Step 3: Implement the app factory and Prisma singleton**

Move middleware, existing routes, `/health`, `/ready`, and the error handler from `src/index.js` into `createApp`. Accept an injected Prisma client for health/readiness routes. Keep `src/index.js` limited to environment validation, `createApp()`, `app.listen`, and graceful shutdown using `disconnectPrisma`.

```js
function createApp({ prisma = getPrisma() } = {}) {
  const app = express();
  // existing security middleware and route mounting
  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', version: '1.0.0' });
  });
  return app;
}
module.exports = { createApp };
```

- [ ] **Step 4: Configure Vitest and replace the API test stub**

Add `vitest` and `supertest` to API development dependencies. Set the API test script to `vitest run`; add root `test` script `npm run test --workspaces --if-present`. In `test/setup.js`, set `NODE_ENV=test` before imports and fail tests if `DATABASE_URL` lacks `test` in its database name.

- [ ] **Step 5: Create the actual Next.js workspace**

Create `apps/web` with scripts `dev`, `build`, `start`, `lint` and `test`, Next 16/React 19/TypeScript/Tailwind dependencies, `app/layout.tsx`, and an accessible landing page. The landing page must render `Blinkfy Hire` and link to `/hire`; it must not rely on the absent legacy frontend.

- [ ] **Step 6: Run foundation verification**

Run:

```bash
npm install
npm run test --workspace=apps/api
npm run build --workspace=@recruitment-platform/shared
npm run build --workspace=apps/web
```

Expected: health test passes; shared package and web application build successfully.

- [ ] **Step 7: Commit the foundation**

```bash
git add package.json package-lock.json apps/api apps/web packages/shared
git commit -m "chore: establish Blinkfy application foundation"
```

## Task 2: Add workspace, client, membership and immutable audit data

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_blinkfy_workspace/migration.sql`
- Create: `apps/api/src/services/blinkfy/auditService.js`
- Create: `apps/api/test/blinkfy/workspace.test.js`
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`

**Interfaces:**
- Produces Prisma models `Workspace`, `WorkspaceMembership`, `Client`, and `AuditEvent`.
- Produces `recordAuditEvent({ workspaceId, actorUserId, clientId, entityType, entityId, action, metadata }): Promise<AuditEvent>`.
- Produces shared string unions `WorkspaceRole = 'owner' | 'admin' | 'recruiter' | 'viewer'` and `AuditAction` constants.

- [ ] **Step 1: Write failing workspace/audit persistence tests**

```js
test('records an immutable audit event for a workspace action', async () => {
  const event = await recordAuditEvent({
    workspaceId: workspace.id, actorUserId: owner.id, clientId: client.id,
    entityType: 'client', entityId: client.id, action: 'client.created', metadata: { name: client.name },
  });
  expect(event.action).toBe('client.created');
  await expect(prisma.auditEvent.update({ where: { id: event.id }, data: { action: 'changed' } })).rejects.toThrow();
});
```

- [ ] **Step 2: Run the workspace test to verify it fails**

Run: `npm run test --workspace=apps/api -- workspace.test.js`

Expected: FAIL because the models and audit service do not exist.

- [ ] **Step 3: Add the multi-tenant schema**

Add:

```prisma
model Workspace { id String @id @default(cuid()); name String; clients Client[]; memberships WorkspaceMembership[]; auditEvents AuditEvent[]; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }
model WorkspaceMembership { id String @id @default(cuid()); workspaceId String; userId String; role WorkspaceRole; workspace Workspace @relation(fields:[workspaceId], references:[id], onDelete:Cascade); user User @relation(fields:[userId], references:[id], onDelete:Cascade); @@unique([workspaceId,userId]) }
model Client { id String @id @default(cuid()); workspaceId String; name String; workspace Workspace @relation(fields:[workspaceId], references:[id], onDelete:Cascade); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }
model AuditEvent { id String @id @default(cuid()); workspaceId String; clientId String?; actorUserId String?; entityType String; entityId String; action String; metadata Json?; createdAt DateTime @default(now()) }
```

Use a PostgreSQL trigger in the migration to reject `UPDATE` and `DELETE` on `AuditEvent`; service accounts append events only.

- [ ] **Step 4: Implement append-only audit service**

Validate nonempty entity/action IDs and JSON-serializable metadata. Use `prisma.auditEvent.create`; expose no update/delete service functions.

- [ ] **Step 5: Apply migration and run persistence tests**

Run:

```bash
cd apps/api && npx prisma migrate dev --name blinkfy_workspace
npm run test --workspace=apps/api -- workspace.test.js
```

Expected: migration creates tables/trigger and audit test passes.

- [ ] **Step 6: Commit tenant foundation**

```bash
git add apps/api/prisma apps/api/src/services/blinkfy packages/shared apps/api/test/blinkfy
git commit -m "feat: add Blinkfy workspace and audit foundation"
```

## Task 3: Authorize workspace and client access at the API boundary

**Files:**
- Create: `apps/api/src/middleware/workspace.js`
- Create: `apps/api/src/routes/blinkfy/index.js`
- Create: `apps/api/src/routes/blinkfy/jobs.js`
- Modify: `apps/api/src/app.js`
- Create: `apps/api/test/blinkfy/authorization.test.js`

**Interfaces:**
- Produces `requireWorkspaceRole(...roles)` middleware that reads `x-workspace-id` and verifies the JWT user has a membership.
- Produces `requireClientAccess` middleware that reads `:clientId` and verifies it belongs to `req.workspace.id`.
- Produces router prefix `/api/blinkfy`.

- [ ] **Step 1: Write authorization tests for membership and client isolation**

```js
test('rejects a recruiter accessing a client in another workspace', async () => {
  const response = await request(app)
    .get(`/api/blinkfy/clients/${foreignClient.id}/jobs`)
    .set('Authorization', bearerToken(memberOfWorkspaceA))
    .set('x-workspace-id', workspaceA.id);
  expect(response.status).toBe(404);
});
```

- [ ] **Step 2: Run authorization tests to verify the route is absent**

Run: `npm run test --workspace=apps/api -- authorization.test.js`

Expected: FAIL with 404/route unavailable before the Blinkfy router is mounted.

- [ ] **Step 3: Implement authorization middleware**

`requireWorkspaceRole` returns 400 when the workspace header is absent, 403 when a membership is absent or role is insufficient, and sets `req.workspace`/`req.workspaceMembership`. `requireClientAccess` returns 404 for a client outside the workspace, preventing cross-workspace enumeration.

- [ ] **Step 4: Mount a protected Blinkfy router and a read-only test route**

Mount after existing auth middleware. Implement `GET /api/blinkfy/clients/:clientId/jobs` returning `{ items: [] }` for an authorized empty client; this route becomes the base contract used by Task 4.

- [ ] **Step 5: Re-run authorization tests**

Run: `npm run test --workspace=apps/api -- authorization.test.js`

Expected: authorized request returns 200; foreign-client request returns 404; missing membership returns 403.

- [ ] **Step 6: Commit workspace authorization**

```bash
git add apps/api/src/app.js apps/api/src/middleware apps/api/src/routes/blinkfy apps/api/test/blinkfy/authorization.test.js
git commit -m "feat: authorize Blinkfy workspaces and clients"
```

## Task 4: Model jobs and dual-path job intake

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/validators/blinkfy.js`
- Create: `apps/api/src/controllers/blinkfy/jobsController.js`
- Modify: `apps/api/src/routes/blinkfy/jobs.js`
- Create: `apps/api/test/blinkfy/jobs.test.js`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/constants.ts`

**Interfaces:**
- Produces `BlinkfyJob`, `JobScorecard`, and `JobImport` Prisma models scoped to `Client`.
- Produces `POST /api/blinkfy/clients/:clientId/jobs`, `GET /api/blinkfy/clients/:clientId/jobs`, and `POST /api/blinkfy/clients/:clientId/jobs/import`.
- `POST` accepts `{ title, description, location, workModel, salaryMin, salaryMax, requirements: string[], weights: { skills, experience, context, preferences, signals } }`.

- [ ] **Step 1: Write tests for valid manual job creation and invalid score weights**

```js
test('creates a job only when scorecard weights sum to 100', async () => {
  const response = await createJob({ weights: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 } });
  expect(response.status).toBe(201);
  expect(response.body.scorecard.weights.skills).toBe(35);
  await expect(createJob({ weights: { skills: 50, experience: 50, context: 50, preferences: 0, signals: 0 } })).resolves.toMatchObject({ status: 422 });
});
```

- [ ] **Step 2: Run job tests to verify they fail**

Run: `npm run test --workspace=apps/api -- jobs.test.js`

Expected: FAIL because Blinkfy job tables/endpoints do not exist.

- [ ] **Step 3: Add job schema and validation**

Use a dedicated `BlinkfyJob` rather than mutating legacy `Job`. Store requirements as `Json`, status as enum `draft|open|closed`, and a one-to-one `JobScorecard` with five integer weights. Zod must trim title, require one requirement, enforce nonnegative salary bounds, and require scorecard total exactly 100.

- [ ] **Step 4: Implement manual job endpoint and audit events**

Create the job/scorecard in a transaction. Append `job.created` with `source: 'manual'` and `job.scorecard_configured` events. List endpoint returns only jobs under the authorized client.

- [ ] **Step 5: Implement normalized CSV job import endpoint**

Accept a single-row CSV with headers `title,description,location,workModel,salaryMin,salaryMax,requirements`. Parse it in memory, validate it with the same Zod schema, create `JobImport` status `completed` or `failed`, and return row-specific errors without creating a partial job.

- [ ] **Step 6: Run job tests and Prisma migration verification**

Run:

```bash
cd apps/api && npx prisma migrate dev --name blinkfy_jobs
npm run test --workspace=apps/api -- jobs.test.js
```

Expected: valid create/import passes; invalid weights and invalid CSV return 422 with error details.

- [ ] **Step 7: Commit job intake**

```bash
git add apps/api/prisma apps/api/src/validators apps/api/src/controllers/blinkfy apps/api/src/routes/blinkfy packages/shared apps/api/test/blinkfy
git commit -m "feat: add Blinkfy job intake"
```

## Task 5: Import, deduplicate and govern candidate consent

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/services/blinkfy/candidateService.js`
- Create: `apps/api/src/services/blinkfy/importService.js`
- Create: `apps/api/src/controllers/blinkfy/candidatesController.js`
- Create: `apps/api/src/controllers/blinkfy/importsController.js`
- Create: `apps/api/src/routes/blinkfy/candidates.js`
- Create: `apps/api/src/routes/blinkfy/imports.js`
- Create: `apps/api/test/blinkfy/candidates.test.js`
- Create: `apps/api/test/blinkfy/imports.test.js`

**Interfaces:**
- Produces `Candidate`, `CandidateIdentity`, `CandidateConsent`, and `CandidateImport` models.
- Produces `POST /api/blinkfy/clients/:clientId/candidates/import`, `GET /api/blinkfy/candidates/:candidateId`, `POST /api/blinkfy/candidates/:candidateId/consents`, and `POST /api/blinkfy/candidates/:candidateId/share`.
- Produces `findCandidateDuplicate({ workspaceId, email, linkedinUrl }): Promise<Candidate | null>`.

- [ ] **Step 1: Write failing candidate import and consent tests**

```js
test('deduplicates the same normalized email inside a workspace', async () => {
  await importCandidates(csv('Sam,sam@example.com,https://linkedin.com/in/sam'));
  const response = await importCandidates(csv('Samuel,SAM@example.com,https://linkedin.com/in/sam'));
  expect(response.body.created).toBe(0);
  expect(response.body.duplicates).toHaveLength(1);
});

test('blocks cross-client sharing without active client_presentation consent', async () => {
  const response = await shareCandidate(candidate.id, otherClient.id);
  expect(response.status).toBe(409);
});
```

- [ ] **Step 2: Run candidate tests to verify they fail**

Run: `npm run test --workspace=apps/api -- candidates.test.js imports.test.js`

Expected: FAIL because candidate import, consent and sharing routes do not exist.

- [ ] **Step 3: Add candidate, consent and import schema**

`Candidate` belongs to `Workspace`, has normalized optional email and LinkedIn URL, profile JSON and source metadata. `CandidateConsent` records `purpose`, `grantedAt`, `revokedAt`, `evidence`, `workspaceId`, optional `clientId`. `CandidateImport` stores original filename, source, status, counts and non-sensitive row error metadata. Create unique partial indexes for normalized email and LinkedIn URL within workspace when non-null.

- [ ] **Step 4: Implement CSV parser and idempotent import service**

Require headers `fullName,email,linkedinUrl,currentTitle,location,skills,source`. Trim/normalize email and URL; process all rows in a transaction; return `{ created, duplicates, invalidRows }`. An invalid row has `row`, `field`, `message`; duplicates retain source provenance and generate `candidate.duplicate_detected` audit events.

- [ ] **Step 5: Implement consent and sharing rules**

Consent endpoint accepts `{ purpose: 'client_presentation', clientId?: string, evidence: string }`. Share endpoint verifies an unrevoked consent matching the target client or workspace-wide purpose, creates a `CandidateApplication` in `mapped` stage only after validation, and writes `candidate.shared` audit event. Revoking consent prevents future sharing but preserves immutable audit history.

- [ ] **Step 6: Apply migration and run import/consent tests**

Run:

```bash
cd apps/api && npx prisma migrate dev --name blinkfy_candidates
npm run test --workspace=apps/api -- candidates.test.js imports.test.js
```

Expected: duplicate detection is idempotent; invalid rows do not create candidates; inactive/missing consent blocks sharing.

- [ ] **Step 7: Commit candidate governance**

```bash
git add apps/api/prisma apps/api/src/services/blinkfy apps/api/src/controllers/blinkfy apps/api/src/routes/blinkfy apps/api/test/blinkfy
git commit -m "feat: add consented candidate imports"
```

## Task 6: Implement explainable Fit Score and reviewed pipeline

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/services/blinkfy/fitScoreService.js`
- Create: `apps/api/src/controllers/blinkfy/applicationsController.js`
- Create: `apps/api/src/routes/blinkfy/applications.js`
- Create: `apps/api/test/blinkfy/fitScore.test.js`
- Create: `apps/api/test/blinkfy/pipeline.test.js`
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`

**Interfaces:**
- Produces `CandidateApplication`, `FitScoreSnapshot`, and enum `ApplicationStage = 'mapped' | 'reviewed' | 'interested' | 'screened' | 'shortlisted' | 'rejected'`.
- Produces `computeFitScore({ job, candidate }): { score: number, confidence: 'low'|'medium'|'high', factors: FactorEvidence[], gaps: string[] }`.
- Produces `POST /api/blinkfy/jobs/:jobId/applications/:applicationId/recompute-score`, `PATCH /api/blinkfy/jobs/:jobId/applications/:applicationId/stage`, and `PATCH /api/blinkfy/jobs/:jobId/applications/:applicationId/override-score`.

- [ ] **Step 1: Write score calculation tests**

```js
test('returns evidence, gaps and medium confidence for a partially complete profile', () => {
  const result = computeFitScore({ job: fixtureJob, candidate: fixtureCandidate });
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(result.factors).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'skills', weight: 35 })]));
  expect(result.gaps).toContain('fintech context not evidenced');
  expect(result.confidence).toBe('medium');
});
```

- [ ] **Step 2: Write pipeline guard tests**

```js
test('cannot move a mapped candidate directly to shortlisted', async () => {
  const response = await moveStage(application.id, 'shortlisted');
  expect(response.status).toBe(422);
});

test('stores a reviewer reason when a score is overridden', async () => {
  const response = await overrideScore(application.id, { score: 91, reason: 'Verified enterprise quota ownership in recruiter call' });
  expect(response.status).toBe(200);
  expect(response.body.score.overrideReason).toContain('quota ownership');
});
```

- [ ] **Step 3: Run score and pipeline tests to verify they fail**

Run: `npm run test --workspace=apps/api -- fitScore.test.js pipeline.test.js`

Expected: FAIL because score service, snapshots and application routes are absent.

- [ ] **Step 4: Add application and score snapshot persistence**

`CandidateApplication` references `BlinkfyJob` and `Candidate`, is unique by pair, tracks stage and stage timestamps. `FitScoreSnapshot` stores factor evidence JSON, gaps JSON, score, confidence, computedAt, optional override score/reason/reviewer. Add a database check constraining score to `0..100`.

- [ ] **Step 5: Implement deterministic scoring service**

For each configured factor, calculate a `0..1` normalized score strictly from profile evidence. Multiply by job weight, round to integer total, list missing required skills/context as gaps, and assign confidence: `high` when email, title, skills and availability exist; `medium` when title/skills exist but availability or preference data is absent; `low` otherwise. Do not include age, gender, race, ethnicity, nationality, disability, religion or other protected characteristics in inputs or output.

- [ ] **Step 6: Implement reviewed transitions and overrides**

Allow `mapped → reviewed → interested → screened → shortlisted`; allow `mapped|reviewed|interested|screened → rejected` only through a human reviewer endpoint with nonempty `reason`. The Core UI does not call rejected transition automatically. Every recomputation, stage change, rejection and override appends an audit event.

- [ ] **Step 7: Apply migration and run all score/pipeline tests**

Run:

```bash
cd apps/api && npx prisma migrate dev --name blinkfy_fit_score_pipeline
npm run test --workspace=apps/api -- fitScore.test.js pipeline.test.js
```

Expected: score is reproducible, transparent and bounded; invalid transitions are rejected; overrides are auditable.

- [ ] **Step 8: Commit scoring and pipeline**

```bash
git add apps/api/prisma apps/api/src/services/blinkfy apps/api/src/controllers/blinkfy apps/api/src/routes/blinkfy packages/shared apps/api/test/blinkfy
git commit -m "feat: add explainable Blinkfy fit scoring"
```

## Task 7: Build the Blinkfy Hire pilot interface

**Files:**
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/lib/types.ts`
- Create: `apps/web/app/hire/page.tsx`
- Create: `apps/web/app/hire/jobs/new/page.tsx`
- Create: `apps/web/app/hire/jobs/[jobId]/page.tsx`
- Create: `apps/web/app/hire/candidates/import/page.tsx`
- Create: `apps/web/components/hire/JobForm.tsx`
- Create: `apps/web/components/hire/CandidateImport.tsx`
- Create: `apps/web/components/hire/FitScoreCard.tsx`
- Create: `apps/web/components/hire/PipelineBoard.tsx`
- Create: `apps/web/components/hire/ConsentBadge.tsx`
- Create: `apps/web/test/hire.spec.tsx`

**Interfaces:**
- Produces `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` which sends the authenticated token and active `x-workspace-id`.
- Produces screens `/hire`, `/hire/jobs/new`, `/hire/jobs/:jobId`, `/hire/candidates/import`.
- Consumes the API contracts created in Tasks 3–6; the UI never recomputes scores or bypasses stage transition endpoints.

- [ ] **Step 1: Write failing UI tests for job creation and score evidence**

```tsx
it('submits a complete scorecard and shows server-side validation errors', async () => {
  render(<JobForm clientId="client_1" />);
  await user.type(screen.getByLabelText('Job title'), 'Enterprise Account Executive');
  await user.click(screen.getByRole('button', { name: 'Create job' }));
  expect(await screen.findByText('Add at least one requirement')).toBeVisible();
});

it('renders evidence, gaps and confidence instead of only a numeric score', () => {
  render(<FitScoreCard score={fixtureScore} />);
  expect(screen.getByText('fintech context not evidenced')).toBeVisible();
  expect(screen.getByText('Medium confidence')).toBeVisible();
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `npm run test --workspace=apps/web -- hire.spec.tsx`

Expected: FAIL because Hire pages/components and the web test configuration do not exist.

- [ ] **Step 3: Implement authenticated API client and active workspace selection**

Use the existing JWT contract; initially obtain active workspace from a persisted client-side selection after login. `apiFetch` must attach `Authorization: Bearer <token>` and `x-workspace-id`; on `401` clear the token; on `403` render a permission state; on `404` render a not-found state without disclosing client information.

- [ ] **Step 4: Implement job intake and candidate import screens**

`JobForm` must collect each five-factor integer weight, show a running total, block submit unless it equals 100, and display server validation. `CandidateImport` accepts CSV, renders valid/duplicate/invalid row counts returned by the API, and does not claim that an imported candidate is shareable until consent exists.

- [ ] **Step 5: Implement the job pipeline screen**

Render columns from the shared `ApplicationStage` values. Candidate cards show `ConsentBadge`, total score, confidence, two evidence items and a gap. Moving a card invokes the stage endpoint; a rejected action always displays and requires a reason modal. Score overrides display an input for score and required reviewer reason.

- [ ] **Step 6: Run UI and production build verification**

Run:

```bash
npm run test --workspace=apps/web -- hire.spec.tsx
npm run build --workspace=apps/web
```

Expected: form and score UI tests pass; production build completes.

- [ ] **Step 7: Commit pilot UI**

```bash
git add apps/web
git commit -m "feat: add Blinkfy Hire pilot workspace"
```

## Task 8: Verify the Core as an end-to-end pilot slice and update operations docs

**Files:**
- Create: `apps/api/test/blinkfy/hireCore.e2e.test.js`
- Modify: `README.md`
- Create: `docs/blinkfy-hire-pilot.md`
- Modify: `apps/api/env-template`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces a documented local pilot environment with an API, web app and isolated test database.
- Produces a repeatable end-to-end test: create workspace/client → create job → import candidate → record consent → share → score → review → shortlist.

- [ ] **Step 1: Write the failing end-to-end pilot test**

```js
test('agency turns a consented CSV candidate into a reviewed shortlist entry', async () => {
  const { workspace, client, ownerToken } = await createAgencyFixture();
  const job = await api(ownerToken, workspace.id).post(`/api/blinkfy/clients/${client.id}/jobs`).send(validJob);
  const imported = await api(ownerToken, workspace.id).post(`/api/blinkfy/clients/${client.id}/candidates/import`).attach('file', candidateCsv);
  await grantClientPresentationConsent(imported.body.items[0].id, client.id);
  const application = await shareCandidate(imported.body.items[0].id, client.id, job.body.id);
  await recomputeScore(application.id);
  await moveStage(application.id, 'reviewed');
  await moveStage(application.id, 'interested');
  await moveStage(application.id, 'screened');
  const shortlisted = await moveStage(application.id, 'shortlisted');
  expect(shortlisted.body.stage).toBe('shortlisted');
});
```

- [ ] **Step 2: Run the end-to-end test before wiring the complete slice**

Run: `npm run test --workspace=apps/api -- hireCore.e2e.test.js`

Expected: FAIL until every Core endpoint and authorization path is integrated.

- [ ] **Step 3: Add explicit environment and Docker configuration**

Document `DATABASE_URL`, `TEST_DATABASE_URL`, `FRONTEND_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_KEYCLOAK_*`. Add a `postgres-test` Compose service with database name `blinkfy_test`; do not run tests against `newone`.

- [ ] **Step 4: Document pilot setup and acceptance walkthrough**

In `docs/blinkfy-hire-pilot.md`, include exact commands to start databases, run migrations, create seed agency/client/member data, import the sample CSV, and execute the E2E test. Document the consent gate, rejection/override audit requirement, and the explicit non-support for LinkedIn automation.

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
npm run test --workspace=apps/api
npm run test --workspace=apps/web
npm run build
docker compose config
git diff --check
```

Expected: all tests and builds pass; Compose configuration parses; no whitespace errors.

- [ ] **Step 6: Commit Core verification and handoff docs**

```bash
git add README.md docs/blinkfy-hire-pilot.md apps/api/test/blinkfy/hireCore.e2e.test.js apps/api/env-template docker-compose.yml
git commit -m "docs: add Blinkfy Hire pilot runbook"
```

## Plan self-review

### Spec coverage

- Agency-first multi-client isolation: Tasks 2–3.
- Job form and ATS-compatible import-first intake: Task 4.
- Permitted candidate imports, provenance, consent and controlled reuse: Task 5.
- Explainable five-factor Fit Score, reviewer override and no auto-rejection: Task 6.
- Human-owned reviewed pipeline and Top 5 readiness: Tasks 6–7.
- Existing repository build/test/web gaps: Task 1.
- Auditability, idempotency and failure paths: Tasks 2, 4–6 and 8.
- Pilot verification and operating documentation: Task 8.
- Voice, RAG, calendar, official LinkedIn partnership, communications and billing: explicitly excluded as independently planned post-Core subsystems.

### Consistency checks

- All Blinkfy routes require an active workspace and client isolation where client-scoped.
- The same `CandidateApplication` type is created on permitted sharing, scored by Task 6 and rendered by Task 7.
- The five score factors and the `ApplicationStage` lifecycle are fixed in shared contracts before API/UI consumption.
- No task introduces autonomous external outreach or LinkedIn scraping.
