/** Shared pipeline stage and IC decision styling for A2F officer and committee UIs. */

export type StageStyle = { label: string; color: string; bg: string };

export const STAGE_CONFIG: Record<string, StageStyle> = {
    a2f_pipeline: { label: "In Pipeline", color: "text-slate-700", bg: "bg-slate-100" },
    due_diligence_initial: { label: "Initial DD", color: "text-blue-700", bg: "bg-blue-100" },
    pre_ic_scoring: { label: "Pre-IC Scoring", color: "text-violet-700", bg: "bg-violet-100" },
    ic_appraisal_review: { label: "IC Appraisal", color: "text-amber-700", bg: "bg-amber-100" },
    offer_issued: { label: "Offer Issued", color: "text-orange-700", bg: "bg-orange-100" },
    contracting: { label: "Contracting", color: "text-cyan-700", bg: "bg-cyan-100" },
    disbursement_active: { label: "Disbursing", color: "text-emerald-700", bg: "bg-emerald-100" },
    post_ta_monitoring: { label: "Post-TA Monitor", color: "text-green-700", bg: "bg-green-100" },
};

export function getStageStyle(status: string): StageStyle {
    return STAGE_CONFIG[status] ?? {
        label: status.replace(/_/g, " "),
        color: "text-slate-600",
        bg: "bg-slate-100",
    };
}

interface EffectivePipelineStatusInput {
    status: string;
    initialDdComplete?: boolean;
}

/**
 * Resolve the stage staff should see and filter by when workflow evidence is
 * ahead of the persisted pipeline status.
 */
export function getEffectivePipelineStatus(
    entry: EffectivePipelineStatusInput
): string {
    if (
        entry.initialDdComplete
        && ["a2f_pipeline", "due_diligence_initial"].includes(entry.status)
    ) {
        return "pre_ic_scoring";
    }

    return entry.status;
}

export type IcDecisionKey =
    | "approved"
    | "approved_with_conditions"
    | "deferred"
    | "declined"
    | "approved_by_donor"
    | "denied_by_donor"
    | "pending";

export type DecisionStyle = { label: string; color: string; bg: string };

export const DECISION_CONFIG: Record<IcDecisionKey, DecisionStyle> = {
    approved: { label: "Approved", color: "text-emerald-800", bg: "bg-emerald-100" },
    approved_with_conditions: {
        label: "Approved w/ conditions",
        color: "text-amber-800",
        bg: "bg-amber-100",
    },
    deferred: { label: "Deferred", color: "text-slate-700", bg: "bg-slate-100" },
    declined: { label: "Declined", color: "text-red-800", bg: "bg-red-100" },
    approved_by_donor: {
        label: "Approved by donor",
        color: "text-emerald-800",
        bg: "bg-emerald-100",
    },
    denied_by_donor: {
        label: "Denied by donor",
        color: "text-red-800",
        bg: "bg-red-100",
    },
    pending: { label: "Pending", color: "text-sky-800", bg: "bg-sky-100" },
};

export function getDecisionStyle(decision: string | null | undefined): DecisionStyle {
    if (!decision) return DECISION_CONFIG.pending;
    const key = decision as IcDecisionKey;
    return DECISION_CONFIG[key] ?? {
        label: decision.replace(/_/g, " "),
        color: "text-slate-700",
        bg: "bg-slate-100",
    };
}

export const DECISION_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All decisions" },
    { value: "pending", label: "Pending donor decision" },
    { value: "approved_by_donor", label: "Approved by donor" },
    { value: "denied_by_donor", label: "Denied by donor" },
];

/** Prefer donor outcome for committee list badges when recorded. */
export function committeeDecisionKey(
    donorDecision: string | null | undefined,
    icDecision: string | null | undefined
): string | null {
    if (donorDecision) return donorDecision;
    if (icDecision === "approved" || icDecision === "approved_with_conditions") {
        return "approved_by_donor";
    }
    if (icDecision === "declined") return "denied_by_donor";
    return icDecision ?? null;
}
