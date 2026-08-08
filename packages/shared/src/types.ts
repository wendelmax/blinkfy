/**
 * Shared types for API and Web
 */

export type UserType = "candidate" | "recruiter" | "company" | "admin";

export type WorkspaceRole = "owner" | "admin" | "recruiter" | "viewer";

export type TalentJobStatus = "draft" | "open" | "closed";

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
  salaryMin?: number | null;
  salaryMax?: number | null;
  requirements: string[];
  status: TalentJobStatus;
  scorecard: { weights: JobScorecardWeights };
}

export type ApplicationStage = "mapped" | "reviewed" | "interested" | "screened" | "shortlisted" | "rejected";
export type AnalyticsStage = ApplicationStage;

export interface AnalyticsScope {
  clientId: string;
  jobId?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface StageMetrics {
  [stage: string]: number;
}

export interface ConversionMetrics {
  [transition: string]: number | null;
}

export interface ConsentMetrics { active: number; revoked: number; missing: number }
export interface ScoreMetrics { count: number; average: number | null; minimum: number | null; maximum: number | null }
export interface AnalyticsSummary {
  scope: AnalyticsScope;
  applications: { total: number; byStage: StageMetrics };
  conversion: ConversionMetrics;
  stageTime: { [stage: string]: { averageSeconds: number | null; sampleSize: number } };
  consent: ConsentMetrics;
  score: ScoreMetrics;
  generatedAt: string;
}
export type FitScoreConfidence = "low" | "medium" | "high";

export interface FactorEvidence {
  key: "skills" | "experience" | "context" | "preferences" | "signals";
  weight: number;
  score: number;
  evidence: string[];
}

export interface FitScore {
  score: number;
  confidence: FitScoreConfidence;
  factors: FactorEvidence[];
  gaps: string[];
  overrideScore?: number | null;
  overrideReason?: string | null;
}

export interface CandidateApplication {
  id: string;
  candidateId: string;
  clientId: string;
  jobId?: string | null;
  stage: ApplicationStage;
  score?: FitScore | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  name?: string;
  type: UserType;
  emailVerified?: boolean;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  primaryStack?: string | null;
  experienceLevel?: string | null;
  englishLevel?: string | null;
  salaryExpectationUsd?: number | null;
  taxResidence?: string | null;
  taxId?: string | null;
  cityState?: string | null;
  eScore?: number | null;
  speechScore?: number | null;
  readinessScore?: number | null;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  website?: string | null;
  size?: string | null;
  roleTypes?: string | null;
  hiringVolume?: string | null;
  companyType: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  type: string;
  salary: string;
  stack: string[];
  postedAt: string;
  description?: string | null;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  role: string;
  eScore: number;
  stage: string;
  createdAt: string;
}

export interface RecruiterCampaign {
  id: string;
  title: string;
  referralId: string;
}

export interface RecruiterTopCandidate {
  name: string;
  role: string;
  eScore: number;
  roi: string;
}

export interface RecruiterTools {
  campaigns: RecruiterCampaign[];
  topCandidates: RecruiterTopCandidate[];
}
