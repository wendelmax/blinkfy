# Blinkfy Screen evidence ingestion

The recruiter dossier now exposes the consent-gated evidence endpoint through a form for transcript, recording, and insight entries. Each entry can include a URI or content, confidence, and retention deadline; newly saved evidence appears immediately in the dossier.

The API remains the source of truth and audit trail. This slice does not upload binary audio or invoke a voice provider; those integrations can use the same evidence contract later.
