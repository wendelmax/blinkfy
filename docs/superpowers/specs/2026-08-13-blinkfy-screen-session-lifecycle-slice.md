# Blinkfy Screen session lifecycle

Screen sessions now support the full operational state sequence: scheduled → in progress → completed. The API records start and completion timestamps, while completion requires both transcript and insight evidence. This prevents a session from appearing complete when its review material is missing.

The recruiter UI exposes start and complete actions alongside the existing invite, consent, schedule, and withdraw controls. Voice-provider execution remains an integration boundary; these actions are explicit lifecycle markers and never represent an automated hiring decision.
