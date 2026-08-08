# Blinkfy Hire Analytics — Progress

Plan: `docs/superpowers/plans/2026-08-08-blinkfy-hire-analytics.md`
Design: `docs/superpowers/specs/2026-08-08-blinkfy-hire-analytics-design.md`

## Task 1 — Analytics domain service and deterministic calculations

Status: done, merged in PR #35.

`apps/api/src/services/blinkfy/analyticsService.js` computes stage totals,
conversion, stage duration, consent and score metrics from
`CandidateApplication`, score snapshots, consent state and audit events.
Covered by `apps/api/test/blinkfy/analytics.test.js`.

## Task 2 — Workspace-protected analytics API

Status: done, merged in PR #35 (`feat: expose tenant-safe Hire analytics API`).

`GET /api/blinkfy/clients/:clientId/analytics`, mounted under the existing
Blinkfy client router with `requireWorkspaceRole('owner', 'admin',
'recruiter', 'viewer')`. Validates `jobId` ownership and ISO date bounds;
returns `404` for inaccessible client/job. Covered by
`apps/api/test/blinkfy/analyticsRoute.test.js` (42/42 passing, including
cross-workspace and cross-client isolation cases).

## Task 3 — Recruiter analytics dashboard

Status: done, merged in PR #36 (`feat: add Blinkfy Hire analytics dashboard`).

`/hire/analytics` page with job/date filters and an explicit
loading/empty/error/ready state machine. `AnalyticsDashboard` is a
presentational component that renders `AnalyticsSummary` from
`@recruitment-platform/shared`; conversion `null` renders as "No sample"
rather than `0%`. Navigation link added from `/hire`. Covered by
`apps/web/test/analytics.spec.tsx` (10 tests).

## Task 4 — E2E analytics acceptance and pilot documentation

Status: done.

Extended `apps/api/test/blinkfy/hireCore.e2e.test.js`: after the pilot
candidate reaches `shortlisted`, the test calls the client's analytics
endpoint and asserts total applications, the `shortlisted` count, active
consent and score count, then creates a second client in the same workspace
and asserts its analytics response excludes the first client's application.

Updated `docs/blinkfy-hire-pilot.md` with an "Analytics operacional" section
covering the dashboard URL, filter semantics (UTC, inclusive `from` /
exclusive `to`), the `null`-conversion-as-"no sample" rule, why incomplete
stage durations are excluded from the average, and that analytics never
makes hiring decisions.

## Outcome

All four tasks of the plan are complete. Two PRs merged (#35, #36); this
task's E2E extension and documentation update land in a third PR.
