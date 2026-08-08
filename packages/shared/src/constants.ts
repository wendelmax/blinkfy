/**
 * Shared constants
 */

export const USER_TYPES = ["candidate", "recruiter", "company", "admin"] as const;

export const AUDIT_ACTIONS = {
  clientCreated: "client.created",
  jobCreated: "job.created",
  jobScorecardConfigured: "job.scorecard_configured",
  jobImported: "job.imported",
  jobImportFailed: "job.import_failed",
  candidateDuplicateDetected: "candidate.duplicate_detected",
  candidateShared: "candidate.shared",
  applicationScoreRecomputed: "application.score_recomputed",
  applicationStageChanged: "application.stage_changed",
  applicationRejected: "application.rejected",
  applicationScoreOverridden: "application.score_overridden",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const APPLICATION_STAGES = [
  "mapped",
  "reviewed",
  "interested",
  "screened",
  "shortlisted",
  "rejected",
] as const;

export const NEXT_APPLICATION_STAGE = {
  mapped: "reviewed",
  reviewed: "interested",
  interested: "screened",
  screened: "shortlisted",
} as const;

export const API_ROUTES = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
    verifyEmail: "/auth/verify-email",
    keycloakCallback: "/auth/keycloak-callback",
  },
  candidate: {
    profile: "/candidate/profile",
    syncProfile: "/candidate/sync-profile",
    interviewAssessment: "/candidate/interview-assessment",
  },
  company: "/company",
  dashboard: {
    metrics: "/dashboard/metrics",
    recruiterTools: "/dashboard/recruiter-tools",
  },
  payment: {
    walletSummary: "/payment/wallet-summary",
    recruiterEarnings: "/payment/recruiter-earnings",
  },
  job: {
    list: "/job/list",
    applications: "/job/applications",
    create: "/job/create",
    apply: "/job/apply",
  },
  metadata: {
    techStacks: "/metadata/tech-stacks",
  },
} as const;
