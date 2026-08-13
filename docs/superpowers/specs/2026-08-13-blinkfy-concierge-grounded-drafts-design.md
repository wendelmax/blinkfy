# Blinkfy Concierge grounded response drafts

Human-reviewable, client-grounded response drafts for inbound Concierge messages. No autonomous sending or external LLM calls.

- Retrieve only client-scoped knowledge chunks.
- Return 422 when no factual context matches.
- Persist source message and grounding metadata for auditability.
- Reuse existing approval endpoints for all communication decisions.
