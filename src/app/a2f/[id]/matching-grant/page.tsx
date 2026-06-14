"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import {
    getApplicantMatchingGrantApplication,
    getApplicantMatchingGrantDocumentSources,
    getApplicantPipelineEntry,
    saveApplicantMatchingGrantApplication,
} from "@/lib/actions/a2f-applicant";
import {
    getMatchingGrantApplication,
    getMatchingGrantDocumentSources,
    saveMatchingGrantApplication,
    type MatchingGrantApplicationInput,
} from "@/lib/actions/a2f-matching-grant-applications";
import { MgSupportingDocumentRow as MgSupportingDocumentRowComponent } from "@/components/a2f/MgSupportingDocumentRow";
import { DocumentIssueReview } from "@/components/a2f/DocumentIssueReview";
import { WizardStepValidationAlert } from "@/components/a2f/WizardStepValidationAlert";
import {
    type MgSupportingDocumentRow,
    countMandatoryMgDocumentsEnclosed,
    defaultMgSupportingDocuments,
    parseMgSupportingDocuments,
    resolveMgDocumentSources,
    serializeMgSupportingDocuments,
} from "@/lib/mg-supporting-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft, ArrowRight, Calculator, FloppyDisk,
    PaperPlaneTilt, ClipboardText, Buildings, User, UsersThree, Handshake, Coins, ShieldCheck, Check,
    Plus, Trash,
} from "@phosphor-icons/react";
import {
    MG_WIZARD_STEPS,
    getMgWizardStepIndex,
    flattenStepErrorsWithLabels,
    getAllStepValidationErrors,
    getFirstStepIndexWithErrors,
    getGrantRequestGuidanceNotes,
    getStepValidationErrors,
    getWizardReviewSummary,
    wizardStorageKey,
    type MgWizardStepId,
} from "@/lib/matching-grant-wizard-steps";
import {
    type EnterpriseIdentification,
    type LeadEntrepreneur,
    type OtherOwner,
    type ProgrammeEngagement,
    type MatchingGrantBusinessOverview,
    EMPTY_ENTERPRISE_IDENTIFICATION,
    EMPTY_LEAD_ENTREPRENEUR,
    EMPTY_PROGRAMME_ENGAGEMENT,
    EMPTY_BUSINESS_OVERVIEW,
    EMPTY_FINANCIAL_OVERVIEW,
    EMPTY_OTHER_FUNDING,
    EMPTY_GOVERNANCE_COMPLIANCE,
    type MatchingGrantFinancialOverview,
    type MatchingGrantOtherFunding,
    type MatchingGrantGovernanceCompliance,
    type MatchingGrantBudgetItem,
    type MatchingGrantMilestoneRow,
    type MatchingGrantJobRow,
    MATCHING_GRANT_CAPEX_CATEGORIES,
    emptyOwnerRow,
    emptyOwners,
    filterFilledOtherOwners,
    emptyBudgetRow,
    emptyBudgetRows,
    emptyMilestoneRow,
    emptyMilestones,
    emptyJobRow,
    emptyJobs,
    filterFilledBudgetItems,
    filterFilledMilestones,
    filterFilledJobs,
    seedFromPipeline,
    mergeMgRecordOverSeed,
    serializeEnterpriseIdentification,
    parseEnterpriseIdentification,
    parseLeadEntrepreneur,
    parseOtherOwners,
    parseProgrammeEngagement,
    parseBusinessOverview,
    parseFinancialOverview,
    parseOtherFunding,
    parseGovernanceCompliance,
    parseBudgetItems,
    parseMilestones,
    parseJobCreationPlan,
    validateBudgetUseOfFunds,
    resolveAnnualRevenueForEligibility,
} from "@/lib/matching-grant-form-types";
import { isMatchingGrantTrackEligible } from "@/lib/a2f-constants";
import { useSession } from "next-auth/react";
import { isMatchingGrantReadOnlyRole } from "@/lib/a2f-nav";

type FormState = {
    status: "draft" | "submitted";
    enterprise: EnterpriseIdentification;
    lead: LeadEntrepreneur;
    otherOwners: OtherOwner[];
    programme: ProgrammeEngagement;
    business: MatchingGrantBusinessOverview;
    totalProjectAmount: number;
    bireGrantAmount: number;
    enterpriseContributionAmount: number;
    coInvestmentSource: string;
    coInvestmentJustification: string;
    projectTitle: string;
    fundingNeed: string;
    withoutGrantImpact: string;
    capexOnlyConfirmed: boolean;
    financial: MatchingGrantFinancialOverview;
    projectedMonthlyRevenue: string;
    projectedAnnualRevenue: string;
    projectedGrowthRate: string;
    projectionAssumptions: string;
    employmentTerms: string;
    inclusionStrategy: string;
    environmentalImpact: string;
    environmentalIndicators: string;
    communityImpact: string;
    innovationElement: string;
    otherFunding: MatchingGrantOtherFunding;
    governance: MatchingGrantGovernanceCompliance;
    useOfFundsAcknowledged: boolean;
    declarationName: string;
    declarationAccepted: boolean;
    budgetItems: MatchingGrantBudgetItem[];
    milestones: MatchingGrantMilestoneRow[];
    jobs: MatchingGrantJobRow[];
    documents: MgSupportingDocumentRow[];
};

const EMPTY_FORM: FormState = {
    status: "draft",
    totalProjectAmount: 0,
    bireGrantAmount: 0,
    enterpriseContributionAmount: 0,
    coInvestmentSource: "",
    coInvestmentJustification: "",
    projectTitle: "",
    fundingNeed: "",
    withoutGrantImpact: "",
    capexOnlyConfirmed: false,
    enterprise: { ...EMPTY_ENTERPRISE_IDENTIFICATION },
    lead: { ...EMPTY_LEAD_ENTREPRENEUR },
    otherOwners: emptyOwners(),
    programme: { ...EMPTY_PROGRAMME_ENGAGEMENT },
    business: { ...EMPTY_BUSINESS_OVERVIEW },
    financial: { ...EMPTY_FINANCIAL_OVERVIEW },
    projectedMonthlyRevenue: "",
    projectedAnnualRevenue: "",
    projectedGrowthRate: "",
    projectionAssumptions: "",
    employmentTerms: "",
    inclusionStrategy: "",
    environmentalImpact: "",
    environmentalIndicators: "",
    communityImpact: "",
    innovationElement: "",
    otherFunding: { ...EMPTY_OTHER_FUNDING },
    governance: { ...EMPTY_GOVERNANCE_COMPLIANCE },
    useOfFundsAcknowledged: false,
    declarationName: "",
    declarationAccepted: false,
    budgetItems: emptyBudgetRows(),
    milestones: emptyMilestones(),
    jobs: emptyJobs(),
    documents: defaultMgSupportingDocuments(),
};

function numberValue(value: string) {
    return Number(value || 0);
}

function pct(part: number, total: number) {
    return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function toInput(data: FormState): MatchingGrantApplicationInput {
    return {
        status: data.status,
        totalProjectAmount: data.totalProjectAmount,
        bireGrantAmount: data.bireGrantAmount,
        enterpriseContributionAmount: data.enterpriseContributionAmount,
        coInvestmentSource: data.coInvestmentSource,
        coInvestmentJustification: data.coInvestmentJustification,
        projectTitle: data.projectTitle,
        fundingNeed: data.fundingNeed,
        withoutGrantImpact: data.withoutGrantImpact,
        capexOnlyConfirmed: data.capexOnlyConfirmed,
        enterpriseIdentification: serializeEnterpriseIdentification(
            data.enterprise,
            filterFilledOtherOwners(data.otherOwners)
        ),
        leadEntrepreneur: { ...data.lead },
        programmeEngagement: { ...data.programme },
        businessOverview: {
            ...data.business,
            description: data.business.businessDescription,
        },
        financialOverview: { ...data.financial },
        otherFunding: {
            ...data.otherFunding,
            leverageNotes: data.otherFunding.leveragePotential,
            sources: data.otherFunding.description,
        },
        governanceCompliance: { ...data.governance },
        budgetItems: filterFilledBudgetItems(data.budgetItems).map(row => ({ ...row })) as Array<Record<string, unknown>>,
        implementationMilestones: filterFilledMilestones(data.milestones).map(row => ({ ...row })) as Array<Record<string, unknown>>,
        financialProjections: {
            projectedMonthlyRevenue: data.projectedMonthlyRevenue,
            projectedAnnualRevenue: data.projectedAnnualRevenue,
            projectedGrowthRate: data.projectedGrowthRate,
            assumptions: data.projectionAssumptions,
        },
        jobCreationPlan: filterFilledJobs(data.jobs).map(row => ({ ...row })) as Array<Record<string, unknown>>,
        impact: {
            employmentTerms: data.employmentTerms,
            inclusionStrategy: data.inclusionStrategy,
            environmentalImpact: data.environmentalImpact,
            environmentalIndicators: data.environmentalIndicators,
            communityImpact: data.communityImpact,
            innovationElement: data.innovationElement,
        },
        supportingDocuments: serializeMgSupportingDocuments(data.documents),
        declaration: {
            applicantName: data.declarationName,
            accepted: data.declarationAccepted,
            useOfFundsAcknowledged: data.useOfFundsAcknowledged,
            acceptedAt: data.declarationAccepted ? new Date().toISOString() : null,
        },
    };
}

function buildIdentityBase(entry: unknown, record: unknown): Pick<FormState,
    "enterprise" | "lead" | "otherOwners" | "programme" | "business" | "financial"
    | "otherFunding" | "governance" | "declarationName" | "useOfFundsAcknowledged"
> {
    const seed = seedFromPipeline(entry);
    const merged = mergeMgRecordOverSeed(seed, record as Record<string, unknown> | null);
    return {
        enterprise: merged.enterprise,
        lead: merged.lead,
        otherOwners: merged.owners,
        programme: merged.programme,
        business: merged.business,
        financial: merged.financial,
        otherFunding: merged.otherFunding,
        governance: merged.governance,
        declarationName: merged.declarationName,
        useOfFundsAcknowledged: merged.useOfFundsAcknowledged,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRecord(record: any, fallback: FormState): FormState {
    if (!record) return fallback;
    const enterpriseRaw = (record.enterpriseIdentification ?? {}) as Record<string, unknown>;
    const financialOverview = record.financialOverview ?? {};
    const projections = record.financialProjections ?? {};
    const impact = record.impact ?? {};
    const declaration = record.declaration ?? {};

    return {
        ...fallback,
        enterprise: parseEnterpriseIdentification(enterpriseRaw),
        lead: parseLeadEntrepreneur(record.leadEntrepreneur),
        otherOwners: parseOtherOwners(enterpriseRaw.otherOwners),
        programme: parseProgrammeEngagement(record.programmeEngagement),
        business: parseBusinessOverview(record.businessOverview),
        financial: parseFinancialOverview(financialOverview),
        otherFunding: parseOtherFunding(record.otherFunding),
        governance: parseGovernanceCompliance(record.governanceCompliance),
        useOfFundsAcknowledged: Boolean(declaration.useOfFundsAcknowledged ?? fallback.useOfFundsAcknowledged),
        status: record.status ?? "draft",
        totalProjectAmount: Number(record.totalProjectAmount ?? 0),
        bireGrantAmount: Number(record.bireGrantAmount ?? 0),
        enterpriseContributionAmount: Number(record.enterpriseContributionAmount ?? 0),
        coInvestmentSource: record.coInvestmentSource ?? "",
        coInvestmentJustification: record.coInvestmentJustification ?? "",
        projectTitle: record.projectTitle ?? "",
        fundingNeed: record.fundingNeed ?? "",
        withoutGrantImpact: record.withoutGrantImpact ?? "",
        capexOnlyConfirmed: Boolean(record.capexOnlyConfirmed),
        projectedMonthlyRevenue: String(projections.projectedMonthlyRevenue ?? ""),
        projectedAnnualRevenue: String(projections.projectedAnnualRevenue ?? ""),
        projectedGrowthRate: String(projections.projectedGrowthRate ?? ""),
        projectionAssumptions: String(projections.assumptions ?? ""),
        employmentTerms: String(impact.employmentTerms ?? ""),
        inclusionStrategy: String(impact.inclusionStrategy ?? ""),
        environmentalImpact: String(impact.environmentalImpact ?? ""),
        environmentalIndicators: String(impact.environmentalIndicators ?? ""),
        communityImpact: String(impact.communityImpact ?? ""),
        innovationElement: String(impact.innovationElement ?? ""),
        declarationName: String(declaration.applicantName ?? fallback.declarationName),
        declarationAccepted: Boolean(declaration.accepted),
        budgetItems: parseBudgetItems(record.budgetItems),
        milestones: parseMilestones(record.implementationMilestones),
        jobs: parseJobCreationPlan(record.jobCreationPlan),
        documents: parseMgSupportingDocuments(record.supportingDocuments),
    };
}

export function MatchingGrantApplicationWizard({
    a2fId,
    mode = "staff",
}: {
    a2fId: number;
    mode?: "staff" | "applicant" | "readonly";
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const applicantLocked = mode === "applicant" && form.status === "submitted";
    const readOnly = mode === "readonly" || applicantLocked;
    const canRaiseDocumentIssues =
        session?.user?.role === "a2f_officer" || session?.user?.role === "admin";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [showStepValidation, setShowStepValidation] = useState(false);
    const validationAlertRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setLoading(true);
        const [entryRes, appRes, docSourcesRes] = await Promise.all([
            mode === "applicant"
                ? getApplicantPipelineEntry(a2fId)
                : getA2fPipelineEntry(a2fId),
            mode === "applicant"
                ? getApplicantMatchingGrantApplication(a2fId)
                : getMatchingGrantApplication(a2fId),
            mode === "applicant"
                ? getApplicantMatchingGrantDocumentSources(a2fId)
                : getMatchingGrantDocumentSources(a2fId),
        ]);

        if (entryRes.success && entryRes.data) {
            setEntry(entryRes.data);
            const biz = entryRes.data.application?.business;
            const identityBase = buildIdentityBase(entryRes.data, appRes.success ? appRes.data : null);
            const seeded: FormState = {
                ...EMPTY_FORM,
                ...identityBase,
                environmentalImpact: biz?.environmentalImpactDescription ?? "",
                innovationElement: biz?.technologyIntegrationDescription ?? biz?.businessModelInnovation ?? "",
            };
            const baseForm = fromRecord(appRes.success ? appRes.data : null, seeded);
            const documents = docSourcesRes.success && docSourcesRes.data
                ? resolveMgDocumentSources({
                    business: docSourcesRes.data.business,
                    kycDocuments: docSourcesRes.data.kycDocuments,
                    cdpEvidence: docSourcesRes.data.cdpEvidence,
                    savedRows: parseMgSupportingDocuments(docSourcesRes.data.savedSupportingDocuments),
                })
                : baseForm.documents;
            setForm({ ...baseForm, documents });
        } else {
            toast.error("Pipeline entry not found");
        }

        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    useEffect(() => { loadData(); }, [a2fId]);

    useEffect(() => {
        const stepParam = searchParams.get("step");
        const stepFromQuery = getMgWizardStepIndex(stepParam);
        if (stepFromQuery >= 0) {
            setActiveStep(stepFromQuery);
            return;
        }
        const stored = sessionStorage.getItem(wizardStorageKey(a2fId));
        const parsed = stored != null ? Number(stored) : NaN;
        if (Number.isFinite(parsed) && parsed >= 0 && parsed < MG_WIZARD_STEPS.length) {
            setActiveStep(parsed);
        }
    }, [a2fId, searchParams]);

    useEffect(() => {
        if (session?.user?.role === "a2f_officer" && !searchParams.get("step")) {
            setActiveStep(MG_WIZARD_STEPS.length - 1);
        }
    }, [session?.user?.role, searchParams]);

    useEffect(() => {
        sessionStorage.setItem(wizardStorageKey(a2fId), String(activeStep));
    }, [activeStep, a2fId]);

    const track = entry?.application?.track === "acceleration" ? "acceleration" as const : "foundation" as const;
    const wizardContext = useMemo(
        () => ({ track, pipelineRevenue: Number(entry?.application?.business?.revenueLastYear ?? 0) }),
        [track, entry?.application?.business?.revenueLastYear]
    );
    const pipelineRevenue = Number(entry?.application?.business?.revenueLastYear ?? 0);
    const eligibilityRevenue = useMemo(
        () => resolveAnnualRevenueForEligibility(form.financial, pipelineRevenue),
        [form.financial, pipelineRevenue]
    );
    const revenueEligible = useMemo(
        () => isMatchingGrantTrackEligible(track, eligibilityRevenue),
        [track, eligibilityRevenue]
    );

    const grantShare = pct(form.bireGrantAmount, form.totalProjectAmount);
    const enterpriseShare = pct(form.enterpriseContributionAmount, form.totalProjectAmount);

    const allStepErrors = useMemo(
        () => getAllStepValidationErrors(form, wizardContext),
        [form, wizardContext]
    );

    const reviewIssueGroups = useMemo(
        () => flattenStepErrorsWithLabels(form, wizardContext),
        [form, wizardContext]
    );

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    const currentStepId = MG_WIZARD_STEPS[activeStep]?.id ?? "enterprise";
    const progressPct = Math.round(((activeStep + 1) / MG_WIZARD_STEPS.length) * 100);
    const reviewSummary = useMemo(
        () => getWizardReviewSummary(form, wizardContext),
        [form, wizardContext]
    );

    const grantGuidanceNotes = useMemo(
        () => (currentStepId === "grant_request" ? getGrantRequestGuidanceNotes(form) : []),
        [form, currentStepId]
    );

    const inlineValidationErrors = useMemo(() => {
        if (!showStepValidation) return [];
        return getStepValidationErrors(currentStepId, form, wizardContext);
    }, [showStepValidation, currentStepId, form, wizardContext]);

    function scrollToValidationAlert() {
        requestAnimationFrame(() => {
            validationAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    function goToStep(index: number, options?: { clearErrors?: boolean }) {
        if (index < 0 || index >= MG_WIZARD_STEPS.length) return;
        if (options?.clearErrors !== false) {
            setShowStepValidation(false);
        }
        setActiveStep(index);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validateCurrentStep(): string[] {
        return getStepValidationErrors(currentStepId, form, wizardContext);
    }

    function handleNext() {
        const errors = validateCurrentStep();
        if (errors.length > 0) {
            setShowStepValidation(true);
            toast.error(
                `Fix ${errors.length} item(s) on ${MG_WIZARD_STEPS[activeStep]?.label ?? "this step"} before continuing.`
            );
            scrollToValidationAlert();
            return;
        }
        setShowStepValidation(false);
        setCompletedSteps(prev => (prev.includes(activeStep) ? prev : [...prev, activeStep]));
        goToStep(activeStep + 1);
    }

    function handleBack() {
        setShowStepValidation(false);
        goToStep(activeStep - 1);
    }

    function handleStepClick(index: number) {
        if (index === activeStep) return;

        if (readOnly) {
            goToStep(index);
            return;
        }

        if (index < activeStep) {
            setShowStepValidation(false);
            goToStep(index);
            return;
        }

        for (let i = activeStep; i < index; i++) {
            const stepId = MG_WIZARD_STEPS[i]?.id ?? "enterprise";
            const errors = getStepValidationErrors(stepId, form, wizardContext);
            if (errors.length > 0) {
                if (i !== activeStep) {
                    goToStep(i, { clearErrors: false });
                }
                setShowStepValidation(true);
                toast.error(
                    `Fix ${errors.length} item(s) on ${MG_WIZARD_STEPS[i]?.label ?? "this step"} before continuing.`
                );
                scrollToValidationAlert();
                return;
            }
            setCompletedSteps(prev => (prev.includes(i) ? prev : [...prev, i]));
        }

        setShowStepValidation(false);
        goToStep(index);
    }

    function goToStepWithIssues(index: number) {
        goToStep(index, { clearErrors: false });
        setShowStepValidation(true);
        scrollToValidationAlert();
    }

    async function handleSave(status: "draft" | "submitted") {
        if (readOnly) return;
        if (status === "submitted") {
            const firstIssueIndex = getFirstStepIndexWithErrors(form, wizardContext);
            if (firstIssueIndex != null) {
                const groups = flattenStepErrorsWithLabels(form, wizardContext);
                const first = groups[0];
                goToStep(firstIssueIndex, { clearErrors: false });
                setShowStepValidation(true);
                scrollToValidationAlert();
                toast.error(
                    first
                        ? `Fix ${first.errors.length} item(s) on ${first.stepLabel} before submitting.`
                        : "Complete all required steps before submitting."
                );
                scrollToValidationAlert();
                return;
            }
        }
        setSaving(true);
        const res =
            mode === "applicant"
                ? await saveApplicantMatchingGrantApplication(a2fId, toInput({ ...form, status }))
                : await saveMatchingGrantApplication(a2fId, toInput({ ...form, status }));
        setSaving(false);

        if (res.success) {
            setShowStepValidation(false);
            setForm(prev => ({ ...prev, status }));
            if (status === "submitted") {
                setCompletedSteps(MG_WIZARD_STEPS.map((_, i) => i));
            }
            if (status === "submitted" && mode === "applicant") {
                toast.success("Matching Grant application submitted", {
                    description: "A confirmation email has been sent. Taking you to your agreements.",
                });
                router.push("/profile?tab=contracts&mg_submitted=1");
                return;
            }
            toast.success(res.message ?? "Matching Grant application saved");
            if (res.data?.validation.warnings.length) {
                const label = status === "submitted" ? "guidance note(s)" : "validation note(s)";
                toast.info(
                    `${res.data.validation.warnings.length} ${label} recorded (e.g. grant mix guidance). Submission was successful.`
                );
            }
        } else {
            const err = res.error ?? "Failed to save Matching Grant application";
            toast.error(err);
            if (
                mode === "applicant" &&
                err.includes("already been submitted")
            ) {
                router.push("/profile?tab=contracts");
            }
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const biz = entry?.application?.business;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl pb-28">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={mode === "applicant" ? "/access-to-finance" : `/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> {mode === "applicant" ? "Access to Finance" : "Entry Overview"}
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold truncate">Matching Grant Application</h1>
                    <p className="text-sm text-muted-foreground truncate">{biz?.name}</p>
                </div>
                <Badge className={form.status === "submitted" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                    {form.status}
                </Badge>
                {readOnly && (
                    <Badge variant="outline" className="text-xs">
                        {applicantLocked ? "Submitted" : "Read-only"}
                    </Badge>
                )}
            </div>

            {applicantLocked && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    This application was submitted and can no longer be edited. View your grant agreement status
                    on your profile under Offers and Contracts.
                    <Button variant="link" asChild className="h-auto p-0 ml-1 text-emerald-800">
                        <Link href="/profile?tab=contracts">Go to agreements</Link>
                    </Button>
                </div>
            )}

            <div className="mb-4 lg:hidden">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Step {activeStep + 1} of {MG_WIZARD_STEPS.length}</span>
                    <span>{MG_WIZARD_STEPS[activeStep]?.label}</span>
                </div>
                <Progress value={progressPct} className="h-2" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-3">
                            Application steps
                        </p>
                        {MG_WIZARD_STEPS.map((step, index) => {
                            const StepIcon = step.icon;
                            const isActive = index === activeStep;
                            const stepErrorCount = allStepErrors[step.id]?.length ?? 0;
                            const isCompleted = completedSteps.includes(index) && stepErrorCount === 0;
                            const maxAccessible = Math.max(activeStep, ...completedSteps, 0);
                            const isAccessible = index <= maxAccessible || index === activeStep + 1;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => handleStepClick(index)}
                                    disabled={!isAccessible && index > activeStep}
                                    className={cn(
                                        "w-full text-left rounded-lg p-3 transition-colors border",
                                        isActive && "border-blue-300 bg-blue-50/80",
                                        !isActive && isCompleted && "border-emerald-200 bg-emerald-50/50",
                                        !isActive && stepErrorCount > 0 && "border-red-200 bg-red-50/40",
                                        !isActive && !isCompleted && stepErrorCount === 0 && "border-transparent hover:bg-muted/50",
                                        !isAccessible && index > activeStep && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={cn(
                                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                                            stepErrorCount > 0 && !isActive
                                                ? "bg-red-600 text-white"
                                                : isCompleted
                                                    ? "bg-emerald-600 text-white"
                                                    : isActive
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-muted text-muted-foreground"
                                        )}>
                                            {isCompleted ? (
                                                <Check className="size-3.5" weight="bold" />
                                            ) : stepErrorCount > 0 && !isActive ? (
                                                stepErrorCount
                                            ) : (
                                                index + 1
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium flex items-center gap-1.5">
                                                <StepIcon className="size-4 shrink-0" />
                                                {step.shortLabel}
                                                {stepErrorCount > 0 && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                                        {stepErrorCount}
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        <div className="px-2 pt-2">
                            <Progress value={progressPct} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1.5">{progressPct}% complete</p>
                        </div>
                    </div>
                </aside>

                <div className="space-y-6 min-w-0">
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="pt-5 grid gap-4 md:grid-cols-5 text-sm">
                            <InfoMetric label="Track" value={track === "acceleration" ? "Accelerator" : "Foundation"} />
                            <InfoMetric label="Revenue for Eligibility" value={eligibilityRevenue > 0 ? `KES ${eligibilityRevenue.toLocaleString("en-KE")}` : "Not set"} />
                            <InfoMetric label="Revenue Gate" value={revenueEligible ? "Eligible" : eligibilityRevenue > 0 ? "Ineligible" : "Pending"} />
                            <InfoMetric label="BIRE Share" value={`${grantShare}%`} />
                            <InfoMetric label="Enterprise Share" value={`${enterpriseShare}%`} />
                        </CardContent>
                    </Card>

                    <div ref={validationAlertRef}>
                        <WizardStepValidationAlert
                            errors={inlineValidationErrors}
                            guidanceNotes={grantGuidanceNotes}
                        />
                    </div>

                    <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                        <WizardStepContent
                            stepId={currentStepId}
                            form={form}
                            setForm={setForm}
                            setField={setField}
                            track={track}
                            readOnly={readOnly}
                        />
                    </fieldset>

                    {currentStepId === "documents" && canRaiseDocumentIssues && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Finance document review</CardTitle>
                                <CardDescription>
                                    Application information is read-only. Review each document and assign
                                    any correction to an EDOR or REDOR.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {form.documents.map((document) => (
                                    <div key={document.document} className="rounded-lg border p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium">{document.document}</p>
                                            <Badge variant="outline">
                                                {document.url ? "Document available" : "Missing"}
                                            </Badge>
                                        </div>
                                        <DocumentIssueReview a2fId={a2fId} document={document} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {currentStepId === "documents" && !canRaiseDocumentIssues && (
                        <WizardReviewSummary
                            summary={reviewSummary}
                            issueGroups={reviewIssueGroups}
                            onGoToStep={goToStepWithIssues}
                        />
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={activeStep === 0 || saving}
                        className="gap-2"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                    {!readOnly && (
                        <Button
                            variant="outline"
                            onClick={() => handleSave("draft")}
                            disabled={saving}
                            className="gap-2"
                        >
                            <FloppyDisk className="size-4" />
                            Save Draft
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        {activeStep < MG_WIZARD_STEPS.length - 1 ? (
                            <Button
                                onClick={readOnly ? () => goToStep(activeStep + 1) : handleNext}
                                disabled={saving}
                                className="gap-2"
                            >
                                Next
                                <ArrowRight className="size-4" />
                            </Button>
                        ) : readOnly ? null : (
                            <Button
                                onClick={() => handleSave("submitted")}
                                disabled={saving}
                                className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                            >
                                <PaperPlaneTilt className="size-4" />
                                Submit Application
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function setEnterpriseField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof EnterpriseIdentification,
    value: string
) {
    setForm(prev => ({ ...prev, enterprise: { ...prev.enterprise, [key]: value } }));
}

function setLeadField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof LeadEntrepreneur,
    value: string
) {
    setForm(prev => ({ ...prev, lead: { ...prev.lead, [key]: value } }));
}

function setProgrammeField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof ProgrammeEngagement,
    value: string
) {
    setForm(prev => ({ ...prev, programme: { ...prev.programme, [key]: value } }));
}

function setBusinessField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof MatchingGrantBusinessOverview,
    value: string
) {
    setForm(prev => ({ ...prev, business: { ...prev.business, [key]: value } }));
}

function setFinancialField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof MatchingGrantFinancialOverview,
    value: string | number
) {
    setForm(prev => ({ ...prev, financial: { ...prev.financial, [key]: value } }));
}

function FinancialOverviewSection({
    form,
    setForm,
    track,
}: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    track: "foundation" | "acceleration";
}) {
    const gateHint = track === "acceleration"
        ? "Accelerator Track: annual revenue must be above KES 3,000,000."
        : "Foundation Track: annual revenue must be from KES 500,000 to KES 3,000,000.";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="size-5 text-indigo-600" />
                    Financial Overview & Revenue Eligibility
                </CardTitle>
                <CardDescription>{gateHint} Enter the most recent annual revenue in 2025 first; earlier years are optional.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
                <NumberField label="Annual Revenue 2025 (KES) *" value={form.financial.annualRevenue2025} onChange={v => setFinancialField(setForm, "annualRevenue2025", v)} />
                <NumberField label="Annual Revenue 2024 (KES)" value={form.financial.annualRevenue2024} onChange={v => setFinancialField(setForm, "annualRevenue2024", v)} />
                <NumberField label="Annual Revenue 2023 (KES)" value={form.financial.annualRevenue2023} onChange={v => setFinancialField(setForm, "annualRevenue2023", v)} />
                <NumberField label="Average Monthly Revenue (KES)" value={form.financial.monthlyRevenue} onChange={v => setFinancialField(setForm, "monthlyRevenue", v)} />
                <NumberField label="Monthly Operating Costs (KES)" value={form.financial.monthlyOperatingCosts} onChange={v => setFinancialField(setForm, "monthlyOperatingCosts", v)} />
                <TextField label="Profitability" value={form.financial.profitability} onChange={v => setFinancialField(setForm, "profitability", v)} />
                <NumberField label="Full-Time Employees" value={form.financial.employeeCount} onChange={v => setFinancialField(setForm, "employeeCount", v)} />
                <NumberField label="Casual / Contract Workers" value={form.financial.casualWorkers} onChange={v => setFinancialField(setForm, "casualWorkers", v)} />
                <TextField label="Financial Recordkeeping Status" value={form.financial.recordkeepingStatus} onChange={v => setFinancialField(setForm, "recordkeepingStatus", v)} />
                <LongField label="Revenue Streams" value={form.financial.revenueStreams} onChange={v => setFinancialField(setForm, "revenueStreams", v)} className="md:col-span-3" />
                <LongField label="Financial Obligations" value={form.financial.financialObligations} onChange={v => setFinancialField(setForm, "financialObligations", v)} className="md:col-span-3" />
                <LongField label="Additional Financial Notes" value={form.financial.narrative} onChange={v => setFinancialField(setForm, "narrative", v)} className="md:col-span-3" />
            </CardContent>
        </Card>
    );
}

function updateOwner(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    index: number,
    patch: Partial<OtherOwner>
) {
    setForm(prev => ({
        ...prev,
        otherOwners: prev.otherOwners.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
}

function addOwner(setForm: React.Dispatch<React.SetStateAction<FormState>>) {
    setForm(prev => ({
        ...prev,
        otherOwners: [...prev.otherOwners, emptyOwnerRow()],
    }));
}

function removeOwner(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number) {
    setForm(prev => ({
        ...prev,
        otherOwners: prev.otherOwners.length <= 1
            ? prev.otherOwners
            : prev.otherOwners.filter((_, i) => i !== index),
    }));
}

function addBudget(setForm: React.Dispatch<React.SetStateAction<FormState>>) {
    setForm(prev => ({
        ...prev,
        budgetItems: [...prev.budgetItems, emptyBudgetRow()],
    }));
}

function removeBudget(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number) {
    setForm(prev => ({
        ...prev,
        budgetItems: prev.budgetItems.length <= 1
            ? prev.budgetItems
            : prev.budgetItems.filter((_, i) => i !== index),
    }));
}

function addMilestone(setForm: React.Dispatch<React.SetStateAction<FormState>>) {
    setForm(prev => ({
        ...prev,
        milestones: [...prev.milestones, emptyMilestoneRow()],
    }));
}

function removeMilestone(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number) {
    setForm(prev => ({
        ...prev,
        milestones: prev.milestones.length <= 1
            ? prev.milestones
            : prev.milestones.filter((_, i) => i !== index),
    }));
}

function addJob(setForm: React.Dispatch<React.SetStateAction<FormState>>) {
    setForm(prev => ({
        ...prev,
        jobs: [...prev.jobs, emptyJobRow()],
    }));
}

function removeJob(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number) {
    setForm(prev => ({
        ...prev,
        jobs: prev.jobs.length <= 1
            ? prev.jobs
            : prev.jobs.filter((_, i) => i !== index),
    }));
}

function EnterpriseIdentificationSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Buildings className="size-5 text-slate-600" />
                    Enterprise Identification
                </CardTitle>
                <CardDescription>Legal entity and location details for the Matching Grant application.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <TextField label="Enterprise Name *" value={form.enterprise.name} onChange={v => setEnterpriseField(setForm, "name", v)} />
                <TextField label="Trading Name" value={form.enterprise.tradingName} onChange={v => setEnterpriseField(setForm, "tradingName", v)} />
                <TextField label="Registration Number" value={form.enterprise.registrationNumber} onChange={v => setEnterpriseField(setForm, "registrationNumber", v)} />
                <TextField label="Legal Structure" value={form.enterprise.legalStructure} onChange={v => setEnterpriseField(setForm, "legalStructure", v)} />
                <TextField label="Registration Date" value={form.enterprise.registrationDate} onChange={v => setEnterpriseField(setForm, "registrationDate", v)} placeholder="YYYY-MM-DD" />
                <TextField label="Year Operations Started" value={form.enterprise.yearOperationsStarted} onChange={v => setEnterpriseField(setForm, "yearOperationsStarted", v)} />
                <TextField label="Sector" value={form.enterprise.sector} onChange={v => setEnterpriseField(setForm, "sector", v)} />
                <TextField label="County *" value={form.enterprise.county} onChange={v => setEnterpriseField(setForm, "county", v)} />
                <TextField label="Sub-County / Ward" value={form.enterprise.subCountyWard} onChange={v => setEnterpriseField(setForm, "subCountyWard", v)} />
                <TextField label="GPS / Pin Location" value={form.enterprise.gpsLocation} onChange={v => setEnterpriseField(setForm, "gpsLocation", v)} />
                <LongField label="Physical Address" value={form.enterprise.physicalAddress} onChange={v => setEnterpriseField(setForm, "physicalAddress", v)} />
                <TextField label="Postal Address" value={form.enterprise.postalAddress} onChange={v => setEnterpriseField(setForm, "postalAddress", v)} />
                <LongField label="Ownership Structure" value={form.enterprise.ownershipStructure} onChange={v => setEnterpriseField(setForm, "ownershipStructure", v)} className="md:col-span-2" />
            </CardContent>
        </Card>
    );
}

function LeadEntrepreneurSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <User className="size-5 text-slate-600" />
                    Lead Entrepreneur
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <TextField label="Full Name *" value={form.lead.name} onChange={v => setLeadField(setForm, "name", v)} />
                <TextField label="ID / Passport Number" value={form.lead.idNumber} onChange={v => setLeadField(setForm, "idNumber", v)} />
                <TextField label="Gender" value={form.lead.gender} onChange={v => setLeadField(setForm, "gender", v)} />
                <TextField label="Date of Birth" value={form.lead.dateOfBirth} onChange={v => setLeadField(setForm, "dateOfBirth", v)} placeholder="YYYY-MM-DD" />
                <TextField label="Applicant Category" value={form.lead.applicantCategory} onChange={v => setLeadField(setForm, "applicantCategory", v)} />
                <TextField label="Role in Enterprise" value={form.lead.role} onChange={v => setLeadField(setForm, "role", v)} />
                <TextField label="Phone" value={form.lead.phone} onChange={v => setLeadField(setForm, "phone", v)} />
                <TextField label="Email" value={form.lead.email} onChange={v => setLeadField(setForm, "email", v)} />
                <LongField label="Education" value={form.lead.education} onChange={v => setLeadField(setForm, "education", v)} />
                <LongField label="Relevant Experience" value={form.lead.experience} onChange={v => setLeadField(setForm, "experience", v)} />
            </CardContent>
        </Card>
    );
}

function OtherOwnersSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <UsersThree className="size-5 text-slate-600" />
                    Other Owners or Partners
                </CardTitle>
                <CardDescription>Complete where applicable; leave blank if sole ownership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {form.otherOwners.map((row, index) => (
                    <div key={index} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Owner / partner {index + 1}
                            </p>
                            {form.otherOwners.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeOwner(setForm, index)}
                                >
                                    <Trash className="size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-5">
                            <TextField label="Name" value={row.name} onChange={v => updateOwner(setForm, index, { name: v })} />
                            <TextField label="Role" value={row.role} onChange={v => updateOwner(setForm, index, { role: v })} />
                            <NumberField label="Ownership %" value={row.ownershipPct} onChange={v => updateOwner(setForm, index, { ownershipPct: v })} />
                            <TextField label="Gender" value={row.gender} onChange={v => updateOwner(setForm, index, { gender: v })} />
                            <TextField label="Category" value={row.category} onChange={v => updateOwner(setForm, index, { category: v })} />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => addOwner(setForm)}
                >
                    <Plus className="size-4" />
                    Add owner / partner
                </Button>
            </CardContent>
        </Card>
    );
}

function setOtherFundingField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof MatchingGrantOtherFunding,
    value: string
) {
    setForm(prev => ({ ...prev, otherFunding: { ...prev.otherFunding, [key]: value } }));
}

function setGovernanceField(
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    key: keyof MatchingGrantGovernanceCompliance,
    value: string
) {
    setForm(prev => ({ ...prev, governance: { ...prev.governance, [key]: value } }));
}

function OtherFundingSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="size-5 text-amber-600" />
                    Other Funding & Leverage
                </CardTitle>
                <CardDescription>Other grants, loans, investors, savings, and future leverage potential.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <LongField label="Other Grants" value={form.otherFunding.otherGrants} onChange={v => setOtherFundingField(setForm, "otherGrants", v)} />
                <LongField label="Loans" value={form.otherFunding.loans} onChange={v => setOtherFundingField(setForm, "loans", v)} />
                <LongField label="Investors" value={form.otherFunding.investors} onChange={v => setOtherFundingField(setForm, "investors", v)} />
                <LongField label="Own Savings" value={form.otherFunding.ownSavings} onChange={v => setOtherFundingField(setForm, "ownSavings", v)} />
                <LongField label="Future Investment / Lender Leverage" value={form.otherFunding.leveragePotential} onChange={v => setOtherFundingField(setForm, "leveragePotential", v)} className="md:col-span-2" />
                <LongField label="Summary / Additional Notes" value={form.otherFunding.description} onChange={v => setOtherFundingField(setForm, "description", v)} className="md:col-span-2" />
            </CardContent>
        </Card>
    );
}

function GovernanceComplianceSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-700" />
                    Governance & Compliance
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <TextField label="Registration Status" value={form.governance.registrationStatus} onChange={v => setGovernanceField(setForm, "registrationStatus", v)} />
                <TextField label="KRA PIN" value={form.governance.kraPin} onChange={v => setGovernanceField(setForm, "kraPin", v)} />
                <LongField label="Sector Licenses / Permits" value={form.governance.licensesPermits} onChange={v => setGovernanceField(setForm, "licensesPermits", v)} />
                <TextField label="Tax Compliance" value={form.governance.taxCompliance} onChange={v => setGovernanceField(setForm, "taxCompliance", v)} />
                <LongField label="Litigation or Disputes" value={form.governance.litigationDisputes} onChange={v => setGovernanceField(setForm, "litigationDisputes", v)} />
                <LongField label="Previous Grant / Programme Funding" value={form.governance.previousProgrammeFunding} onChange={v => setGovernanceField(setForm, "previousProgrammeFunding", v)} />
                <LongField label="Key Risks" value={form.governance.risks} onChange={v => setGovernanceField(setForm, "risks", v)} />
                <LongField label="Mitigation Plan" value={form.governance.mitigationPlan} onChange={v => setGovernanceField(setForm, "mitigationPlan", v)} />
                <LongField label="Compliance Gaps" value={form.governance.complianceGaps} onChange={v => setGovernanceField(setForm, "complianceGaps", v)} className="md:col-span-2" />
                <LongField label="Additional Notes" value={form.governance.notes} onChange={v => setGovernanceField(setForm, "notes", v)} className="md:col-span-2" />
            </CardContent>
        </Card>
    );
}

function ProgrammeEngagementSection({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Handshake className="size-5 text-slate-600" />
                    Programme Engagement
                </CardTitle>
                <CardDescription>BIRE technical assistance and hub engagement history.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <TextField label="BIRE Client ID" value={form.programme.bireClientId} onChange={v => setProgrammeField(setForm, "bireClientId", v)} />
                <TextField label="Regional Hub" value={form.programme.regionalHub} onChange={v => setProgrammeField(setForm, "regionalHub", v)} />
                <TextField label="TA Lead" value={form.programme.taLead} onChange={v => setProgrammeField(setForm, "taLead", v)} />
                <TextField label="Date Joined Programme" value={form.programme.dateJoined} onChange={v => setProgrammeField(setForm, "dateJoined", v)} placeholder="YYYY-MM-DD" />
                <TextField label="Duration in TA Support (months)" value={form.programme.taDurationMonths} onChange={v => setProgrammeField(setForm, "taDurationMonths", v)} />
                <LongField label="Key TA Milestones Achieved" value={form.programme.taMilestones} onChange={v => setProgrammeField(setForm, "taMilestones", v)} />
                <LongField label="Programme Support Received" value={form.programme.supportReceived} onChange={v => setProgrammeField(setForm, "supportReceived", v)} className="md:col-span-2" />
            </CardContent>
        </Card>
    );
}

function WizardStepContent({
    stepId,
    form,
    setForm,
    setField,
    track,
    readOnly,
}: {
    stepId: MgWizardStepId;
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    track: "foundation" | "acceleration";
    readOnly: boolean;
}) {
    switch (stepId) {
        case "enterprise":
            return (
                <>
                    <EnterpriseIdentificationSection form={form} setForm={setForm} />
                    <LeadEntrepreneurSection form={form} setForm={setForm} />
                    <OtherOwnersSection form={form} setForm={setForm} />
                    <ProgrammeEngagementSection form={form} setForm={setForm} />
                </>
            );
        case "financials":
            return <FinancialOverviewSection form={form} setForm={setForm} track={track} />;
        case "grant_request":
            return (
                <>
                    <GrantRequestSection form={form} setField={setField} />
                    <OtherFundingSection form={form} setForm={setForm} />
                    <GovernanceComplianceSection form={form} setForm={setForm} />
                </>
            );
        case "business_impact":
            return <BusinessImpactSection form={form} setForm={setForm} setField={setField} />;
        case "investment_plan":
            return (
                <>
                    <RepeatingBudget form={form} setForm={setForm} />
                    <RepeatingMilestones form={form} setForm={setForm} />
                    <RepeatingJobs form={form} setForm={setForm} />
                </>
            );
        case "documents":
            return (
                <>
                    <SupportingDocuments form={form} setForm={setForm} readOnly={readOnly} />
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ClipboardText className="size-5 text-emerald-600" />
                                Declaration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <TextField label="Applicant Full Name" value={form.declarationName} onChange={v => setField("declarationName", v)} />
                            <div className="flex items-center gap-2 rounded-lg border p-3">
                                <Checkbox
                                    id="declaration"
                                    checked={form.declarationAccepted}
                                    onCheckedChange={checked =>
                                        setField("declarationAccepted", checked === true)
                                    }
                                />
                                <Label htmlFor="declaration" className="text-sm">
                                    Applicant declares that all information is true, complete, and subject to verification.
                                </Label>
                            </div>
                        </CardContent>
                    </Card>
                </>
            );
        default:
            return null;
    }
}

function GrantRequestSection({
    form,
    setField,
}: {
    form: FormState;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="size-5 text-blue-600" />
                    Grant Request & Co-Investment
                </CardTitle>
                <CardDescription>Capture the CAPEX-only request and the standard 70% BIRE / 30% enterprise contribution structure.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
                <TextField label="Project Title" value={form.projectTitle} onChange={v => setField("projectTitle", v)} className="md:col-span-3" />
                <NumberField label="Total Project Investment (KES)" value={form.totalProjectAmount} onChange={v => setField("totalProjectAmount", v)} />
                <NumberField label="BIRE Grant Amount (KES)" value={form.bireGrantAmount} onChange={v => setField("bireGrantAmount", v)} />
                <NumberField label="Enterprise Contribution (KES)" value={form.enterpriseContributionAmount} onChange={v => setField("enterpriseContributionAmount", v)} />
                <TextField label="Co-Investment Source" value={form.coInvestmentSource} onChange={v => setField("coInvestmentSource", v)} className="md:col-span-3" />
                <LongField label="Why is this funding needed now?" value={form.fundingNeed} onChange={v => setField("fundingNeed", v)} />
                <LongField label="What would happen without this grant?" value={form.withoutGrantImpact} onChange={v => setField("withoutGrantImpact", v)} />
                <LongField label="Investment-case justification for co-investment variance" value={form.coInvestmentJustification} onChange={v => setField("coInvestmentJustification", v)} />
                <div className="md:col-span-3 flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox
                        id="capex"
                        checked={form.capexOnlyConfirmed}
                        onCheckedChange={checked => setField("capexOnlyConfirmed", Boolean(checked))}
                    />
                    <Label htmlFor="capex" className="text-sm">
                        Confirm this Matching Grant request is for CAPEX only: productive equipment, technology adoption, climate-resilient infrastructure, or operational upgrades.
                    </Label>
                </div>
            </CardContent>
        </Card>
    );
}

function BusinessImpactSection({
    form,
    setForm,
    setField,
}: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Business, Financial & Impact Overview</CardTitle>
                <CardDescription>Sector, market, and financial narrative for scoring and GAIR.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <LongField label="Business Description" value={form.business.businessDescription} onChange={v => setBusinessField(setForm, "businessDescription", v)} />
                <LongField label="Problem Solved" value={form.business.problemSolved} onChange={v => setBusinessField(setForm, "problemSolved", v)} />
                <TextField label="Value Chain Node" value={form.business.valueChainNode} onChange={v => setBusinessField(setForm, "valueChainNode", v)} />
                <LongField label="Products / Services" value={form.business.productsServices} onChange={v => setBusinessField(setForm, "productsServices", v)} />
                <LongField label="Target Market & Estimated Size" value={form.business.targetMarket} onChange={v => setBusinessField(setForm, "targetMarket", v)} />
                <LongField label="Target Customers" value={form.business.targetCustomers} onChange={v => setBusinessField(setForm, "targetCustomers", v)} />
                <LongField label="Marketing & Sales Strategy" value={form.business.marketingSalesStrategy} onChange={v => setBusinessField(setForm, "marketingSalesStrategy", v)} className="md:col-span-2" />
                <LongField label="Competitive Advantages" value={form.business.competitiveAdvantages} onChange={v => setBusinessField(setForm, "competitiveAdvantages", v)} className="md:col-span-2" />
                <TextField label="Projected Monthly Revenue After Investment" value={form.projectedMonthlyRevenue} onChange={v => setField("projectedMonthlyRevenue", v)} />
                <TextField label="Projected Annual Revenue After Investment" value={form.projectedAnnualRevenue} onChange={v => setField("projectedAnnualRevenue", v)} />
                <TextField label="Projected Revenue Growth Rate" value={form.projectedGrowthRate} onChange={v => setField("projectedGrowthRate", v)} />
                <TextField label="Projection Assumptions" value={form.projectionAssumptions} onChange={v => setField("projectionAssumptions", v)} />
                <LongField label="Employment Terms" value={form.employmentTerms} onChange={v => setField("employmentTerms", v)} />
                <LongField label="Inclusion Strategy" value={form.inclusionStrategy} onChange={v => setField("inclusionStrategy", v)} />
                <LongField label="Environmental / Climate Impact" value={form.environmentalImpact} onChange={v => setField("environmentalImpact", v)} />
                <LongField label="Environmental Outcome Indicators" value={form.environmentalIndicators} onChange={v => setField("environmentalIndicators", v)} />
                <LongField label="Value Chain / Community Impact" value={form.communityImpact} onChange={v => setField("communityImpact", v)} />
                <LongField label="Innovation Element" value={form.innovationElement} onChange={v => setField("innovationElement", v)} />
            </CardContent>
        </Card>
    );
}

function WizardReviewSummary({
    summary,
    issueGroups,
    onGoToStep,
}: {
    summary: ReturnType<typeof getWizardReviewSummary>;
    issueGroups: ReturnType<typeof flattenStepErrorsWithLabels>;
    onGoToStep: (index: number) => void;
}) {
    return (
        <Card className="border-slate-200">
            <CardHeader>
                <CardTitle className="text-base">Review before submit</CardTitle>
                <CardDescription>Confirm key details captured across all steps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <ReviewRow label="Enterprise" value={summary.enterpriseName} />
                    <ReviewRow label="Track" value={summary.trackLabel} />
                    <ReviewRow
                        label="Annual revenue (eligibility)"
                        value={summary.revenue > 0 ? `KES ${summary.revenue.toLocaleString("en-KE")}` : "Not set"}
                    />
                    <ReviewRow label="Revenue gate" value={summary.revenueEligible ? "Eligible" : summary.revenue > 0 ? "Ineligible" : "Pending"} />
                    <ReviewRow label="Total project" value={summary.totalProject > 0 ? `KES ${summary.totalProject.toLocaleString("en-KE")}` : "—"} />
                    <ReviewRow label="BIRE grant requested" value={summary.bireGrant > 0 ? `KES ${summary.bireGrant.toLocaleString("en-KE")}` : "—"} />
                    <ReviewRow label="Enterprise contribution" value={summary.enterpriseContribution > 0 ? `KES ${summary.enterpriseContribution.toLocaleString("en-KE")}` : "—"} />
                    <ReviewRow label="Budget line items" value={String(summary.budgetLines)} />
                    <ReviewRow label="Mandatory documents enclosed" value={`${summary.docsConfirmed} / ${summary.docsTotal}`} />
                    <ReviewRow label="Declaration" value={summary.declarationAccepted ? "Accepted" : "Pending"} />
                    <ReviewRow label="Use-of-funds confirmed" value={summary.useOfFundsAcknowledged ? "Yes" : "No"} />
                </div>

                {issueGroups.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50/70 dark:bg-red-950/20 dark:border-red-900/50 p-4 space-y-3">
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">
                            Complete these steps before submitting
                        </p>
                        {issueGroups.map((group) => (
                            <div key={group.stepId} className="rounded-md border border-red-200/80 bg-background/60 p-3 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium">{group.stepLabel}</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => onGoToStep(group.stepIndex)}
                                    >
                                        Go to step
                                    </Button>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-xs text-red-800 dark:text-red-200/90">
                                    {group.errors.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            You can still save a draft; submit is blocked until all items above are resolved.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border p-2.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium mt-0.5">{value}</p>
        </div>
    );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold mt-0.5">{value}</p>
        </div>
    );
}

function TextField({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (value: string) => void; className?: string; placeholder?: string }) {
    return (
        <div className={className}>
            <Label className="text-xs font-medium">{label}</Label>
            <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5" />
        </div>
    );
}

function NumberField({
    label,
    value,
    onChange,
    readOnly = false,
}: {
    label: string;
    value: number;
    onChange?: (value: number) => void;
    readOnly?: boolean;
}) {
    return (
        <div>
            <Label className="text-xs font-medium">{label}</Label>
            <Input
                type="number"
                value={value}
                readOnly={readOnly}
                onChange={readOnly ? undefined : (e) => onChange?.(numberValue(e.target.value))}
                className={cn("mt-1.5", readOnly && "bg-muted/50 cursor-default")}
            />
        </div>
    );
}

function LongField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
    return (
        <div className={className}>
            <Label className="text-xs font-medium">{label}</Label>
            <Textarea value={value} onChange={e => onChange(e.target.value)} rows={4} className="mt-1.5 resize-none" />
        </div>
    );
}

function RepeatingBudget({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Eligible Use of Funds - Detailed Budget</CardTitle>
                <CardDescription>Use CAPEX-linked items only. Select a category and confirm each line is eligible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border p-3 bg-slate-50/80">
                    <Checkbox
                        id="use-of-funds-ack"
                        checked={form.useOfFundsAcknowledged}
                        onCheckedChange={checked => setForm(prev => ({ ...prev, useOfFundsAcknowledged: Boolean(checked) }))}
                    />
                    <Label htmlFor="use-of-funds-ack" className="text-sm leading-relaxed">
                        I confirm this budget excludes personal expenses, loan repayments, and routine overhead costs not linked to the approved CAPEX investment.
                    </Label>
                </div>
                {form.budgetItems.map((row, index) => (
                    <div key={index} className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Budget line {index + 1}
                            </p>
                            {form.budgetItems.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeBudget(setForm, index)}
                                >
                                    <Trash className="size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <TextField label="Investment Item" value={row.item} onChange={value => updateBudget(setForm, index, { item: value })} />
                            <div>
                                <Label className="text-xs font-medium">CAPEX Category</Label>
                                <Select
                                    value={row.category || undefined}
                                    onValueChange={value => updateBudget(setForm, index, { category: value })}
                                >
                                    <SelectTrigger className="mt-1.5 w-full">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MATCHING_GRANT_CAPEX_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <NumberField label="Total Cost" value={row.totalCost} onChange={value => updateBudget(setForm, index, { totalCost: value })} />
                            <NumberField label="BIRE Grant" value={row.bireGrant} onChange={value => updateBudget(setForm, index, { bireGrant: value })} />
                            <NumberField label="Enterprise Contribution" value={row.enterpriseContribution} onChange={value => updateBudget(setForm, index, { enterpriseContribution: value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={`budget-eligible-${index}`}
                                checked={row.confirmedEligible}
                                onCheckedChange={checked => updateBudget(setForm, index, { confirmedEligible: Boolean(checked) })}
                            />
                            <Label htmlFor={`budget-eligible-${index}`} className="text-xs">
                                Confirmed CAPEX-eligible item (not personal expense, loan repayment, or unrelated overhead)
                            </Label>
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => addBudget(setForm)}
                >
                    <Plus className="size-4" />
                    Add budget line
                </Button>
            </CardContent>
        </Card>
    );
}

function updateBudget(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<MatchingGrantBudgetItem>) {
    setForm(prev => ({
        ...prev,
        budgetItems: prev.budgetItems.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
}

function RepeatingMilestones({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Implementation Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {form.milestones.map((row, index) => (
                    <div key={index} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Milestone {index + 1}
                            </p>
                            {form.milestones.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMilestone(setForm, index)}
                                >
                                    <Trash className="size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                            <TextField label="Activity / Milestone" value={row.activity} onChange={value => updateMilestone(setForm, index, { activity: value })} />
                            <TextField label="Expected Completion" value={row.completionDate} onChange={value => updateMilestone(setForm, index, { completionDate: value })} />
                            <TextField label="Disbursement Tranche" value={row.tranche} onChange={value => updateMilestone(setForm, index, { tranche: value })} />
                            <TextField label="Verification Method" value={row.verificationMethod} onChange={value => updateMilestone(setForm, index, { verificationMethod: value })} />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => addMilestone(setForm)}
                >
                    <Plus className="size-4" />
                    Add milestone
                </Button>
            </CardContent>
        </Card>
    );
}

function updateMilestone(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<MatchingGrantMilestoneRow>) {
    setForm(prev => ({
        ...prev,
        milestones: prev.milestones.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
}

function RepeatingJobs({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Job Creation Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {form.jobs.map((row, index) => (
                    <div key={index} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Job row {index + 1}
                            </p>
                            {form.jobs.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeJob(setForm, index)}
                                >
                                    <Trash className="size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-5">
                            <TextField label="Role / Job Type" value={row.role} onChange={value => updateJob(setForm, index, { role: value })} />
                            <NumberField label="Women" value={row.women} onChange={value => updateJob(setForm, index, { women: value })} />
                            <NumberField label="Youth" value={row.youth} onChange={value => updateJob(setForm, index, { youth: value })} />
                            <NumberField label="PWD" value={row.pwd} onChange={value => updateJob(setForm, index, { pwd: value })} />
                            <NumberField label="Total" value={jobHeadcountTotal(row)} readOnly />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => addJob(setForm)}
                >
                    <Plus className="size-4" />
                    Add job row
                </Button>
            </CardContent>
        </Card>
    );
}

function jobHeadcountTotal(row: Pick<MatchingGrantJobRow, "women" | "youth" | "pwd">): number {
    return (row.women || 0) + (row.youth || 0) + (row.pwd || 0);
}

function updateJob(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<MatchingGrantJobRow>) {
    setForm(prev => ({
        ...prev,
        jobs: prev.jobs.map((item, i) => {
            if (i !== index) return item;
            const next = { ...item, ...patch };
            if ("women" in patch || "youth" in patch || "pwd" in patch) {
                next.total = jobHeadcountTotal(next);
            }
            return next;
        }),
    }));
}

function SupportingDocuments({
    form,
    setForm,
    readOnly,
}: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    readOnly: boolean;
}) {
    const { enclosed, total } = countMandatoryMgDocumentsEnclosed(form.documents);
    const progressPct = total > 0 ? Math.round((enclosed / total) * 100) : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Supporting Documents</CardTitle>
                <CardDescription>
                    {readOnly
                        ? "Files submitted by the applicant and pulled from programme records. Open each file to review it."
                        : "Files are pulled from the call-for-application, KYC, and CDP session evidence where available. Upload any missing mandatory documents below."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Mandatory documents enclosed</span>
                        <span className="text-muted-foreground">
                            {enclosed} of {total}
                        </span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                </div>
                {form.documents.map((row, index) => (
                    <MgSupportingDocumentRowComponent
                        key={row.document}
                        row={row}
                        disabled={readOnly}
                        onChange={patch => updateDocument(setForm, index, patch)}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

function updateDocument(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<MgSupportingDocumentRow>) {
    setForm(prev => ({
        ...prev,
        documents: prev.documents.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
}

export default function MatchingGrantApplicationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    if (status === "loading") {
        return (
            <div className="container mx-auto max-w-6xl space-y-4 px-4 py-8">
                <Skeleton className="h-8 w-72" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    const mode = isMatchingGrantReadOnlyRole(session?.user?.role) ? "readonly" : "staff";
    return <MatchingGrantApplicationWizard a2fId={Number(id)} mode={mode} />;
}
