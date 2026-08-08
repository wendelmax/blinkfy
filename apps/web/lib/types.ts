import { APPLICATION_STAGES, NEXT_APPLICATION_STAGE, type AnalyticsSummary, type ApplicationStage, type FitScoreConfidence, type FitScore as SharedFitScore, type JobScorecardWeights } from '@recruitment-platform/shared';

export { APPLICATION_STAGES, NEXT_APPLICATION_STAGE };
export type { AnalyticsSummary, ApplicationStage, FitScoreConfidence, JobScorecardWeights };

export type FitScore = SharedFitScore;

export interface BlinkfyJob {
    id: string;
    clientId: string;
    title: string;
    description?: string | null;
    location?: string | null;
    workModel?: string | null;
    requirements: string[];
    status: 'draft' | 'open' | 'closed';
    scorecard: { weights: JobScorecardWeights };
}

export interface PipelineApplication {
    id: string;
    candidateId: string;
    fullName: string;
    currentTitle?: string | null;
    stage: ApplicationStage;
    consentRecorded: boolean;
    score?: FitScore | null;
}

export interface CandidateImportResult {
    import: { id: string };
    created: number;
    candidates: Array<{ id: string; fullName: string }>;
    duplicates: Array<{ id: string; row: number }>;
    invalidRows: Array<{ row: number; field: string; message: string }>;
}
