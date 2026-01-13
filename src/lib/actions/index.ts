/**
 * BIRE Portal Server Actions
 * 
 * This barrel file re-exports all server actions in a clean, organized manner.
 * 
 * NOTE: This file does NOT have "use server" because it exports both types
 * and server actions. The individual modules have "use server" directives.
 */

// =============================================================================
// TYPE EXPORTS (from types.ts - no "use server" needed for types)
// =============================================================================
export type {
    ActionResponse,
    PaginationMeta,
    PaginatedResponse,
    ActionError,
    ActionErrorCode,
} from "./types";

// =============================================================================
// BIRE APPLICATION SUBMISSIONS
// =============================================================================
export type {
    FoundationApplicationData,
    AccelerationApplicationData,
} from "./bire-applications";

export {
    submitFoundationApplication,
    submitAccelerationApplication,
    getUserApplication,
} from "./bire-applications";

// =============================================================================
// ADMIN APPLICATION MANAGEMENT
// =============================================================================
export type {
    ApplicationFilters,
    ApplicationListItem,
    ApplicationStats,
    DetailedApplication,
} from "./admin-applications";

export {
    getApplicationStats,
    getApplications,
    getApplicationById,
    updateApplicationStatus,
    saveEvaluation,
} from "./admin-applications";

// =============================================================================
// ANALYTICS
// =============================================================================
export {
    getBasicStats,
    getStatusDistribution,
    getCountryDistribution,
    getGenderDistribution,
    getSectorDistribution,
    getEvaluatorStats,
    getTopApplications,
    getScoringCriteriaStats,
    getEvaluatorPerformanceDetails,
    getAnalyticsDashboardData,
    getScoringAnalytics,
    getEvaluatorPerformance,
} from "./analytics";

// =============================================================================
// ELIGIBILITY
// =============================================================================
export { checkEligibility } from "./eligibility";

// =============================================================================
// BIRE SCORING ENGINE
// =============================================================================
export type { ScoringBreakdown, TrackScore } from "./bire-scoring";

export {
    scoreFoundationTrack,
    scoreAccelerationTrack,
    scoreApplication,
} from "./bire-scoring";

// =============================================================================
// TWO-TIER REVIEW SYSTEM (Blind Dual Review)
// =============================================================================
export {
    submitReview,
    submitReviewer1Review, // @deprecated - use submitReview
    submitReviewer2Review, // @deprecated - use submitReview
    lockApplication,
    unlockApplication,
    getReviewStatus,
} from "./two-tier-review";

// =============================================================================
// SCORING CONFIGURATION & PROGRESS
// =============================================================================
export {
    createScoringConfiguration,
    getScoringConfigurations,
    getActiveScoringConfiguration,
    activateScoringConfiguration,
    reEvaluateApplications,
    initializeDefaultScoringConfig,
} from "./scoring";

export {
    saveScoringProgress,
    getDetailedScores,
} from "./scoring-progress";

