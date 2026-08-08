/**
 * Shared types for API and Web
 */

export type UserType = "candidate" | "recruiter" | "company" | "admin";

export type WorkspaceRole = "owner" | "admin" | "recruiter" | "viewer";

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
