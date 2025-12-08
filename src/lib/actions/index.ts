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

