# Blinkfy Screen interactive session slice

The recruiter pipeline now exposes the existing Screen session contract in a sequential control:

1. Invite a candidate to screening.
2. Record consent only after an explicit candidate opt-in, including the consent version.
3. Schedule the session only after consent exists.
4. Withdraw an active session when needed.

The UI never schedules or starts a session without consent and does not imply that an automated score is a hiring decision. Voice/channel execution and candidate-facing consent capture remain separate integrations for the next phase.
