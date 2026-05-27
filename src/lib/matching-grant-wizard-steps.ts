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
    documents: Array<{ confirmed: boolean; mandatory: string }>;
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
            return errors;
        }
        case "business_impact":
            return [];
        case "investment_plan": {
            const filled = form.budgetItems.filter(row => row.item.trim());
            if (filled.length === 0) {
                return ["Add at least one budget line item."];
            }
            return validateBudgetUseOfFunds(form.budgetItems);
        }
        case "documents": {
            const errors: string[] = [];
            if (!form.declarationName.trim()) errors.push("Applicant full name is required for declaration.");
            if (!form.declarationAccepted) {
                errors.push("Applicant declaration must be accepted.");
            }
            if (!form.useOfFundsAcknowledged) {
                errors.push("Confirm the budget excludes ineligible uses before submitting.");
            }
            return errors;
        }
        default:
            return [];
    }
}

export function getWizardReviewSummary(
    form: MatchingGrantWizardForm,
    context: MatchingGrantWizardContext
) {
    const revenue = resolveAnnualRevenueForEligibility(form.financial, context.pipelineRevenue);
    const budgetLines = form.budgetItems.filter(row => row.item.trim()).length;
    const docsConfirmed = form.documents.filter(d => d.confirmed).length;
    const docsTotal = form.documents.length;

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
