# Blinkfy Talent pilot

Blinkfy Talent adds a candidate-controlled discovery layer to the existing Blinkfy Hire workflow. Candidates can create and maintain a professional profile at no cost; recruiters and companies pay for sourcing, pipeline management and qualified presentations.

## Pilot scope

- Candidate account and profile are free at launch.
- A candidate starts as `private` and may switch to `available`, `recruiters_only` or `paused`.
- Visibility is not consent. A recruiter presentation requires an active `client_presentation` consent for the target client.
- A candidate can revoke consent immediately. Revocation blocks new presentations and preserves an append-only audit trail for authorized operators.
- Recruiter-facing responses contain safe identity fields only. Private contact details, consent evidence and private documents are not returned by candidate presentation endpoints.
- Existing recruiter-imported candidates without a candidate account continue to use the legacy Hire flow.

## Candidate monetization boundary

The free candidate tier is the acquisition and network layer. A future Premium Engagement tier may offer AI-assisted drafts for profile content, comments, connection notes and follow-ups, plus value-network recommendations. Drafts require candidate approval and official, permissioned integrations; the pilot does not scrape LinkedIn, automate browser logins, evade platform controls or publish autonomous outreach.

Premium pricing, entitlements and payments are intentionally outside the pilot. The first paid surface is recruiter/company sourcing and workflow value, not candidate access.

## Acceptance flow

1. Candidate signs up and completes a safe professional profile.
2. Profile remains private until the candidate chooses a visibility state.
3. Recruiter sees a candidate only after the visibility policy and client-specific consent both pass.
4. Recruiter can move the resulting presentation through the existing Hire pipeline.
5. Candidate revocation blocks future presentations; audit history remains restricted to authorized operators.

## Pilot guardrails

- No protected attributes are used for ranking, recommendations or visibility decisions.
- Human review remains required for recruiter decisions and any future candidate engagement draft.
- Consent, workspace and client scope are checked server-side on every presentation.
- The pilot uses official APIs or approved integrations only. Rate-limit compliance and provider terms are product requirements, not evasion targets.

## Success measures

- Candidate profile completion and consent opt-in rate.
- Qualified presentation rate and recruiter acceptance of presented candidates.
- Time from candidate opt-in to first qualified presentation.
- Revocation handling latency and zero unauthorized presentation incidents.
