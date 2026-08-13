# Blinkfy provider-neutral screening webhook

The API now accepts signed provider results at `/api/webhooks/screening/:sessionId`. Payloads are validated, duplicate `eventId` deliveries are idempotent, transcript/insight evidence is persisted, and completed sessions are marked complete only for complete results.

The contract is provider-neutral: Heroes AI, WebRTC, or another approved voice service can implement it without changing the screening domain. A shared secret protects the endpoint; production deployments must set `SCREENING_WEBHOOK_SECRET`.
