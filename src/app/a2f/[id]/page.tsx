"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getA2fPipelineEntry, advancePipelineStatus, type A2fPipelineStatus } from "@/lib/actions/a2f-pipeline";
import { PIPELINE_STAGE_ORDER, PIPELINE_STAGE_LABELS } from "@/lib/a2f-constants";
import { getA2fScoringBreakdown } from "@/lib/actions/a2f-scoring";
import { getGrantAgreement } from "@/lib/actions/a2f-contracts";
import { getDisbursementLedger } from "@/lib/actions/a2f-disbursements";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Buildings, MapPin, User, Coins, FileText,
    ChartLine, ClipboardText, CheckCircle, Circle, ArrowRight,
    CurrencyDollar, Handshake, CalendarCheck, Warning,
    ArrowsClockwise, PencilSimple, Eye,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// STAGE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

// PIPELINE_STAGE_LABELS imported from @/lib/a2f-constants

const STAGE_ACTIONS: Record<string, { label: string; href?: string; nextStage?: A2fPipelineStatus; icon: React.ElementType }> = {
    a2f_pipeline:          { label: "Begin Initial DD",        href:      "due-diligence",  icon: ClipboardText },
    due_diligence_initial: { label: "Go to DD Workspace",      href:      "due-diligence",  icon: ClipboardText },
    pre_ic_scoring:        { label: "Go to Scoring",           href:      "scoring",         icon: ChartLine },
    ic_appraisal_review:   { label: "Go to Appraisal",         href:      "appraisal",       icon: FileText },
    offer_issued:          { label: "Generate Contract",        href:      "contracts",       icon: Handshake },
    contracting:           { label: "View Contract",            href:      "contracts",       icon: Handshake },
    disbursement_active:   { label: "Log Disbursement",         href:      "disbursements",   icon: CurrencyDollar },
    post_ta_monitoring:    { label: "Post-TA Report",           href:      "due-diligence?stage=post_ta", icon: CalendarCheck },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function A2fEntryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);
    const router = useRouter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [scoring, setScoring] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [agreement, setAgreement] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [ledger, setLedger] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [advancing, setAdvancing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const [entryRes, scoringRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getA2fScoringBreakdown(a2fId),
        ]);

        if (entryRes.success) {
            setEntry(entryRes.data);

            // Load agreement & ledger only if we have one
            const agreementRes = await getGrantAgreement(a2fId);
            if (agreementRes.success && agreementRes.data) {
                setAgreement(agreementRes.data);
                const ledgerRes = await getDisbursementLedger(agreementRes.data.id);
                if (ledgerRes.success) setLedger(ledgerRes.data);
            }
        } else {
            toast.error("Pipeline entry not found");
            router.push("/a2f");
        }

        if (scoringRes.success) setScoring(scoringRes.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [a2fId]);

    const handleAdvance = async (nextStage: A2fPipelineStatus) => {
        setAdvancing(true);
        const res = await advancePipelineStatus(a2fId, nextStage);
        setAdvancing(false);
        if (res.success) {
            toast.success(res.message ?? "Stage advanced");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to advance stage");
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-48 col-span-2" />
                    <Skeleton className="h-48" />
                </div>
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!entry) return null;

    const currentStageIdx = PIPELINE_STAGE_ORDER.indexOf(entry.status as A2fPipelineStatus);
    const progressPct = Math.round(((currentStageIdx + 1) / PIPELINE_STAGE_ORDER.length) * 100);
    const stageAction = STAGE_ACTIONS[entry.status as A2fPipelineStatus];
    const biz = entry.application?.business;
    const applicant = biz?.applicant;

    return (
        <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
            {/* ── Back + header ── */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href="/a2f">
                        <ArrowLeft className="size-4" /> Pipeline
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <h1 className="text-xl font-bold truncate">{biz?.name}</h1>
                <Badge
                    className={
                        entry.instrumentType === "matching_grant"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-purple-100 text-purple-700 border border-purple-200"
                    }
                >
                    {entry.instrumentType === "matching_grant" ? "Matching Grant" : "Repayable Grant"}
                </Badge>
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Enterprise info */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Buildings weight="duotone" className="size-5 text-emerald-600" />
                            Enterprise Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <InfoRow label="Business Name" value={biz?.name} />
                        <InfoRow label="Sector" value={biz?.sector?.replace(/_/g, " ")} />
                        <InfoRow label="County / City" value={`${biz?.county ?? "—"} / ${biz?.city}`} />
                        <InfoRow label="Years Operational" value={`${biz?.yearsOperational} year(s)`} />
                        <InfoRow
                            label="Applicant"
                            value={`${applicant?.firstName} ${applicant?.lastName}`}
                        />
                        <InfoRow label="Email" value={applicant?.email} />
                        <InfoRow label="Revenue Last Year"
                            value={`KES ${Number(biz?.revenueLastYear ?? 0).toLocaleString("en-KE")}`}
                        />
                        <InfoRow label="Application ID" value={`#${entry.applicationId}`} />
                    </CardContent>
                </Card>

                {/* Grant details */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Coins weight="duotone" className="size-5 text-amber-600" />
                            Grant Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <InfoRow label="Requested Amount"
                            value={`KES ${Number(entry.requestedAmount).toLocaleString("en-KE")}`}
                        />
                        <InfoRow label="Officer" value={entry.a2fOfficer?.userProfile
                            ? `${entry.a2fOfficer.userProfile.firstName} ${entry.a2fOfficer.userProfile.lastName}`
                            : "Unassigned"
                        } />
                        <InfoRow label="DD Reports" value={`${entry.dueDiligenceReports?.length ?? 0} submitted`} />
                        <InfoRow label="Scoring Records" value={`${entry.scoringRecords?.length ?? 0} record(s)`} />
                        <InfoRow label="Appraisals" value={`${entry.investmentAppraisals?.length ?? 0} document(s)`} />
                    </CardContent>
                </Card>
            </div>

            {/* ── Pipeline progress ── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Pipeline Progress</CardTitle>
                        <span className="text-sm text-muted-foreground font-medium">{progressPct}% complete</span>
                    </div>
                    <Progress value={progressPct} className="h-2 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                        {PIPELINE_STAGE_ORDER.map((stage, idx) => {
                            const isDone = idx < currentStageIdx;
                            const isCurrent = idx === currentStageIdx;
                            const isFuture = idx > currentStageIdx;
                            return (
                                <div key={stage} className="flex flex-col items-center gap-1.5 text-center">
                                    <div className={`size-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone    ? "bg-emerald-500 border-emerald-500 text-white" :
                                        isCurrent ? "bg-white border-emerald-500 text-emerald-600" :
                                                    "bg-muted border-muted-foreground/20 text-muted-foreground"
                                    }`}>
                                        {isDone
                                            ? <CheckCircle weight="fill" className="size-4" />
                                            : <span className="text-[10px] font-bold">{idx + 1}</span>
                                        }
                                    </div>
                                    <span className={`text-[10px] leading-tight font-medium ${
                                        isCurrent ? "text-emerald-700" :
                                        isFuture  ? "text-muted-foreground/60" : "text-muted-foreground"
                                    }`}>
                                        {PIPELINE_STAGE_LABELS[stage]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* ── Current stage action card ── */}
            {stageAction && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-emerald-100 p-2">
                                    <stageAction.icon weight="duotone" className="size-5 text-emerald-700" />
                                </div>
                                <div>
                        <p className="font-semibold text-emerald-900">
                                Current Stage: {PIPELINE_STAGE_LABELS[entry.status as A2fPipelineStatus] ?? entry.status}
                            </p>
                                    <p className="text-sm text-emerald-700 mt-0.5">
                                        {getStageDescription(entry.status)}
                                    </p>
                                </div>
                            </div>
                            <Button asChild className="bg-emerald-700 hover:bg-emerald-800 shrink-0">
                                <Link href={`/a2f/${a2fId}/${stageAction.href}`}>
                                    {stageAction.label}
                                    <ArrowRight className="size-4 ml-1.5" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Scoring summary (if available) ── */}
            {scoring && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ChartLine weight="duotone" className="size-5 text-violet-600" />
                                Pre-IC Scoring Summary
                            </CardTitle>
                            <Badge className={
                                scoring.percentage >= 70 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                scoring.percentage >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
                                "bg-red-100 text-red-700 border-red-200"
                            }>
                                {scoring.totalScore}/{scoring.maxTotal} pts ({scoring.percentage}%)
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {scoring.categories?.map((cat: { category: string; earned: number; max: number; percentage: number }) => (
                                <div key={cat.category} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-48 shrink-0 truncate">{cat.category}</span>
                                    <div className="flex-1 bg-muted rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-violet-500 transition-all"
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium w-16 text-right">
                                        {cat.earned}/{cat.max}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Financial summary (if disbursing) ── */}
            {agreement && ledger && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CurrencyDollar weight="duotone" className="size-5 text-amber-600" />
                            Financial Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 text-sm">
                        <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                            <p className="text-xs text-muted-foreground">Total Approved</p>
                            <p className="text-lg font-bold text-emerald-700 mt-0.5">
                                KES {Number(agreement.hihContribution).toLocaleString("en-KE")}
                            </p>
                        </div>
                        <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                            <p className="text-xs text-muted-foreground">Total Disbursed</p>
                            <p className="text-lg font-bold text-blue-700 mt-0.5">
                                KES {(ledger.summary?.totalDisbursed ?? 0).toLocaleString("en-KE")}
                            </p>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
                            <p className="text-xs text-muted-foreground">Total Repaid</p>
                            <p className="text-lg font-bold text-purple-700 mt-0.5">
                                KES {(ledger.summary?.totalRepaid ?? 0).toLocaleString("en-KE")}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "DD Reports", icon: ClipboardText, href: `due-diligence`, count: entry.dueDiligenceReports?.length },
                    { label: "Scoring", icon: ChartLine, href: `scoring`, count: entry.scoringRecords?.length },
                    { label: "Appraisals", icon: FileText, href: `appraisal`, count: entry.investmentAppraisals?.length },
                    { label: "Disbursements", icon: CurrencyDollar, href: `disbursements`, count: ledger?.transactions?.length },
                ].map(({ label, icon: Icon, href, count }) => (
                    <Button key={label} variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
                        <Link href={`/a2f/${a2fId}/${href}`}>
                            <Icon weight="duotone" className="size-5 text-muted-foreground" />
                            <span className="text-sm font-medium">{label}</span>
                            {count != null && (
                                <span className="text-xs text-muted-foreground">{count} record(s)</span>
                            )}
                        </Link>
                    </Button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium mt-0.5 truncate">{value ?? "—"}</p>
        </div>
    );
}

function getStageDescription(status: string): string {
    const descriptions: Record<string, string> = {
        a2f_pipeline:          "Begin the initial due diligence report for this enterprise.",
        due_diligence_initial: "Complete all 11 DD categories in the workspace.",
        pre_ic_scoring:        "Score the enterprise using the Pre-IC scoring rubric.",
        ic_appraisal_review:   "Prepare the GAIR or Investment Memo for IC review.",
        offer_issued:          "Generate and issue the formal grant agreement offer letter.",
        contracting:           "Track the signing workflow and upload the executed agreement.",
        disbursement_active:   "Log disbursements and track repayments in the financial ledger.",
        post_ta_monitoring:    "Submit the Post-TA monitoring and impact report.",
    };
    return descriptions[status] ?? "Proceed with the next step for this pipeline entry.";
}
