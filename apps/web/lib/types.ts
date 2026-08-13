import { APPLICATION_STAGES, NEXT_APPLICATION_STAGE, type AnalyticsSummary, type ApplicationStage, type CandidateTalentProfile, type CandidateVisibility, type FitScoreConfidence, type FitScore as SharedFitScore, type JobScorecardWeights } from '@recruitment-platform/shared';

export { APPLICATION_STAGES, NEXT_APPLICATION_STAGE };
export type { AnalyticsSummary, ApplicationStage, CandidateTalentProfile, CandidateVisibility, FitScoreConfidence, JobScorecardWeights };

export interface TalentConsentSummary {
    id: string;
    client: { id: string; name: string } | null;
    purpose: string;
    status: 'active' | 'revoked';
    grantedAt: string;
    revokedAt?: string | null;
    createdAt: string;
}

export interface TalentPositioningAnalytics {
    profileCompleteness: {
        completed: number;
        total: number;
        percentage: number;
        missing: string[];
    };
    visibility: CandidateVisibility;
    activeConsentCount: number;
    discoverability: 'enabled' | 'disabled';
    nextActions: string[];
}

export interface TalentDraft {
    requiresApproval: true;
    published: false;
    [key: string]: unknown;
}

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

export interface MessageSuggestion {
    id: string;
    applicationId: string;
    candidateName?: string;
    channel: 'linkedin' | 'email' | 'whatsapp';
    content: string;
    status: 'draft' | 'approved' | 'rejected';
    createdAt: string;
}

export type ScreeningSessionStatus = 'invited' | 'consented' | 'scheduled' | 'in_progress' | 'completed' | 'withdrawn';

export interface ScreeningSessionSummary {
    id: string;
    status: ScreeningSessionStatus;
    consentedAt?: string | null;
    consentVersion?: string | null;
    scheduledAt?: string | null;
}

export interface ScreeningFeedback {
    id: string;
    applicationId: string;
    reviewerId: string;
    status: 'positive' | 'neutral' | 'negative' | 'needs_review';
    note: string;
    createdAt: string;
}

export interface ScreeningDossier {
    application: PipelineApplication;
    session: { id: string; status: string; consentedAt: string; consentVersion?: string | null; scheduledAt?: string | null; completedAt?: string | null };
    evidences: Array<{ id: string; kind: 'recording' | 'transcript' | 'insight'; uri?: string | null; content?: string | null; confidence?: number | null }>;
    score?: FitScore | null;
    retention?: { expiredEvidenceIds: string[]; expiringCount: number };
    summary?: {
        status: string;
        consentVersion?: string | null;
        evidenceCount: number;
        evidenceByKind: { recording: boolean; transcript: boolean; insight: boolean };
        score?: number | null;
        reviewReady: boolean;
        requiresHumanReview: true;
    };
}

export interface ScreeningEvidence {
    id: string;
    kind: 'recording' | 'transcript' | 'insight';
    uri?: string | null;
    content?: string | null;
    confidence?: number | null;
    retentionUntil?: string | null;
}

export interface CandidateImportResult {
    import: { id: string };
    created: number;
    candidates: Array<{ id: string; fullName: string }>;
    duplicates: Array<{ id: string; row: number }>;
    invalidRows: Array<{ row: number; field: string; message: string }>;
}
