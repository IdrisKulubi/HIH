"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import {
    getMatchingGrantApplication,
    saveMatchingGrantApplication,
    type MatchingGrantApplicationInput,
} from "@/lib/actions/a2f-matching-grant-applications";
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
    PaperPlaneTilt, Warning, ClipboardText, Buildings, User, UsersThree, Handshake, Coins, ShieldCheck, Check,
} from "@phosphor-icons/react";
import {
    MG_WIZARD_STEPS,
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
    MATCHING_GRANT_CAPEX_CATEGORIES,
    emptyOwners,
    emptyBudgetRows,
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
    validateBudgetUseOfFunds,
    resolveAnnualRevenueForEligibility,
} from "@/lib/matching-grant-form-types";
import { isMatchingGrantTrackEligible } from "@/lib/a2f-constants";

type Milestone = {
    activity: string;
    completionDate: string;
    tranche: string;
    verificationMethod: string;
};

type JobRow = {
    role: string;
    women: number;
    youth: number;
    pwd: number;
    total: number;
};

type SupportingDocument = {
    document: string;
    mandatory: string;
    url: string;
    confirmed: boolean;
};

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
    milestones: Milestone[];
    jobs: JobRow[];
    documents: SupportingDocument[];
};

const DEFAULT_DOCUMENTS: SupportingDocument[] = [
    { document: "National ID / Passport of Lead Entrepreneur", mandatory: "Yes", url: "", confirmed: false },
    { document: "Certificate of Business Registration / Incorporation", mandatory: "Yes", url: "", confirmed: false },
    { document: "KRA PIN Certificate", mandatory: "Yes", url: "", confirmed: false },
    { document: "Business Permit / Trade Licence", mandatory: "Yes", url: "", confirmed: false },
    { document: "Bank / M-Pesa statements (last 6-12 months)", mandatory: "Yes", url: "", confirmed: false },
    { document: "Financial statements / management accounts", mandatory: "If applicable", url: "", confirmed: false },
    { document: "Business plan or executive summary", mandatory: "If applicable", url: "", confirmed: false },
    { document: "Market contracts, purchase orders, or LPOs", mandatory: "If available", url: "", confirmed: false },
];

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
    milestones: Array.from({ length: 5 }, () => ({ activity: "", completionDate: "", tranche: "", verificationMethod: "" })),
    jobs: Array.from({ length: 4 }, () => ({ role: "", women: 0, youth: 0, pwd: 0, total: 0 })),
    documents: DEFAULT_DOCUMENTS,
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
        enterpriseIdentification: serializeEnterpriseIdentification(data.enterprise, data.otherOwners),
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
        budgetItems: data.budgetItems.map(row => ({ ...row })) as Array<Record<string, unknown>>,
        implementationMilestones: data.milestones,
        financialProjections: {
            projectedMonthlyRevenue: data.projectedMonthlyRevenue,
            projectedAnnualRevenue: data.projectedAnnualRevenue,
            projectedGrowthRate: data.projectedGrowthRate,
            assumptions: data.projectionAssumptions,
        },
        jobCreationPlan: data.jobs,
        impact: {
            employmentTerms: data.employmentTerms,
            inclusionStrategy: data.inclusionStrategy,
            environmentalImpact: data.environmentalImpact,
            environmentalIndicators: data.environmentalIndicators,
            communityImpact: data.communityImpact,
            innovationElement: data.innovationElement,
        },
        supportingDocuments: data.documents,
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
        budgetItems: Array.isArray(record.budgetItems) && record.budgetItems.length
            ? parseBudgetItems(record.budgetItems)
            : fallback.budgetItems,
        milestones: Array.isArray(record.implementationMilestones) && record.implementationMilestones.length ? record.implementationMilestones : fallback.milestones,
        jobs: Array.isArray(record.jobCreationPlan) && record.jobCreationPlan.length ? record.jobCreationPlan : fallback.jobs,
        documents: Array.isArray(record.supportingDocuments) && record.supportingDocuments.length ? record.supportingDocuments : fallback.documents,
    };
}

export default function MatchingGrantApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const loadData = async () => {
        setLoading(true);
        const [entryRes, appRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getMatchingGrantApplication(a2fId),
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
            setForm(fromRecord(appRes.success ? appRes.data : null, seeded));
        } else {
            toast.error("Pipeline entry not found");
        }

        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    useEffect(() => { loadData(); }, [a2fId]);

    useEffect(() => {
        const stored = sessionStorage.getItem(wizardStorageKey(a2fId));
        const parsed = stored != null ? Number(stored) : NaN;
        if (Number.isFinite(parsed) && parsed >= 0 && parsed < MG_WIZARD_STEPS.length) {
            setActiveStep(parsed);
        }
    }, [a2fId]);

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
    const warnings = useMemo(() => {
        const items: string[] = [];
        if (form.totalProjectAmount <= 0) items.push("Total project amount is required.");
        if (Math.abs(form.totalProjectAmount - (form.bireGrantAmount + form.enterpriseContributionAmount)) > 1) {
            items.push("BIRE grant and enterprise contribution should add up to total project amount.");
        }
        if (grantShare > 70) items.push("BIRE share is above the standard 70% guidance.");
        if (enterpriseShare < 30) items.push("Enterprise contribution is below the standard 30% guidance.");
        if (!form.capexOnlyConfirmed) items.push("CAPEX-only confirmation is pending.");
        if (!form.useOfFundsAcknowledged) {
            items.push("Confirm the budget excludes ineligible uses (personal expenses, loan repayments, unrelated overheads).");
        }
        items.push(...validateBudgetUseOfFunds(form.budgetItems));
        if (eligibilityRevenue <= 0) {
            items.push("Annual revenue (2025 or latest year) is required for track eligibility.");
        } else if (!revenueEligible) {
            items.push(
                track === "acceleration"
                    ? "Accelerator Track requires annual revenue above KES 3,000,000."
                    : "Foundation Track requires annual revenue from KES 500,000 to KES 3,000,000."
            );
        }
        return items;
    }, [enterpriseShare, form, grantShare, eligibilityRevenue, revenueEligible, track]);

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    const currentStepId = MG_WIZARD_STEPS[activeStep]?.id ?? "enterprise";
    const progressPct = Math.round(((activeStep + 1) / MG_WIZARD_STEPS.length) * 100);
    const reviewSummary = useMemo(
        () => getWizardReviewSummary(form, wizardContext),
        [form, wizardContext]
    );

    function goToStep(index: number) {
        if (index < 0 || index >= MG_WIZARD_STEPS.length) return;
        setActiveStep(index);
    }

    function handleNext() {
        const errors = getStepValidationErrors(currentStepId, form, wizardContext);
        if (errors.length > 0) {
            toast.error(errors[0]);
            return;
        }
        setCompletedSteps(prev => (prev.includes(activeStep) ? prev : [...prev, activeStep]));
        goToStep(activeStep + 1);
    }

    function handleBack() {
        goToStep(activeStep - 1);
    }

    function handleStepClick(index: number) {
        const maxAccessible = Math.max(activeStep, ...completedSteps, 0);
        if (index <= maxAccessible) {
            goToStep(index);
            return;
        }
        toast.error("Complete the current step before jumping ahead.");
    }

    async function handleSave(status: "draft" | "submitted") {
        if (status === "submitted") {
            const errors = getStepValidationErrors("documents", form, wizardContext);
            if (errors.length > 0) {
                toast.error(errors[0]);
                goToStep(MG_WIZARD_STEPS.length - 1);
                return;
            }
        }
        setSaving(true);
        const res = await saveMatchingGrantApplication(a2fId, toInput({ ...form, status }));
        setSaving(false);

        if (res.success) {
            toast.success(res.message ?? "Matching Grant application saved");
            setForm(prev => ({ ...prev, status }));
            if (status === "submitted") {
                setCompletedSteps(MG_WIZARD_STEPS.map((_, i) => i));
            }
            if (res.data?.validation.warnings.length) {
                toast.warning(`${res.data.validation.warnings.length} validation note(s) need attention`);
            }
        } else {
            toast.error(res.error ?? "Failed to save Matching Grant application");
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
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> Entry Overview
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
            </div>

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
                            const isCompleted = completedSteps.includes(index);
                            const maxAccessible = Math.max(activeStep, ...completedSteps, 0);
                            const isAccessible = index <= maxAccessible;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => handleStepClick(index)}
                                    disabled={!isAccessible}
                                    className={cn(
                                        "w-full text-left rounded-lg p-3 transition-colors border",
                                        isActive && "border-blue-300 bg-blue-50/80",
                                        !isActive && isCompleted && "border-emerald-200 bg-emerald-50/50",
                                        !isActive && !isCompleted && "border-transparent hover:bg-muted/50",
                                        !isAccessible && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={cn(
                                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                                            isCompleted ? "bg-emerald-600 text-white" : isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                                        )}>
                                            {isCompleted ? <Check className="size-3.5" weight="bold" /> : index + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium flex items-center gap-1.5">
                                                <StepIcon className="size-4 shrink-0" />
                                                {step.shortLabel}
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

                    {warnings.length > 0 && (
                        <Card className="border-amber-200 bg-amber-50/70">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Warning weight="duotone" className="size-4 text-amber-600" />
                                    Validation Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {warnings.map(item => <p key={item} className="text-xs text-amber-800">{item}</p>)}
                            </CardContent>
                        </Card>
                    )}

                    <WizardStepContent
                        stepId={currentStepId}
                        form={form}
                        setForm={setForm}
                        setField={setField}
                        track={track}
                    />

                    {currentStepId === "documents" && (
                        <WizardReviewSummary summary={reviewSummary} warnings={warnings} />
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
                    <Button
                        variant="outline"
                        onClick={() => handleSave("draft")}
                        disabled={saving}
                        className="gap-2"
                    >
                        <FloppyDisk className="size-4" />
                        Save Draft
                    </Button>
                    <div className="flex items-center gap-2">
                        {activeStep < MG_WIZARD_STEPS.length - 1 ? (
                            <Button onClick={handleNext} disabled={saving} className="gap-2">
                                Next
                                <ArrowRight className="size-4" />
                            </Button>
                        ) : (
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
                    <div key={index} className="grid gap-3 md:grid-cols-5 rounded-lg border p-3">
                        <TextField label="Name" value={row.name} onChange={v => updateOwner(setForm, index, { name: v })} />
                        <TextField label="Role" value={row.role} onChange={v => updateOwner(setForm, index, { role: v })} />
                        <NumberField label="Ownership %" value={row.ownershipPct} onChange={v => updateOwner(setForm, index, { ownershipPct: v })} />
                        <TextField label="Gender" value={row.gender} onChange={v => updateOwner(setForm, index, { gender: v })} />
                        <TextField label="Category" value={row.category} onChange={v => updateOwner(setForm, index, { category: v })} />
                    </div>
                ))}
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
}: {
    stepId: MgWizardStepId;
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    track: "foundation" | "acceleration";
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
                    <SupportingDocuments form={form} setForm={setForm} />
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
                                    onCheckedChange={checked => setField("declarationAccepted", Boolean(checked))}
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
    warnings,
}: {
    summary: ReturnType<typeof getWizardReviewSummary>;
    warnings: string[];
}) {
    return (
        <Card className="border-slate-200">
            <CardHeader>
                <CardTitle className="text-base">Review before submit</CardTitle>
                <CardDescription>Confirm key details captured across all steps.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
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
                <ReviewRow label="Documents enclosed" value={`${summary.docsConfirmed} / ${summary.docsTotal}`} />
                <ReviewRow label="Declaration" value={summary.declarationAccepted ? "Accepted" : "Pending"} />
                <ReviewRow label="Use-of-funds confirmed" value={summary.useOfFundsAcknowledged ? "Yes" : "No"} />
                {warnings.length > 0 && (
                    <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                        <p className="text-xs font-medium text-amber-900 mb-1">{warnings.length} validation note(s) remain</p>
                        <p className="text-xs text-amber-800">You can still save a draft; submit may be blocked until resolved.</p>
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

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <div>
            <Label className="text-xs font-medium">{label}</Label>
            <Input type="number" value={value} onChange={e => onChange(numberValue(e.target.value))} className="mt-1.5" />
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
                    <div key={index} className="grid gap-3 md:grid-cols-4 rounded-lg border p-3">
                        <TextField label="Activity / Milestone" value={row.activity} onChange={value => updateMilestone(setForm, index, { activity: value })} />
                        <TextField label="Expected Completion" value={row.completionDate} onChange={value => updateMilestone(setForm, index, { completionDate: value })} />
                        <TextField label="Disbursement Tranche" value={row.tranche} onChange={value => updateMilestone(setForm, index, { tranche: value })} />
                        <TextField label="Verification Method" value={row.verificationMethod} onChange={value => updateMilestone(setForm, index, { verificationMethod: value })} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function updateMilestone(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<Milestone>) {
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
                    <div key={index} className="grid gap-3 md:grid-cols-5 rounded-lg border p-3">
                        <TextField label="Role / Job Type" value={row.role} onChange={value => updateJob(setForm, index, { role: value })} />
                        <NumberField label="Women" value={row.women} onChange={value => updateJob(setForm, index, { women: value })} />
                        <NumberField label="Youth" value={row.youth} onChange={value => updateJob(setForm, index, { youth: value })} />
                        <NumberField label="PWD" value={row.pwd} onChange={value => updateJob(setForm, index, { pwd: value })} />
                        <NumberField label="Total" value={row.total} onChange={value => updateJob(setForm, index, { total: value })} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function updateJob(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<JobRow>) {
    setForm(prev => ({
        ...prev,
        jobs: prev.jobs.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
}

function SupportingDocuments({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Supporting Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {form.documents.map((row, index) => (
                    <div key={row.document} className="grid gap-3 md:grid-cols-[1fr_120px_1fr_100px] rounded-lg border p-3 items-end">
                        <div>
                            <Label className="text-xs font-medium">Document</Label>
                            <p className="text-sm mt-1.5">{row.document}</p>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Mandatory?</Label>
                            <p className="text-sm mt-1.5">{row.mandatory}</p>
                        </div>
                        <TextField label="Document URL / Reference" value={row.url} onChange={value => updateDocument(setForm, index, { url: value })} />
                        <div className="flex items-center gap-2 pb-2">
                            <Checkbox checked={row.confirmed} onCheckedChange={checked => updateDocument(setForm, index, { confirmed: Boolean(checked) })} />
                            <Label className="text-xs">Enclosed</Label>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function updateDocument(setForm: React.Dispatch<React.SetStateAction<FormState>>, index: number, patch: Partial<SupportingDocument>) {
    setForm(prev => ({
        ...prev,
        documents: prev.documents.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
}
