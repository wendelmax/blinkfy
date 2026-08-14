# Blinkfy Concierge webhook outbox

Signed webhook previews are now persisted in a client-scoped outbox with a unique `(clientId, eventId)` key. Repeated previews are idempotent, status begins as `pending_approval`, and recruiters can inspect the latest 50 records through an authorized endpoint. No record is transmitted externally by this slice.
