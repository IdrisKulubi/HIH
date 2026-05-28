/**
 * A2F / Matching Grant module shared constants, types, and pure helpers.
 * Safe to import in both client and server components.
 */

export type A2fPipelineStatus =
    | 'a2f_pipeline'
    | 'due_diligence_initial'
    | 'pre_ic_scoring'
    | 'ic_appraisal_review'
    | 'offer_issued'
    | 'contracting'
    | 'disbursement_active'
    | 'post_ta_monitoring';

/** All pipeline entries use the Matching Grant instrument. */
export type A2fInstrumentType = 'matching_grant';
export type A2fEnterpriseTrack = 'foundation' | 'acceleration';

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

/** Matching Grant scoring breakdown - max 100 points, May 2026 A2F rubric. */
export interface MatchingGrantScores {
    currentAnnualRevenue: number;       // max 10, revenue hard gate
    revenueGrowthTrend: number;         // max 5
    coInvestmentCommitment: number;     // max 5
    marketDemandEvidence: number;       // max 8
    businessModelScalability: number;   // max 8
    competitiveDifferentiation: number; // max 9
    projectedDecentJobs: number;        // max 10
    inclusionTargeting: number;         // max 10
    environmentalClimateImpact: number; // max 10
    useOfFundsQuality: number;          // max 7
    leveragePotential: number;          // max 8
    innovation: number;                 // max 10
}

export const MATCHING_GRANT_MAX_TOTAL = 100;
export const MATCHING_GRANT_QUALIFYING_SCORE = 60;

export const MATCHING_MAX_SCORES: Record<keyof MatchingGrantScores, number> = {
    currentAnnualRevenue: 10,
    revenueGrowthTrend: 5,
    coInvestmentCommitment: 5,
    marketDemandEvidence: 8,
    businessModelScalability: 8,
    competitiveDifferentiation: 9,
    projectedDecentJobs: 10,
    inclusionTargeting: 10,
    environmentalClimateImpact: 10,
    useOfFundsQuality: 7,
    leveragePotential: 8,
    innovation: 10,
};

export type ScoringPayload = {
    instrumentType: 'matching_grant';
    scores: MatchingGrantScores;
};

export type MatchingGrantQualificationStatus =
    | 'Qualified'
    | 'Not Qualified - Score'
    | 'Ineligible - Revenue'
    | 'Refer for TA Support';

/** Track-level revenue gate for Matching Grant application submit (May 2026 brief). */
export function isMatchingGrantTrackEligible(
    track: A2fEnterpriseTrack | null | undefined,
    annualRevenue: number
): boolean {
    if (annualRevenue <= 0) return false;
    if (track === 'acceleration') return annualRevenue > 3_000_000;
    return annualRevenue >= 500_000 && annualRevenue <= 3_000_000;
}

/** User-facing message when revenue fails the track gate; null when eligible or revenue missing. */
export function getMatchingGrantRevenueEligibilityMessage(
    track: A2fEnterpriseTrack | null | undefined,
    annualRevenue: number
): string | null {
    if (annualRevenue <= 0) {
        return 'Annual revenue is required before submitting the Matching Grant application.';
    }
    if (track === 'acceleration') {
        if (annualRevenue <= 3_000_000) {
            return 'Accelerator Track enterprises must have annual revenue above KES 3,000,000. This application cannot be submitted.';
        }
        return null;
    }
    if (annualRevenue < 500_000) {
        return 'Foundation Track enterprises must have annual revenue from KES 500,000 to KES 3,000,000. Reported revenue is below the minimum.';
    }
    if (annualRevenue > 3_000_000) {
        return 'Foundation Track enterprises must have annual revenue from KES 500,000 to KES 3,000,000. Reported revenue exceeds the Foundation range.';
    }
    return null;
}

export type RevenueGateActionId =
    | 'assign_accelerator'
    | 'assign_foundation'
    | 'edit_revenue'
    | 'open_mg_financials';

export type RevenueGateAction = {
    id: RevenueGateActionId;
    label: string;
    variant: 'default' | 'outline';
};

export type RevenueGateUxDetail = {
    revenueScore: number;
    isEligible: boolean;
    ruleSummary: string;
    ineligibilityReason: string | null;
    suggestedAction: string | null;
    /** Foundation track only: where reported revenue sits vs 500k–3M band */
    foundationRangeHint: 'below' | 'within' | 'above' | null;
    actions: RevenueGateAction[];
};

function buildRevenueGateActions(
    track: A2fEnterpriseTrack | null | undefined,
    annualRevenue: number,
    isEligible: boolean
): RevenueGateAction[] {
    if (isEligible) return [];

    const editRevenue: RevenueGateAction = {
        id: 'edit_revenue',
        label: 'Update verified revenue',
        variant: 'outline',
    };
    const openFinancials: RevenueGateAction = {
        id: 'open_mg_financials',
        label: 'Open Financials step',
        variant: 'outline',
    };

    if (annualRevenue <= 0) {
        return [editRevenue, openFinancials];
    }

    if (track === 'acceleration') {
        if (annualRevenue <= 3_000_000) {
            return [
                { id: 'assign_foundation', label: 'Assign Foundation track', variant: 'default' },
                editRevenue,
                openFinancials,
            ];
        }
        return [];
    }

    if (annualRevenue > 3_000_000) {
        return [
            { id: 'assign_accelerator', label: 'Assign Accelerator track', variant: 'default' },
            editRevenue,
            openFinancials,
        ];
    }

    if (annualRevenue < 500_000) {
        return [editRevenue, openFinancials];
    }

    return [];
}

function formatKesAmount(amount: number): string {
    return `KES ${amount.toLocaleString('en-KE')}`;
}

/** Actionable copy for scoring UI when revenue hard gate applies. */
export function getRevenueGateUxDetail(
    track: A2fEnterpriseTrack | null | undefined,
    annualRevenue: number
): RevenueGateUxDetail {
    const revenueScore = getMatchingGrantRevenueScore(track, annualRevenue);
    const isEligible = revenueScore > 0;
    const ruleSummary = track === 'acceleration'
        ? 'Accelerator requires verified annual revenue above KES 3,000,000.'
        : 'Foundation requires verified annual revenue from KES 500,000 to KES 3,000,000 (inclusive).';

    let ineligibilityReason: string | null = null;
    let suggestedAction: string | null = null;
    let foundationRangeHint: RevenueGateUxDetail['foundationRangeHint'] = null;

    if (!isEligible) {
        if (annualRevenue <= 0) {
            ineligibilityReason = 'Annual revenue is not set on this application.';
            suggestedAction = 'Enter verified annual revenue before scoring.';
        } else if (track === 'acceleration') {
            if (annualRevenue <= 3_000_000) {
                ineligibilityReason = `Reported revenue (${formatKesAmount(annualRevenue)}) is at or below the Accelerator minimum of KES 3,000,000.`;
                suggestedAction = 'Assign Foundation track if revenue is within KES 500,000–3,000,000, or update verified revenue.';
            }
        } else {
            if (annualRevenue < 500_000) {
                foundationRangeHint = 'below';
                ineligibilityReason = `Reported revenue (${formatKesAmount(annualRevenue)}) is below the Foundation minimum of KES 500,000.`;
                suggestedAction = 'Update verified revenue on the Matching Grant application.';
            } else if (annualRevenue > 3_000_000) {
                foundationRangeHint = 'above';
                ineligibilityReason = `Reported revenue (${formatKesAmount(annualRevenue)}) exceeds the Foundation maximum of KES 3,000,000.`;
                suggestedAction = 'Assign Accelerator track or correct verified revenue if the amount is wrong.';
            }
        }
    } else if (track !== 'acceleration') {
        foundationRangeHint = 'within';
    }

    const actions = buildRevenueGateActions(track, annualRevenue, isEligible);

    return {
        revenueScore,
        isEligible,
        ruleSummary,
        ineligibilityReason,
        suggestedAction,
        foundationRangeHint,
        actions,
    };
}

export function getMatchingGrantRevenueScore(
    track: A2fEnterpriseTrack | null | undefined,
    annualRevenue: number
): number {
    if (track === 'acceleration') {
        if (annualRevenue > 5_000_000) return 10;
        if (annualRevenue >= 3_500_000 && annualRevenue <= 5_000_000) return 6;
        if (annualRevenue >= 3_000_000 && annualRevenue < 3_500_000) return 3;
        return 0;
    }

    if (annualRevenue > 2_000_000 && annualRevenue <= 3_000_000) return 10;
    if (annualRevenue >= 1_000_000 && annualRevenue <= 2_000_000) return 6;
    if (annualRevenue >= 500_000 && annualRevenue < 1_000_000) return 3;
    return 0;
}

export function getMatchingGrantQualification(
    totalScore: number,
    revenueScore: number
): MatchingGrantQualificationStatus {
    if (revenueScore <= 0) return 'Ineligible - Revenue';
    if (totalScore >= MATCHING_GRANT_QUALIFYING_SCORE) return 'Qualified';
    return 'Refer for TA Support';
}

export function normalizeMatchingGrantScores(
    scores: Partial<MatchingGrantScores>,
    revenueScore?: number
): MatchingGrantScores {
    return {
        currentAnnualRevenue: revenueScore ?? Number(scores.currentAnnualRevenue ?? 0),
        revenueGrowthTrend: Number(scores.revenueGrowthTrend ?? 0),
        coInvestmentCommitment: Number(scores.coInvestmentCommitment ?? 0),
        marketDemandEvidence: Number(scores.marketDemandEvidence ?? 0),
        businessModelScalability: Number(scores.businessModelScalability ?? 0),
        competitiveDifferentiation: Number(scores.competitiveDifferentiation ?? 0),
        projectedDecentJobs: Number(scores.projectedDecentJobs ?? 0),
        inclusionTargeting: Number(scores.inclusionTargeting ?? 0),
        environmentalClimateImpact: Number(scores.environmentalClimateImpact ?? 0),
        useOfFundsQuality: Number(scores.useOfFundsQuality ?? 0),
        leveragePotential: Number(scores.leveragePotential ?? 0),
        innovation: Number(scores.innovation ?? 0),
    };
}

/**
 * Pure validation - checks every category score stays within its cap.
 * Returns an error string, or null if valid.
 */
export function validateScoringWeights(payload: ScoringPayload): string | null {
    const s = payload.scores;
    for (const [key, max] of Object.entries(MATCHING_MAX_SCORES) as [keyof MatchingGrantScores, number][]) {
        const val = s[key];
        if (val < 0 || val > max) {
            return `'${key}' must be between 0 and ${max}. Got ${val}.`;
        }
    }
    return null;
}
