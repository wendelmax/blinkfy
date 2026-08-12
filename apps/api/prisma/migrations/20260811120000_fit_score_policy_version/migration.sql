ALTER TABLE "job_scorecards" ADD COLUMN "policyVersion" TEXT NOT NULL DEFAULT 'fit-score-v1';
ALTER TABLE "fit_score_snapshots" ADD COLUMN "policyVersion" TEXT NOT NULL DEFAULT 'fit-score-v1';
