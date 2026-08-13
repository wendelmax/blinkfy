# Blinkfy Concierge inbound messages vertical slice

## Outcome

Recruiters can receive provider-neutral inbound messages for a candidate application and review them directly in the hiring pipeline.

## Scope delivered

- A secret-protected webhook accepts inbound messages from an external channel.
- `externalMessageId` makes delivery idempotent; retries return the original message without creating duplicates.
- Receipt is recorded in the existing audit stream with workspace and client provenance.
- Recruiter API exposes messages for an application, scoped through the existing workspace/client authorization.
- The pipeline renders the latest messages beside screening controls and suggestions.

## Explicit non-goals

This slice does not send messages, generate automatic replies, or make hiring decisions. Those behaviors remain human-controlled and can be added in a later qualification/RAG slice.

## Verification

API tests cover payload validation and secret verification. The web test covers the recruiter-facing message section. Migration and build checks must pass in CI before merge.
