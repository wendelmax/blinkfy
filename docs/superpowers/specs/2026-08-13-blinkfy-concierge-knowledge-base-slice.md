# Blinkfy Concierge knowledge base vertical slice

## Outcome

Recruiter teams can maintain client-scoped knowledge documents and retrieve relevant factual passages for human-reviewed Concierge drafts.

## Scope delivered

- Manual text document ingestion with validation and deterministic sentence chunking.
- Client-scoped persistence for documents and chunks with audit events.
- Search endpoint that ranks matching chunks and returns only grounded context.
- Workspace role and client access checks on every knowledge route.

## Guardrails

This slice does not call an LLM, send messages, or produce autonomous replies. Retrieved passages are context for a later human-approved response workflow. No cross-client search is permitted.
