import type {
  CdpFocusCode,
  CdpPriorityLevel,
} from "@/lib/cdp/focus-areas";

export const CNA_REVIEWER_ROLES = [
  "mentor",
  "bds_edo",
  "investment_analyst",
  "mel",
] as const;

export type CnaReviewerRole = (typeof CNA_REVIEWER_ROLES)[number];

export const CNA_RATINGS = ["poor", "fair", "great"] as const;

export type CnaRating = (typeof CNA_RATINGS)[number];

export type CnaQuestionForScoring = {
  id: number;
  sectionCode: CdpFocusCode;
  sectionName: string;
  assignedRole: CnaReviewerRole;
};

export type CnaResponseForScoring = {
  questionId: number;
  ratingLabel: CnaRating;
  scoreValue?: number | string | null;
};

export type CnaWeightedResponse = CnaResponseForScoring & {
  sectionCode: CdpFocusCode;
  sectionName: string;
  questionWeight: number;
  scoreValue: number;
};

export type CnaSectionResult = {
  sectionCode: CdpFocusCode;
  sectionName: string;
  totalQuestions: number;
  answeredQuestions: number;
  sectionScore: number;
  priorityLevel: CdpPriorityLevel;
  isComplete: boolean;
};

export type CnaRoleCompletion = {
  role: CnaReviewerRole;
  totalQuestions: number;
  answeredQuestions: number;
  isComplete: boolean;
};

export type CnaAssessmentResult = {
  sections: CnaSectionResult[];
  roleCompletions: CnaRoleCompletion[];
  overallScore: number;
  isComplete: boolean;
  topRiskAreas: CnaSectionResult[];
  weightedResponses: CnaWeightedResponse[];
};
