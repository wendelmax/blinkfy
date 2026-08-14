# Blinkfy Concierge webhook subscriptions

Clients can configure one HTTPS webhook destination and an allowlist of Concierge domain events. Secrets are never returned by the read endpoint; changes are audited. The subscription is an integration boundary only: event delivery remains approval-gated and no browser credentials or autonomous candidate outreach are supported.
