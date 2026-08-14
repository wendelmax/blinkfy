# Blinkfy Concierge unified inbox

This slice completes the recruiter-facing inbox view for a job. It aggregates provider-neutral inbound messages across all authorized applications, includes candidate and channel context, and orders messages newest first.

The endpoint is `GET /api/blinkfy/clients/:clientId/jobs/:jobId/inbox`. It is scoped by workspace role, client access, and job ownership. The UI renders the result above the reviewed pipeline.

No outbound message is sent and no candidate state is changed by reading the inbox.
