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
    type MatchingGrantValidationContext,
    type MatchingGrantValidationInput,
    type MgWizardStepId,
    getMatchingGrantStepValidationErrors,
    getMatchingGrantValidationErrors,
} from "@/lib/matching-grant-validation";
import {
    resolveAnnualRevenueForEligibility,
} from "@/lib/matching-grant-form-types";
import {
    countMandatoryMgDocumentsEnclosed,
} from "@/lib/mg-supporting-documents";

export type { MgWizardStepId, MatchingGrantValidationInput as MatchingGrantWizardForm };

export interface MatchingGrantWizardContext extends MatchingGrantValidationContext {}

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
        label: "Financial Overview",
        shortLabel: "Financials",
        description: "Revenue history and financial position",
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
    form: MatchingGrantValidationInput,
    context: MatchingGrantWizardContext
): string[] {
    return getMatchingGrantStepValidationErrors(stepId, form, context);
}

export function getAllStepValidationErrors(
    form: MatchingGrantValidationInput,
    context: MatchingGrantWizardContext
): Record<MgWizardStepId, string[]> {
    return getMatchingGrantValidationErrors(form, context);
}

export function getFirstStepIndexWithErrors(
    form: MatchingGrantValidationInput,
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
    form: MatchingGrantValidationInput,
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
    form: MatchingGrantValidationInput,
    context: MatchingGrantWizardContext
) {
    const revenue = resolveAnnualRevenueForEligibility(form.financial, context.pipelineRevenue);
    const budgetLines = form.budgetItems.filter(row => row.item.trim()).length;
    const { enclosed: docsConfirmed, total: docsTotal } = countMandatoryMgDocumentsEnclosed(form.documents);

    return {
        enterpriseName: form.enterprise.name || "—",
        trackLabel: context.track === "acceleration" ? "Accelerator" : "Foundation",
        revenue,
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
