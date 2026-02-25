/**
 * Shared constants
 */

export const USER_TYPES = ["candidate", "recruiter", "company", "admin"] as const;

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
