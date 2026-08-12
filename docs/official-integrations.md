# Official integrations

Blinkfy uses an **import-first** integration model. Candidate and job data can
enter the platform through a documented official API or an approved partner
connector. Every import must carry the workspace, actor and explicit consent
reference, so the resulting record can be audited and revoked.

The API integration registry (`officialIntegrationService`) is deliberately
small: adapters implement only `importCandidates(request)`. An adapter is
registered only with an approval/contract reference. This keeps provider
credentials and transport details outside the domain and makes provider
replacement safe.

The registry rejects browser automation, scraping, extensions, proxy/session
state and raw usernames, passwords or cookies. It does not attempt to bypass
provider limits or terms. LinkedIn Recruiter System Connect/CRM Connect can be
added only after the required Talent Solutions approval; until then, use CSV,
ATS exports or another permitted official integration.

## Adding an adapter

1. Obtain and record the provider approval or contract reference.
2. Implement `importCandidates(request)` using the provider's official API.
3. Keep tokens in the provider secret store; never include them in the import
   payload or audit event.
4. Build the request with `createImportRequest`, including consent and source.
5. Register the adapter and emit the normal candidate import/audit events.

The registry is an import boundary, not an outreach engine. Publishing,
messaging and autonomous activity remain outside this contract and require a
separate approved capability and human approval.
