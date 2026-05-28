/**
 * Matching Grant application wizard step config and per-step validation.
 * Client-safe.
 */

import type { ComponentType } from "react";
import {
    Buildings,
    Calculator,
    ClipboardText,
    Coins,
    ChartLineUp,
    FileText,
} from "@phosphor-icons/react";
import {
    type A2fEnterpriseTrack,
    getMatchingGrantRevenueEligibilityMessage,
    isMatchingGrantTrackEligible,
} from "@/lib/a2f-constants";
import {
    type EnterpriseIdentification,
    type LeadEntrepreneur,
    type MatchingGrantFinancialOverview,
    type MatchingGrantBudgetItem,
    resolveAnnualRevenueForEligibility,
    validateBudgetUseOfFunds,
} from "@/lib/matching-grant-form-types";
import {
    type MgSupportingDocumentRow,
    countMandatoryMgDocumentsEnclosed,
    validateMandatoryMgDocuments,
} from "@/lib/mg-supporting-documents";

export type MgWizardStepId =
    | "enterprise"
    | "financials"
    | "grant_request"
    | "business_impact"
    | "investment_plan"
    | "documents";

export interface MatchingGrantWizardForm {
    enterprise: EnterpriseIdentification;
    lead: LeadEntrepreneur;
    financial: MatchingGrantFinancialOverview;
    projectTitle: string;
    totalProjectAmount: number;
    bireGrantAmount: number;
    enterpriseContributionAmount: number;
    capexOnlyConfirmed: boolean;
    budgetItems: MatchingGrantBudgetItem[];
    declarationAccepted: boolean;
    useOfFundsAcknowledged: boolean;
    declarationName: string;
    documents: MgSupportingDocumentRow[];
}

export interface MatchingGrantWizardContext {
    track: A2fEnterpriseTrack;
    pipelineRevenue: number;
}

export interface MgWizardStep {
    id: MgWizardStepId;
    label: string;
    shortLabel: string;
    description: string;
    icon: ComponentType<{ className?: string; weight?: "duotone" | "regular" | "bold" }>;
}

export function getMgWizardStepIndex(stepId: MgWizardStepId | string | null | undefined): number {
    if (!stepId) return -1;
    return MG_WIZARD_STEPS.findIndex(s => s.id === stepId);
}

export const MG_WIZARD_STEPS: MgWizardStep[] = [
    {
        id: "enterprise",
        label: "Enterprise & Team",
        shortLabel: "Enterprise",
        description: "Identification, lead entrepreneur, owners, programme",
        icon: Buildings,
    },
    {
        id: "financials",
        label: "Financials & Eligibility",
        shortLabel: "Financials",
        description: "Revenue history and track eligibility",
        icon: ChartLineUp,
    },
    {
        id: "grant_request",
        label: "Grant Request",
        shortLabel: "Grant",
        description: "CAPEX request, funding, governance",
        icon: Coins,
    },
    {
        id: "business_impact",
        label: "Business & Impact",
        shortLabel: "Impact",
        description: "Market, projections, jobs and environment",
        icon: FileText,
    },
    {
        id: "investment_plan",
        label: "Investment Plan",
        shortLabel: "Plan",
        description: "Budget, milestones, job creation",
        icon: Calculator,
    },
    {
        id: "documents",
        label: "Documents & Submit",
        shortLabel: "Submit",
        description: "Supporting documents, declaration, review",
        icon: ClipboardText,
    },
];

export function wizardStorageKey(a2fId: number) {
    return `mg-wizard-step-${a2fId}`;
}

function pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/** Non-blocking guidance shown only on the Grant Request step. */
export function getGrantRequestGuidanceNotes(
    form: MatchingGrantWizardForm
): string[] {
    const notes: string[] = [];
    const grantShare = pct(form.bireGrantAmount, form.totalProjectAmount);
    const enterpriseShare = pct(form.enterpriseContributionAmount, form.totalProjectAmount);
    if (form.totalProjectAmount > 0 && grantShare > 70) {
        notes.push("BIRE share is above the standard 70% guidance.");
    }
    if (form.totalProjectAmount > 0 && enterpriseShare < 30) {
        notes.push("Enterprise contribution is below the standard 30% guidance.");
    }
    return notes;
}

export function getStepValidationErrors(
    stepId: MgWizardStepId,
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
): string[] {
    switch (stepId) {
        case "enterprise": {
            const errors: string[] = [];
            if (!form.enterprise.name.trim()) errors.push("Enterprise name is required.");
            if (!form.enterprise.county.trim()) errors.push("County / location is required.");
            if (!form.lead.name.trim()) errors.push("Lead entrepreneur name is required.");
            return errors;
        }
        case "financials": {
            const revenue = resolveAnnualRevenueForEligibility(form.financial, context.pipelineRevenue);
            if (revenue <= 0) {
                return ["Enter annual revenue (2025 or an earlier year) for eligibility checking."];
            }
            const gateMsg = getMatchingGrantRevenueEligibilityMessage(context.track, revenue);
            if (gateMsg) return [gateMsg];
            return [];
        }
        case "grant_request": {
            const errors: string[] = [];
            if (!form.projectTitle.trim()) errors.push("Project title is required.");
            if (form.totalProjectAmount <= 0) errors.push("Total project investment must be greater than zero.");
            if (!form.capexOnlyConfirmed) errors.push("Confirm CAPEX-only use for this grant request.");
            if (
                form.totalProjectAmount > 0
                && Math.abs(form.totalProjectAmount - (form.bireGrantAmount + form.enterpriseContributionAmount)) > 1
            ) {
                errors.push("BIRE grant and enterprise contribution must add up to total project amount.");
            }
            return errors;
        }
        case "business_impact":
            return [];
        case "investment_plan": {
            const errors: string[] = [];
            if (!form.useOfFundsAcknowledged) {
                errors.push(
                    "Confirm the budget excludes ineligible uses (personal expenses, loan repayments, unrelated overheads)."
                );
            }
            const filled = form.budgetItems.filter(row => row.item.trim());
            if (filled.length === 0) {
                errors.push("Add at least one budget line item.");
            } else {
                errors.push(...validateBudgetUseOfFunds(form.budgetItems));
            }
            return errors;
        }
        case "documents": {
            const errors: string[] = [];
            errors.push(...validateMandatoryMgDocuments(form.documents));
            if (!form.declarationName.trim()) errors.push("Applicant full name is required for declaration.");
            if (!form.declarationAccepted) {
                errors.push("Applicant declaration must be accepted.");
            }
            return errors;
        }
        default:
            return [];
    }
}

export function getAllStepValidationErrors(
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
): Record<MgWizardStepId, string[]> {
    const out = {} as Record<MgWizardStepId, string[]>;
    for (const step of MG_WIZARD_STEPS) {
        out[step.id] = getStepValidationErrors(step.id, form, context);
    }
    return out;
}

export function getFirstStepIndexWithErrors(
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
): number | null {
    const all = getAllStepValidationErrors(form, context);
    for (let i = 0; i < MG_WIZARD_STEPS.length; i++) {
        const stepId = MG_WIZARD_STEPS[i].id;
        if ((all[stepId]?.length ?? 0) > 0) return i;
    }
    return null;
}

export type StepErrorsGroup = {
    stepId: MgWizardStepId;
    stepLabel: string;
    stepIndex: number;
    errors: string[];
};

export function flattenStepErrorsWithLabels(
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
): StepErrorsGroup[] {
    const all = getAllStepValidationErrors(form, context);
    return MG_WIZARD_STEPS.map((step, stepIndex) => ({
        stepId: step.id,
        stepLabel: step.label,
        stepIndex,
        errors: all[step.id] ?? [],
    })).filter((group) => group.errors.length > 0);
}

export function getWizardReviewSummary(
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
) {
    const revenue = resolveAnnualRevenueForEligibility(form.financial, context.pipelineRevenue);
    const budgetLines = form.budgetItems.filter(row => row.item.trim()).length;
    const { enclosed: docsConfirmed, total: docsTotal } = countMandatoryMgDocumentsEnclosed(form.documents);

    return {
        enterpriseName: form.enterprise.name || "—",
        trackLabel: context.track === "acceleration" ? "Accelerator" : "Foundation",
        revenue,
        revenueEligible: isMatchingGrantTrackEligible(context.track, revenue),
        totalProject: form.totalProjectAmount,
        bireGrant: form.bireGrantAmount,
        enterpriseContribution: form.enterpriseContributionAmount,
        budgetLines,
        docsConfirmed,
        docsTotal,
        declarationAccepted: form.declarationAccepted,
        useOfFundsAcknowledged: form.useOfFundsAcknowledged,
    };
}
