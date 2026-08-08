export type ApplicationStage = 'mapped' | 'reviewed' | 'interested' | 'screened' | 'shortlisted' | 'rejected';
export type FitScoreConfidence = 'low' | 'medium' | 'high';

export interface ScoreFactor {
    key: 'skills' | 'experience' | 'context' | 'preferences' | 'signals';
    weight: number;
    score: number;
    evidence: string[];
}

export interface FitScore {
    score: number;
    confidence: FitScoreConfidence;
    factors: ScoreFactor[];
    gaps: string[];
    overrideScore?: number | null;
    overrideReason?: string | null;
}

export interface JobScorecardWeights {
    skills: number;
    experience: number;
    context: number;
    preferences: number;
    signals: number;
}

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

export const applicationStages: ApplicationStage[] = [
    'mapped',
    'reviewed',
    'interested',
    'screened',
    'shortlisted',
    'rejected',
];

export const nextStage: Partial<Record<ApplicationStage, ApplicationStage>> = {
    mapped: 'reviewed',
    reviewed: 'interested',
    interested: 'screened',
    screened: 'shortlisted',
};
