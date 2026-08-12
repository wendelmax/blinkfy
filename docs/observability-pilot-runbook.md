# Blinkfy Pilot Observability Runbook

## What is emitted

The API emits one JSON object per operational event on stdout/stderr. Every HTTP
request receives an `x-request-id` response header; callers may provide one to
correlate gateway, API and support records. Never log candidate email, phone,
profile contents or access tokens.

Important events:

- `candidate.import_failed`: CSV/ATS import failed, with workspace/client,
  actor, filename and request ID.
- `api.unhandled_error`: an unhandled request failure, with method/path and
  request ID.
- `api.readiness_failed`: readiness could not reach Postgres.
- `api.shutdown_failed` and `api.shutdown_timeout`: process shutdown problems.

## Pilot checks

1. Check `/health` and `/ready` before enabling a pilot workspace.
2. For a reported failure, capture the UTC timestamp and `x-request-id` first.
3. Search the API log stream for that request ID and the event name.
4. For an import failure, preserve the `CandidateImport` record and its
   row-level errors; do not retry blindly. Correct the source and re-import.
5. If readiness is degraded, stop new imports, verify Postgres health and
   inspect `api.readiness_failed` before restarting the API.

## Escalation

Page the service owner for repeated readiness failures, data persistence
errors, or any event containing unexpected personal data. Redact logs before
sharing them externally. The pilot does not automate LinkedIn actions; an
incident must not be resolved by enabling scraping or unsolicited outreach.
