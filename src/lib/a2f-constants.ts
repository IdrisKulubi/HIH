/**
 * A2F module — shared constants, types, and pure helpers.
 * NOT a server action file — safe to import in both client and server components.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export type A2fPipelineStatus =
    | 'a2f_pipeline'
    | 'due_diligence_initial'
    | 'pre_ic_scoring'
    | 'ic_appraisal_review'
    | 'offer_issued'
    | 'contracting'
    | 'disbursement_active'
    | 'post_ta_monitoring';

export type A2fInstrumentType = 'matching_grant' | 'repayable_grant';

export const PIPELINE_STAGE_ORDER: A2fPipelineStatus[] = [
    'a2f_pipeline',
    'due_diligence_initial',
    'pre_ic_scoring',
    'ic_appraisal_review',
    'offer_issued',
    'contracting',
    'disbursement_active',
    'post_ta_monitoring',
];

export const PIPELINE_STAGE_LABELS: Record<A2fPipelineStatus, string> = {
    a2f_pipeline:          'In Pipeline',
    due_diligence_initial: 'Initial DD',
    pre_ic_scoring:        'Pre-IC Scoring',
    ic_appraisal_review:   'IC Appraisal',
    offer_issued:          'Offer Issued',
    contracting:           'Contracting',
    disbursement_active:   'Disbursing',
    post_ta_monitoring:    'Post-TA Monitor',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORING TYPES & RUBRICS
// ─────────────────────────────────────────────────────────────────────────────

/** Repayable Grant scoring breakdown — max 110 points */
export interface RepayableGrantScores {
    revenueCashFlow: number;         // max 15
    debtServiceCoverage: number;     // max 10
    collateralSecurity: number;      // max 10
    marketScalabilityStrength: number; // max 25
    impactInclusion: number;         // max 30
    investmentPlanSafeguards: number; // max 10
    bonusPoints: number;             // max 10
}

/** Matching Grant scoring breakdown — max 110 points */
export interface MatchingGrantScores {
    ownContributionPct: number;          // max 15
    financialManagementCapacity: number; // max 15
    marketScalabilityPotential: number;  // max 25
    impactInclusion: number;             // max 30
    investmentLeverage: number;          // max 15
    bonusPoints: number;                 // max 10
}

export const REPAYABLE_MAX_SCORES: Record<keyof RepayableGrantScores, number> = {
    revenueCashFlow: 15,
    debtServiceCoverage: 10,
    collateralSecurity: 10,
    marketScalabilityStrength: 25,
    impactInclusion: 30,
    investmentPlanSafeguards: 10,
    bonusPoints: 10,
};

export const MATCHING_MAX_SCORES: Record<keyof MatchingGrantScores, number> = {
    ownContributionPct: 15,
    financialManagementCapacity: 15,
    marketScalabilityPotential: 25,
    impactInclusion: 30,
    investmentLeverage: 15,
    bonusPoints: 10,
};

export type ScoringPayload =
    | { instrumentType: 'repayable_grant'; scores: RepayableGrantScores }
    | { instrumentType: 'matching_grant'; scores: MatchingGrantScores };

/**
 * Pure validation — checks every category score stays within its cap.
 * Returns an error string, or null if valid.
 */
export function validateScoringWeights(payload: ScoringPayload): string | null {
    if (payload.instrumentType === 'repayable_grant') {
        const s = payload.scores;
        for (const [key, max] of Object.entries(REPAYABLE_MAX_SCORES) as [keyof RepayableGrantScores, number][]) {
            const val = s[key];
            if (val < 0 || val > max) {
                return `'${key}' must be between 0 and ${max}. Got ${val}.`;
            }
        }
    } else {
        const s = payload.scores;
        for (const [key, max] of Object.entries(MATCHING_MAX_SCORES) as [keyof MatchingGrantScores, number][]) {
            const val = s[key];
            if (val < 0 || val > max) {
                return `'${key}' must be between 0 and ${max}. Got ${val}.`;
            }
        }
    }
    return null;
}
