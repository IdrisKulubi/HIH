/**
 * Matching Grant pipeline workflow helpers (client-safe).
 */

import type { A2fPipelineStatus } from "@/lib/a2f-constants";
import { PIPELINE_STAGE_LABELS } from "@/lib/a2f-constants";

export type WorkflowItemStatus = "complete" | "in_progress" | "pending" | "blocked";

export interface WorkflowChecklistItem {
    id: string;
    label: string;
    description: string;
    href: string;
    status: WorkflowItemStatus;
}

export interface WorkflowNextAction {
    label: string;
    description: string;
    href: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkflowEntryInput = Record<string, any>;

function mgSubmitted(entry: WorkflowEntryInput): boolean {
    const mg = entry.matchingGrantApplications?.[0];
    return mg?.status === "submitted";
}

function hasDd(entry: WorkflowEntryInput): boolean {
    return (entry.dueDiligenceReports?.length ?? 0) > 0;
}

function latestScoring(entry: WorkflowEntryInput) {
    return entry.scoringRecords?.[0] ?? null;
}

function isQualified(entry: WorkflowEntryInput): boolean {
    const score = latestScoring(entry);
    if (!score) return false;
    const revenue = (score.scores as { currentAnnualRevenue?: number })?.currentAnnualRevenue ?? 0;
    return score.totalScore >= 60 && revenue > 0;
}

function gairAppraisal(entry: WorkflowEntryInput) {
    return entry.investmentAppraisals?.find(
        (a: { documentType?: string }) => a.documentType === "gair"
    ) ?? null;
}

function icDecided(entry: WorkflowEntryInput): boolean {
    const gair = gairAppraisal(entry);
    return Boolean(gair?.icDecision);
}

function icCommitteeApproved(entry: WorkflowEntryInput): boolean {
    const gair = gairAppraisal(entry);
    const decision = gair?.icDecision;
    return decision === "approved" || decision === "approved_with_conditions";
}

function hasAgreement(entry: WorkflowEntryInput): boolean {
    return Boolean(entry.grantAgreements?.length || entry.grantAgreement);
}

function agreementExecuted(entry: WorkflowEntryInput): boolean {
    const agr = entry.grantAgreements?.[0] ?? entry.grantAgreement;
    return Boolean(agr?.isFullyExecuted);
}

export function buildWorkflowChecklist(a2fId: number, entry: WorkflowEntryInput): WorkflowChecklistItem[] {
    const base = `/a2f/${a2fId}`;
    const mg = entry.matchingGrantApplications?.[0];
    const mgDraft = mg && mg.status !== "submitted";
    const mgDone = mgSubmitted(entry);
    const ddDone = hasDd(entry);
    const scored = Boolean(latestScoring(entry));
    const qualified = isQualified(entry);
    const gair = gairAppraisal(entry);
    const gairDraft = gair && !gair.icDecision;
    const icDone = icDecided(entry);
    const agr = hasAgreement(entry);
    const signed = agreementExecuted(entry);

    return [
        {
            id: "application",
            label: "Matching Grant application",
            description: mgDone ? "Submitted" : mgDraft ? "Draft in progress" : "Not started",
            href: `${base}/matching-grant`,
            status: mgDone ? "complete" : mgDraft ? "in_progress" : "pending",
        },
        {
            id: "dd",
            label: "Due diligence",
            description: ddDone ? `${entry.dueDiligenceReports?.length ?? 0} report(s)` : "Initial DD workspace",
            href: `${base}/due-diligence`,
            status: ddDone ? "complete" : mgDone ? "in_progress" : "pending",
        },
        {
            id: "scoring",
            label: "Pre-IC scoring",
            description: scored
                ? `Score on record${qualified ? " — Qualified" : ""}`
                : "Score using Matching Grant rubric",
            href: `${base}/scoring`,
            status: scored && qualified ? "complete" : scored ? "blocked" : ddDone ? "in_progress" : "pending",
        },
        {
            id: "gair",
            label: "GAIR & IC decision",
            description: icDone
                ? `IC: ${String(gair?.icDecision).replace(/_/g, " ")}`
                : gair ? "GAIR draft — record IC decision"
                : "Prepare GAIR for committee",
            href: `${base}/appraisal`,
            status: icDone ? "complete" : gairDraft || qualified ? "in_progress" : qualified ? "pending" : "pending",
        },
        {
            id: "contract",
            label: "Grant agreement",
            description: signed ? "Fully executed" : agr ? "Offer / signing in progress" : "Generate agreement",
            href: `${base}/contracts`,
            status: signed ? "complete" : agr ? "in_progress" : icDone ? "in_progress" : "pending",
        },
        {
            id: "grant_mgmt",
            label: "Procurement & milestones",
            description: "Track procurement, milestones, and verification",
            href: `${base}/grant-management`,
            status: signed ? "in_progress" : "pending",
        },
        {
            id: "disbursements",
            label: "Disbursements",
            description: "Log and verify tranche disbursements",
            href: `${base}/disbursements`,
            status: signed ? "in_progress" : "pending",
        },
    ];
}

export function getWorkflowNextAction(a2fId: number, entry: WorkflowEntryInput): WorkflowNextAction {
    const base = `/a2f/${a2fId}`;
    const status = entry.status as A2fPipelineStatus;

    if (!mgSubmitted(entry)) {
        return {
            label: "Complete Matching Grant application",
            description: "Capture enterprise details, budget, and supporting documents.",
            href: `${base}/matching-grant`,
        };
    }
    if (!hasDd(entry)) {
        return {
            label: "Begin due diligence",
            description: "Complete the initial DD workspace for this enterprise.",
            href: `${base}/due-diligence`,
        };
    }
    if (!latestScoring(entry)) {
        return {
            label: "Score application",
            description: "Apply the Foundation or Accelerator Matching Grant rubric.",
            href: `${base}/scoring`,
        };
    }
    if (!isQualified(entry)) {
        return {
            label: "Review scoring outcome",
            description: "Enterprise did not qualify — review score and refer for TA if needed.",
            href: `${base}/scoring`,
        };
    }
    if (!gairAppraisal(entry)) {
        return {
            label: "Prepare GAIR",
            description: "Auto-populate and complete the Grant Appraisal report.",
            href: `${base}/appraisal`,
        };
    }
    if (!icDecided(entry)) {
        return {
            label: "Await committee decision",
            description: "Committee must approve, approve with conditions, defer, or decline on the GAIR.",
            href: `${base}/appraisal`,
        };
    }
    if (!icCommitteeApproved(entry)) {
        const gair = gairAppraisal(entry);
        return {
            label: "Committee did not approve contracting",
            description: `Decision: ${String(gair?.icDecision ?? "pending").replace(/_/g, " ")}. Agreement cannot be issued until approved.`,
            href: `${base}/appraisal`,
        };
    }
    if (!hasAgreement(entry)) {
        return {
            label: "Generate grant agreement",
            description: "Committee approved — create the matching grant offer and agreement.",
            href: `${base}/contracts`,
        };
    }
    if (!agreementExecuted(entry)) {
        return {
            label: "Execute grant agreement",
            description: "Send offer letter and upload the signed contract.",
            href: `${base}/contracts`,
        };
    }
    if (status === "disbursement_active" || status === "post_ta_monitoring") {
        return {
            label: "Grant management & disbursements",
            description: "Track milestones, procurement, and verified disbursements.",
            href: `${base}/grant-management`,
        };
    }

    const stageHints: Partial<Record<A2fPipelineStatus, WorkflowNextAction>> = {
        pre_ic_scoring: {
            label: "Continue to scoring",
            description: "Complete Pre-IC scoring for this enterprise.",
            href: `${base}/scoring`,
        },
        ic_appraisal_review: {
            label: "Continue GAIR / IC review",
            description: "Finalize GAIR and record the Investment Committee decision.",
            href: `${base}/appraisal`,
        },
        offer_issued: {
            label: "Contracting",
            description: "Issue and track the grant agreement.",
            href: `${base}/contracts`,
        },
        contracting: {
            label: "Complete contracting",
            description: "Obtain signatures on the grant agreement.",
            href: `${base}/contracts`,
        },
    };

    return stageHints[status] ?? {
        label: `Continue: ${PIPELINE_STAGE_LABELS[status] ?? status}`,
        description: "Open the overview checklist for this enterprise.",
        href: base,
    };
}

export function getPipelineListHint(
    entry: WorkflowEntryInput & { status?: string; ddReportsCount?: number; hasGrantAgreement?: boolean }
): string {
    if (entry.matchingGrantApplications || entry.dueDiligenceReports) {
        if (!mgSubmitted(entry)) return "MG application";
        if (!hasDd(entry)) return "Due diligence";
        if (!latestScoring(entry)) return "Scoring";
        if (!isQualified(entry)) return "Not qualified";
        if (!icDecided(entry)) return "GAIR / IC";
        if (!agreementExecuted(entry)) return "Contracting";
        return "Grant ops";
    }

    const status = entry.status ?? "";
    const hints: Record<string, string> = {
        a2f_pipeline: "MG application",
        due_diligence_initial: (entry.ddReportsCount ?? 0) > 0 ? "Scoring" : "Due diligence",
        pre_ic_scoring: "Scoring",
        ic_appraisal_review: "GAIR / IC",
        offer_issued: "Contracting",
        contracting: entry.hasGrantAgreement ? "Sign agreement" : "Contracting",
        disbursement_active: "Disbursements",
        post_ta_monitoring: "Monitoring",
    };
    return hints[status] ?? "Review";
}
