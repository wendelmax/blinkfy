# Blinkfy Concierge grounded drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate client-grounded Concierge response drafts from inbound messages while preserving mandatory human approval.

**Architecture:** Extend MessageSuggestion with source and grounding metadata. A deterministic service retrieves knowledge chunks and composes a conservative draft; an authorized recruiter endpoint persists it as `draft` for the existing queue.

**Tech Stack:** Node.js, Express, Prisma/PostgreSQL, Vitest, Next.js.

## Global Constraints

- No autonomous external communication.
- No draft without matching client-scoped context.
- Every generated draft remains `draft` until human approval or rejection.
- Preserve workspace/client authorization and audit events.

### Task 1: Grounded draft service

Files: create `apps/api/src/services/blinkfy/groundedDraftService.js`; test `apps/api/test/blinkfy/groundedDraft.test.js`.

Write failing tests for `buildGroundedDraft({ inboundMessage, matches })`, then implement deterministic composition from matched chunk content/titles and throw `NO_GROUNDING_CONTEXT` when matches are empty. Run the focused test and commit.

### Task 2: Persistence and API

Files: modify `apps/api/prisma/schema.prisma`, create migration `apps/api/prisma/migrations/20260813150000_grounded_message_suggestions/migration.sql`, modify `apps/api/src/controllers/blinkfy/messageSuggestionsController.js` and `apps/api/src/routes/blinkfy/applications.js`, test `apps/api/test/blinkfy/groundedDraftController.test.js`.

Add nullable `sourceMessageId` and JSON `grounding` to MessageSuggestion. Add an authorized `POST .../messages/grounded-draft` that resolves the application, inbound message, and client knowledge chunks, persists a draft plus audit event transactionally, and returns 422 without context.

### Task 3: Recruiter UI and docs

Modify `apps/web/components/hire/MessageSuggestions.tsx` and its test to add “Generate grounded draft” and show grounding/source labels. Run web tests and build. Update the design spec with final API details.

### Task 4: Delivery

Run full API/web tests, build, migration deployment and diff checks. Push a clean branch, wait for `test-and-build` and `docker-build`, fix failures, merge squash, and update issue #33.
