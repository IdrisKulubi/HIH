"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import {
    getA2fPipelineEntry,
} from "@/lib/actions/a2f-pipeline";
import {
    action_submitDDReport,
    saveA2fDdDraft,
    getA2fDdReport,
    type A2fDdStage,
    type A2fDdReportInput,
} from "@/lib/actions/a2f-due-diligence";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, ArrowRight, CheckCircle, Circle, FloppyDisk,
    PaperPlaneTilt, Buildings, FileText, FilePdf, ArrowSquareOut,
    ClipboardText, Warning, Spinner, SealCheck,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// STEP CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: "Company Overview",      subtitle: "History, business model, mission/vision" },
    { id: 2, title: "Financial DD",          subtitle: "Revenue, debt, banking, projections" },
    { id: 3, title: "HR, Legal & Risk",      subtitle: "Org structure, insurance, crisis management" },
    { id: 4, title: "Impact & Exit",         subtitle: "ESG, climate, socio-economic, exit strategy" },
];

const STAGE_LABELS: Record<A2fDdStage, string> = {
    initial: "Initial DD",
    pre_ic:  "Pre-IC DD",
    post_ta: "Post-TA DD",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">{children}</h3>;
}

function FieldGroup({ label, name, value, onChange, placeholder, rows = 3 }: {
    label: string; name: string; value: string; onChange: (v: string) => void;
    placeholder?: string; rows?: number;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={name} className="text-sm">{label}</Label>
            <Textarea
                id={name}
                rows={rows}
                placeholder={placeholder ?? `Enter ${label.toLowerCase()}…`}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="resize-none text-sm"
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SIDE PANEL
// ─────────────────────────────────────────────────────────────────────────────

function DocumentSidePanel({ business }: { business: Record<string, string | null | undefined> }) {
    const docs: Array<{ label: string; url: string | null | undefined }> = [
        { label: "Registration Certificate",  url: business?.registrationCertificateUrl },
        { label: "Financial Records",          url: business?.financialRecordsUrl },
        { label: "Audited Accounts",           url: business?.auditedAccountsUrl },
        { label: "Tax Compliance",             url: business?.taxComplianceUrl },
        { label: "Sales Evidence",             url: business?.salesEvidenceUrl },
        { label: "Business Photos",            url: business?.photosUrl },
        { label: "Compliance Documents",       url: business?.complianceDocumentsUrl },
    ].filter(d => d.url);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText weight="duotone" className="size-4 text-muted-foreground" />
                    Application Documents
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {docs.length} document{docs.length !== 1 ? "s" : ""} available
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No documents uploaded</p>
                ) : (
                    docs.map(doc => (
                        <button
                            key={doc.label}
                            onClick={() => setPreviewUrl(prev => prev === doc.url ? null : doc.url!)}
                            className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left text-sm transition-colors ${
                                previewUrl === doc.url
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                    : "hover:bg-muted/50 border border-transparent"
                            }`}
                        >
                            <FilePdf weight="duotone" className="size-5 text-red-500 shrink-0" />
                            <span className="flex-1 truncate text-xs font-medium">{doc.label}</span>
                            <ArrowSquareOut className="size-3.5 text-muted-foreground" />
                        </button>
                    ))
                )}
            </div>

            {/* Preview pane */}
            {previewUrl && (
                <div className="border-t">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                        <span className="text-xs font-medium">Preview</span>
                        <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                    Open <ArrowSquareOut className="size-3 ml-1" />
                                </a>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setPreviewUrl(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                    <iframe
                        src={previewUrl}
                        className="w-full h-80 border-0"
                        title="Document preview"
                    />
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP FORMS
// ─────────────────────────────────────────────────────────────────────────────

function Step1Form({ data, onChange }: { data: Record<string, string>; onChange: (key: string, v: string) => void }) {
    return (
        <div className="space-y-4">
            <SectionTitle>Company Overview & Operations</SectionTitle>
            <FieldGroup label="Company History" name="companyHistory" value={data.companyHistory ?? ""} onChange={v => onChange("companyHistory", v)}
                placeholder="Describe the founding story, major milestones, and how the business has evolved…" rows={4} />
            <FieldGroup label="Business Model" name="businessModel" value={data.businessModel ?? ""} onChange={v => onChange("businessModel", v)}
                placeholder="How does the business create, deliver, and capture value?…" rows={4} />
            <FieldGroup label="Mission & Vision" name="missionVision" value={data.missionVision ?? ""} onChange={v => onChange("missionVision", v)}
                placeholder="What is the enterprise's stated mission and long-term vision?…" />
            <FieldGroup label="Products & Services" name="productsServices" value={data.productsServices ?? ""} onChange={v => onChange("productsServices", v)}
                placeholder="Describe the core products or services offered…" />
            <FieldGroup label="Geographic Presence" name="geographicPresence" value={data.geographicPresence ?? ""} onChange={v => onChange("geographicPresence", v)}
                placeholder="Counties, regions, or countries where the business operates…" rows={2} />
        </div>
    );
}

function Step2Form({ data, onChange }: { data: Record<string, string>; onChange: (key: string, v: string) => void }) {
    return (
        <div className="space-y-4">
            <SectionTitle>Financial Due Diligence</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Annual Revenue (KES)" name="annualRevenue" value={data.annualRevenue ?? ""} onChange={v => onChange("annualRevenue", v)}
                    placeholder="e.g. 5,000,000" rows={1} />
                <FieldGroup label="Revenue Growth Rate (%)" name="revenueGrowthRate" value={data.revenueGrowthRate ?? ""} onChange={v => onChange("revenueGrowthRate", v)}
                    placeholder="e.g. 23% YoY" rows={1} />
            </div>
            <FieldGroup label="Debt Obligations" name="debtObligations" value={data.debtObligations ?? ""} onChange={v => onChange("debtObligations", v)}
                placeholder="Describe existing loans, leases, and other financial obligations…" />
            <FieldGroup label="Banking Relationships" name="bankingRelationships" value={data.bankingRelationships ?? ""} onChange={v => onChange("bankingRelationships", v)}
                placeholder="Primary banks, mobile money, credit facilities…" rows={2} />
            <FieldGroup label="3-Year Financial Projections" name="threeYearProjections" value={data.threeYearProjections ?? ""} onChange={v => onChange("threeYearProjections", v)}
                placeholder="Projected revenue, EBITDA, and key assumptions for the next 3 years…" rows={4} />
            <FieldGroup label="Cash Flow Position" name="cashFlowPosition" value={data.cashFlowPosition ?? ""} onChange={v => onChange("cashFlowPosition", v)}
                placeholder="Describe current working capital situation and cash flow challenges…" />
            <FieldGroup label="Grant Utilization Plan" name="grantUtilizationPlan" value={data.grantUtilizationPlan ?? ""} onChange={v => onChange("grantUtilizationPlan", v)}
                placeholder="How will the HiH grant funds be used? List specific activities and amounts…" rows={4} />
        </div>
    );
}

function Step3Form({ data, onChange }: { data: Record<string, string>; onChange: (key: string, v: string) => void }) {
    return (
        <div className="space-y-6">
            <div>
                <SectionTitle>HR & Organization</SectionTitle>
                <div className="space-y-4">
                    <FieldGroup label="Organizational Structure" name="orgStructure" value={data.orgStructure ?? ""} onChange={v => onChange("orgStructure", v)}
                        placeholder="Describe the org chart, reporting lines, and governance…" />
                    <FieldGroup label="Key Personnel" name="keyPersonnel" value={data.keyPersonnel ?? ""} onChange={v => onChange("keyPersonnel", v)}
                        placeholder="Name and qualifications of CEO, CFO, and key department heads…" />
                </div>
            </div>
            <Separator />
            <div>
                <SectionTitle>Legal & Compliance</SectionTitle>
                <div className="space-y-4">
                    <FieldGroup label="Insurance Coverage" name="insuranceCoverage" value={data.insuranceCoverage ?? ""} onChange={v => onChange("insuranceCoverage", v)}
                        placeholder="Types of insurance held (fire, liability, key man, etc.)…" rows={2} />
                    <FieldGroup label="Legal Issues Pending" name="legalIssuesPending" value={data.legalIssuesPending ?? ""} onChange={v => onChange("legalIssuesPending", v)}
                        placeholder="Any pending litigation, regulatory actions, or disputes?…" rows={2} />
                    <FieldGroup label="HSE Compliance" name="hseCompliance" value={data.hseCompliance ?? ""} onChange={v => onChange("hseCompliance", v)}
                        placeholder="Health, safety, and environmental compliance status…" rows={2} />
                </div>
            </div>
            <Separator />
            <div>
                <SectionTitle>Risk Management</SectionTitle>
                <FieldGroup label="Crisis Management Plan" name="crisisManagementPlan" value={data.crisisManagementPlan ?? ""} onChange={v => onChange("crisisManagementPlan", v)}
                    placeholder="How does the business prepare for and respond to major disruptions?…" />
            </div>
        </div>
    );
}

function Step4Form({ data, exitStrategy, onFieldChange, onExitChange }: {
    data: Record<string, string>;
    exitStrategy: string;
    onFieldChange: (key: string, v: string) => void;
    onExitChange: (v: string) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <SectionTitle>Impact Assessment (ESG)</SectionTitle>
                <div className="space-y-4">
                    <FieldGroup label="Climate Angle" name="climateAngle" value={data.climateAngle ?? ""} onChange={v => onFieldChange("climateAngle", v)}
                        placeholder="How does this enterprise address climate challenges or contribute to green transition?…" rows={3} />
                    <FieldGroup label="Socio-Economic Impacts" name="socioEconomicImpacts" value={data.socioEconomicImpacts ?? ""} onChange={v => onFieldChange("socioEconomicImpacts", v)}
                        placeholder="Jobs created, income uplift, community benefits, supply chain effects…" rows={3} />
                    <FieldGroup label="Gender & Youth Inclusion" name="genderInclusion" value={data.genderInclusion ?? ""} onChange={v => onFieldChange("genderInclusion", v)}
                        placeholder="Describe gender and youth participation in ownership, management, and employment…" rows={2} />
                    <FieldGroup label="Environmental Safeguards" name="environmentalSafeguards" value={data.environmentalSafeguards ?? ""} onChange={v => onFieldChange("environmentalSafeguards", v)}
                        placeholder="Measures taken to mitigate negative environmental impacts…" rows={2} />
                </div>
            </div>
            <Separator />
            <div>
                <SectionTitle>Exit Strategy</SectionTitle>
                <FieldGroup
                    label="Exit / Graduation Strategy"
                    name="exitStrategy"
                    value={exitStrategy}
                    onChange={onExitChange}
                    placeholder="How will this enterprise become financially independent after HiH support ends? Describe path to scale, commercial financing, or other grant leverage…"
                    rows={5}
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

function DueDiligenceWorkspace({ a2fId, stage }: { a2fId: number; stage: A2fDdStage }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    // Form state per section
    const [companyOverview, setCompanyOverview] = useState<Record<string, string>>({});
    const [financialDd, setFinancialDd] = useState<Record<string, string>>({});
    const [hrAndRisk, setHrAndRisk] = useState<Record<string, string>>({});
    const [impactEsg, setImpactEsg] = useState<Record<string, string>>({});
    const [exitStrategy, setExitStrategy] = useState("");

    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [entryRes, reportRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getA2fDdReport(a2fId, stage),
        ]);

        if (entryRes.success) setEntry(entryRes.data);

        // Hydrate form with existing draft / submitted data
        if (reportRes.success && reportRes.data) {
            const r = reportRes.data;
            if (r.companyOverview) setCompanyOverview(r.companyOverview as Record<string, string>);
            if (r.financialDd) setFinancialDd(r.financialDd as Record<string, string>);
            if (r.hrAndRisk) {
                // hr_and_risk combines hr_and_risk + legal_compliance fields
                setHrAndRisk({ ...(r.hrAndRisk as Record<string, string>), ...(r.legalCompliance as Record<string, string> ?? {}) });
            }
            if (r.impactEsg) setImpactEsg(r.impactEsg as Record<string, string>);
            if (r.exitStrategy) setExitStrategy(r.exitStrategy);
            if (r.isComplete) setSubmitted(true);
        }

        setLoading(false);
    }, [a2fId, stage]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-save draft 1.5s after last change
    const triggerAutoSave = useCallback(() => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            const payload = buildPayload(false);
            await saveA2fDdDraft(a2fId, payload);
        }, 1500);
    }, [a2fId, companyOverview, financialDd, hrAndRisk, impactEsg, exitStrategy]);

    const buildPayload = (isComplete: boolean): A2fDdReportInput => ({
        stage,
        companyOverview: companyOverview as A2fDdReportInput["companyOverview"],
        financialDd: financialDd as A2fDdReportInput["financialDd"],
        hrAndRisk: hrAndRisk as A2fDdReportInput["hrAndRisk"],
        impactEsg: impactEsg as A2fDdReportInput["impactEsg"],
        exitStrategy,
        isComplete,
    });

    const handleSaveDraft = async () => {
        setSaving(true);
        const res = await saveA2fDdDraft(a2fId, buildPayload(false));
        setSaving(false);
        if (res.success) toast.success("Draft saved");
        else toast.error(res.error ?? "Failed to save draft");
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const res = await action_submitDDReport(a2fId, buildPayload(true));
        setSubmitting(false);
        if (res.success) {
            toast.success(res.message ?? "DD report submitted");
            setSubmitted(true);
        } else {
            toast.error(res.error ?? "Submission failed. Check all required fields.");
        }
    };

    const handleFieldChange = (
        section: "companyOverview" | "financialDd" | "hrAndRisk" | "impactEsg",
        key: string,
        value: string
    ) => {
        const setters = {
            companyOverview: setCompanyOverview,
            financialDd: setFinancialDd,
            hrAndRisk: setHrAndRisk,
            impactEsg: setImpactEsg,
        };
        setters[section](prev => ({ ...prev, [key]: value }));
        triggerAutoSave();
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-10rem)] gap-4 p-6">
                <div className="flex-1 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
                <Skeleton className="w-72 h-full" />
            </div>
        );
    }

    const biz = entry?.application?.business;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* ── Top bar ── */}
            <div className="shrink-0 border-b bg-white px-6 py-3 flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 shrink-0">
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                        {biz?.name ?? "…"} — DD Workspace
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {STAGE_LABELS[stage]} · Step {currentStep} of {STEPS.length}
                    </p>
                </div>

                {submitted && (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                        <SealCheck weight="fill" className="size-3.5 mr-1" />
                        Submitted
                    </Badge>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving || submitted}>
                        {saving ? <Spinner className="size-4 mr-1.5 animate-spin" /> : <FloppyDisk className="size-4 mr-1.5" />}
                        Save Draft
                    </Button>
                    {currentStep === STEPS.length && !submitted && (
                        <Button size="sm" onClick={handleSubmit} disabled={submitting}
                            className="bg-emerald-700 hover:bg-emerald-800">
                            {submitting ? <Spinner className="size-4 mr-1.5 animate-spin" /> : <PaperPlaneTilt className="size-4 mr-1.5" />}
                            Submit Report
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Stepper ── */}
            <div className="shrink-0 border-b bg-muted/20 px-6 py-3">
                <div className="flex items-center gap-0">
                    {STEPS.map((step, idx) => {
                        const isDone = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg transition-colors ${
                                        isCurrent ? "bg-emerald-100 text-emerald-800" :
                                        isDone    ? "text-muted-foreground hover:bg-muted" :
                                                    "text-muted-foreground/50 cursor-default"
                                    }`}
                                >
                                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                        isDone    ? "bg-emerald-500 border-emerald-500 text-white" :
                                        isCurrent ? "border-emerald-600 text-emerald-700 bg-white" :
                                                    "border-muted-foreground/30 text-muted-foreground/50 bg-white"
                                    }`}>
                                        {isDone ? <CheckCircle weight="fill" className="size-3.5" /> : step.id}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className={`text-xs font-semibold leading-none ${isCurrent ? "text-emerald-800" : ""}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{step.subtitle}</p>
                                    </div>
                                </button>
                                {idx < STEPS.length - 1 && (
                                    <div className={`w-8 h-px mx-1 ${isDone ? "bg-emerald-400" : "bg-border"}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Split pane: form (left) + doc panel (right) ── */}
            <div className="flex flex-1 min-h-0">
                {/* Form panel */}
                <div className="flex-1 overflow-y-auto p-6">
                    {submitted && (
                        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                            <SealCheck weight="fill" className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-emerald-800 text-sm">Report Already Submitted</p>
                                <p className="text-emerald-700 text-xs mt-0.5">
                                    This DD report has been marked as complete. You can view the data below but cannot resubmit.
                                    Contact an admin to unlock for revision.
                                </p>
                            </div>
                        </div>
                    )}

                    <fieldset disabled={submitted} className="space-y-6">
                        {currentStep === 1 && (
                            <Step1Form
                                data={companyOverview}
                                onChange={(k, v) => handleFieldChange("companyOverview", k, v)}
                            />
                        )}
                        {currentStep === 2 && (
                            <Step2Form
                                data={financialDd}
                                onChange={(k, v) => handleFieldChange("financialDd", k, v)}
                            />
                        )}
                        {currentStep === 3 && (
                            <Step3Form
                                data={hrAndRisk}
                                onChange={(k, v) => handleFieldChange("hrAndRisk", k, v)}
                            />
                        )}
                        {currentStep === 4 && (
                            <Step4Form
                                data={impactEsg}
                                exitStrategy={exitStrategy}
                                onFieldChange={(k, v) => handleFieldChange("impactEsg", k, v)}
                                onExitChange={v => { setExitStrategy(v); triggerAutoSave(); }}
                            />
                        )}
                    </fieldset>

                    {/* Step navigation */}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                            disabled={currentStep === 1}
                        >
                            <ArrowLeft className="size-4 mr-1.5" />
                            Previous
                        </Button>

                        <span className="text-sm text-muted-foreground">
                            Step {currentStep} of {STEPS.length}
                        </span>

                        {currentStep < STEPS.length ? (
                            <Button onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}>
                                Next
                                <ArrowRight className="size-4 ml-1.5" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || submitted}
                                className="bg-emerald-700 hover:bg-emerald-800"
                            >
                                {submitting
                                    ? <><Spinner className="size-4 mr-1.5 animate-spin" />Submitting…</>
                                    : <><PaperPlaneTilt className="size-4 mr-1.5" />Submit Report</>
                                }
                            </Button>
                        )}
                    </div>
                </div>

                {/* Document side panel */}
                <div className="w-72 shrink-0 border-l bg-muted/10 flex flex-col overflow-hidden">
                    <DocumentSidePanel business={biz ?? {}} />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

function DueDiligencePageContent({ a2fId }: { a2fId: number }) {
    const searchParams = useSearchParams();
    const rawStage = searchParams.get("stage") ?? "initial";
    const stage: A2fDdStage = (["initial", "pre_ic", "post_ta"].includes(rawStage)
        ? rawStage
        : "initial") as A2fDdStage;

    return <DueDiligenceWorkspace a2fId={a2fId} stage={stage} />;
}

export default function DueDiligencePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Spinner className="size-8 animate-spin text-emerald-600" />
            </div>
        }>
            <DueDiligencePageContent a2fId={Number(id)} />
        </Suspense>
    );
}
