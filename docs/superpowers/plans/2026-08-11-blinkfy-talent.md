# Blinkfy Talent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a free candidate workspace with an editable professional profile, controlled visibility and a consent center for recruiter presentations.

**Architecture:** Extend the existing workspace-scoped Candidate model with explicit visibility state and a candidate account link, while preserving the existing per-client consent records. Add a candidate-facing API and UI that never exposes a profile to recruiters unless visibility and consent rules allow it. Premium Engagement is represented as a feature boundary only; no payment or automatic publishing is implemented in this plan.

**Tech Stack:** Node.js, Express, Prisma/PostgreSQL, Vitest, Next.js 16, React, TypeScript, shared package types and existing audit/workspace middleware.

## Global Constraints

- The candidate product is free at launch; no billing or premium entitlement is implemented in Core.
- Candidate visibility defaults to private and can be paused or revoked immediately.
- A company presentation requires active `client_presentation` consent for that client; global consent alone does not silently expose private profile data.
- Consent evidence, email, phone and private documents are never returned to recruiter-facing endpoints.
- Premium Engagement generates drafts only; no scraping, login automation, autonomous outreach or invisible publication.
- Protected attributes cannot affect matching, visibility ranking or recommendations.
- Every visibility and consent mutation writes an append-only audit event.
- Preserve workspace/client isolation and Node `>=20.9.0` conventions.

---

### Task 1: Candidate account profile and visibility model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_blinkfy_talent_profile/migration.sql`
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`
- Create: `apps/api/src/services/blinkfy/talentProfileService.js`
- Create: `apps/api/test/blinkfy/talentProfile.test.js`

**Interfaces:**
- Consumes: authenticated candidate user identity and existing `Candidate` workspace record.
- Produces: `getCandidateProfile`, `updateCandidateProfile`, `setCandidateVisibility` service functions; `CandidateVisibility` values `private`, `available`, `recruiters_only`, `paused`.

- [ ] **Step 1: Write failing persistence/service tests**

Cover private-by-default creation, editable profile fields, allowed visibility transitions, rejection of protected matching fields, and audit events for profile/visibility mutations.

```js
const profile = await getCandidateProfile({ prisma, userId, workspaceId });
expect(profile.visibility).toBe('private');
await setCandidateVisibility({ prisma, userId, workspaceId, visibility: 'available' });
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- talentProfile.test.js
```

Expected: FAIL because visibility storage and service functions do not exist.

- [ ] **Step 3: Add migration and shared contracts**

Add a candidate account reference/uniqueness constraint, a visibility enum/default, and profile fields that are safe for candidate-controlled discovery. Keep existing recruiter-imported candidates valid through nullable account linkage. Export the enum and `CandidateTalentProfile` response type from shared.

- [ ] **Step 4: Implement service and audit mutations**

Scope every lookup by `workspaceId` and candidate account. Validate allowed fields, strip protected attributes from matching metadata, and call the existing audit service for profile and visibility changes. Return a redacted candidate profile.

- [ ] **Step 5: Run focused tests and migration status**

Run the focused test, shared build and `prisma migrate status` against `blinkfy_test`. Expected: all pass with no legacy data loss.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations packages/shared/src/constants.ts packages/shared/src/types.ts apps/api/src/services/blinkfy/talentProfileService.js apps/api/test/blinkfy/talentProfile.test.js
git commit -m "feat: add Blinkfy Talent profile visibility"
```

### Task 2: Candidate API and consent center

**Files:**
- Create: `apps/api/src/controllers/blinkfy/talentController.js`
- Create: `apps/api/src/routes/blinkfy/talent.js`
- Create: `apps/api/test/blinkfy/talentRoutes.test.js`
- Modify: `apps/api/src/routes/blinkfy/index.js`
- Modify: `apps/api/src/controllers/blinkfy/candidatesController.js`

**Interfaces:**
- Consumes: Task 1 profile service and existing consent/share service.
- Produces: authenticated candidate routes:
  - `GET /api/blinkfy/talent/profile`
  - `PATCH /api/blinkfy/talent/profile`
  - `PATCH /api/blinkfy/talent/visibility`
  - `GET /api/blinkfy/talent/consents`
  - `POST /api/blinkfy/talent/consents/:consentId/revoke`

- [ ] **Step 1: Write failing route tests**

Cover candidate access, another user’s profile denial, private default, redacted response, visibility validation, consent listing without evidence, revocation, audit event creation and recruiter presentation denial after revocation.

- [ ] **Step 2: Run route tests and verify RED**

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- talentRoutes.test.js
```

Expected: FAIL because candidate-facing routes are not registered.

- [ ] **Step 3: Implement authenticated candidate routes**

Use the existing JWT middleware and workspace context. Resolve the candidate account rather than accepting arbitrary candidate IDs. Return safe `404`/`403` responses to prevent enumeration. Consent list returns client display metadata, purpose, status and timestamps, never evidence.

- [ ] **Step 4: Enforce presentation policy**

Update recruiter-facing candidate/share logic so a candidate must be `available` or `recruiters_only` as appropriate and must have active client-specific consent before presentation. Revoked consent blocks new shares but retains audit history.

- [ ] **Step 5: Run route, existing API and E2E tests**

Run focused routes plus the complete API suite and the existing import→consent→shortlist E2E. Expected: all existing Hire behavior remains green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/blinkfy/talentController.js apps/api/src/routes/blinkfy/talent.js apps/api/test/blinkfy/talentRoutes.test.js apps/api/src/routes/blinkfy/index.js apps/api/src/controllers/blinkfy/candidatesController.js
git commit -m "feat: add Blinkfy Talent consent center API"
```

### Task 3: Candidate web workspace

**Files:**
- Create: `apps/web/app/talent/page.tsx`
- Create: `apps/web/components/talent/TalentProfileForm.tsx`
- Create: `apps/web/components/talent/VisibilityControl.tsx`
- Create: `apps/web/components/talent/ConsentCenter.tsx`
- Create: `apps/web/test/talent.spec.tsx`
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: Task 2 candidate routes and shared `CandidateTalentProfile`, `CandidateVisibility` and consent summary types.
- Produces: `/talent` with profile editing, visibility control, consent list/revoke and explicit loading/error/empty states.

- [ ] **Step 1: Write failing UI tests**

Cover private default copy, editable profile submission, visibility change confirmation, consent list rendering without evidence, revoke action and API error states.

- [ ] **Step 2: Run focused UI tests and verify RED**

```bash
npm run test --workspace=apps/web -- talent.spec.tsx
```

Expected: FAIL because the Talent route/components do not exist.

- [ ] **Step 3: Implement candidate workspace**

Use the existing `apiFetch` and persisted identity/session behavior. Do not accept candidate IDs from form inputs. Make visibility labels understandable, show exactly what each state permits, and require confirmation before revocation.

- [ ] **Step 4: Add navigation and accessible states**

Link `/talent` from the public app entry point, use labeled controls, announce API errors, and distinguish loading from no consents.

- [ ] **Step 5: Run UI tests, TypeScript and build**

```bash
npm run test --workspace=apps/web -- talent.spec.tsx
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace=@recruitment-platform/web
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/talent apps/web/components/talent apps/web/test/talent.spec.tsx apps/web/lib/types.ts apps/web/app/page.tsx
git commit -m "feat: add Blinkfy Talent candidate workspace"
```

### Task 4: Candidate acceptance flow and documentation

**Files:**
- Create: `apps/api/test/blinkfy/talent.e2e.test.js`
- Modify: `README.md`
- Create: `docs/blinkfy-talent-pilot.md`

**Interfaces:**
- Consumes: Tasks 1–3 profile, consent and UI routes.
- Produces: acceptance evidence for candidate signup/profile → visibility → client consent → recruiter presentation → revocation.

- [ ] **Step 1: Write the E2E acceptance test**

Assert a private candidate is not presented, activating visibility alone still does not share to a client, explicit client consent permits presentation, revocation blocks subsequent presentation, and audit history remains available only to authorized operators.

- [ ] **Step 2: Run E2E RED then GREEN**

```bash
TEST_DATABASE_URL='postgresql://admin:password@recruitment-db:5432/blinkfy_test' npm run test --workspace=apps/api -- talent.e2e.test.js
```

- [ ] **Step 3: Document the pilot**

Document free candidate access, visibility states, consent semantics, Premium Engagement as a future draft-only feature and the prohibition on scraping/autonomous outreach.

- [ ] **Step 4: Run final verification**

Run the complete API suite, E2E, web tests, TypeScript, shared build, web build and `git diff --check` against the isolated test database.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/blinkfy/talent.e2e.test.js README.md docs/blinkfy-talent-pilot.md
git commit -m "test: validate Blinkfy Talent consent flow"
```

## Execution Order

Tasks are sequential: profile/visibility model → candidate API/consent center → candidate UI → E2E/runbook. Each task requires focused tests and independent review before the next begins.
