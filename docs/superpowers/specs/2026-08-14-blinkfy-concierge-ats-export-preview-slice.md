# Blinkfy Concierge — ATS export preview

This slice advances issue #33 with a provider-neutral export contract for
Greenhouse, Lever and Workable. It deliberately creates a reviewable preview,
not an outbound integration.

## Guardrails

- An application must belong to the authenticated workspace and job.
- An active `client_presentation` consent is required; revoked consent blocks the preview.
- The preview contains only normalized candidate and job fields needed for an ATS handoff.
- `approved` and `transmitted` are always false until a future, separately authorized integration exists.
- Every preview creation produces a non-sensitive audit event.

The UI exposes the preview from the reviewed pipeline and clearly states that
no third-party system is contacted.
