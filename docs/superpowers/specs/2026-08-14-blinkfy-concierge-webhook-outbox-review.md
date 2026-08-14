# Blinkfy Concierge — webhook outbox review

Webhook preview records can now be approved or rejected by an authorized
recruiter, admin, or owner through the client-scoped API. Decisions are
immutable after review, audited, and the response continues to state
`transmitted: false`.

This completes the human review lifecycle without calling any external webhook
endpoint. Delivery remains a separately authorized future integration.
