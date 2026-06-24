"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getA2fPipelineEntry, updateA2fVerifiedRevenue } from "@/lib/actions/a2f-pipeline";
import { action_calculateA2FScore, getA2fScoringBreakdown } from "@/lib/actions/a2f-scoring";
import { canWriteA2fStaff } from "@/lib/a2f-access";
import {
    MATCHING_GRANT_MAX_TOTAL,
    MATCHING_GRANT_QUALIFYING_SCORE,
    MATCHING_MAX_SCORES,
    getMatchingGrantQualification,
    getMatchingGrantRevenueScore,
    getRevenueGateUxDetail,
    type A2fEnterpriseTrack,
    type MatchingGrantScores,
    type RevenueGateUxDetail,
} from "@/lib/a2f-constants";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft, Buildings, Calculator, ChartLine, CheckCircle,
    ClipboardText, LockKey, Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RevenueGateActions } from "@/components/a2f/RevenueGateActions";

interface CriterionConfig {
    key: string;
    label: string;
    description: string;
    max: number;
    guidance: string;
    locked?: boolean;
}

interface SectionConfig {
    title: string;
    color: "violet" | "blue" | "emerald" | "amber" | "rose";
    criteria: CriterionConfig[];
}

const COLOR_MAP: Record<SectionConfig["color"], string> = {
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
};

const RING_MAP: Record<SectionConfig["color"], string> = {
    violet: "ring-violet-200",
    blue: "ring-blue-200",
    emerald: "ring-emerald-200",
    amber: "ring-amber-200",
    rose: "ring-rose-200",
};

const BADGE_MAP: Record<SectionConfig["color"], string> = {
    violet: "bg-violet-100 text-violet-700 border-violet-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
};

const SCORING_SECTIONS: SectionConfig[] = [
    {
        title: "Financial Readiness & Co-Investment",
        color: "violet",
        criteria: [
            { key: "currentAnnualRevenue", label: "Current Annual Revenue", description: "Revenue hard gate based on assigned track", max: MATCHING_MAX_SCORES.currentAnnualRevenue, guidance: "Officer-assigned revenue score (0–10). A score of 0 is automatic ineligibility." },
            { key: "revenueGrowthTrend", label: "Revenue Growth Trend", description: "Year-on-year revenue trajectory over the last two completed financial years", max: MATCHING_MAX_SCORES.revenueGrowthTrend, guidance: "High: >30% growth = 5 | Moderate: 10-30% = 3 | Low: <10%, flat, or declining = 1" },
            { key: "coInvestmentCommitment", label: "Co-Investment Commitment & Source Quality", description: "Enterprise contribution percentage, quality, and verifiability", max: MATCHING_MAX_SCORES.coInvestmentCommitment, guidance: "High: >=40% fully verifiable = 5 | Moderate: 25-39% = 3 | Low: <25% or weak evidence = 1" },
        ],
    },
    {
        title: "Market & Scalability Potential",
        color: "blue",
        criteria: [
            { key: "marketDemandEvidence", label: "Market Assessment & Demand Evidence", description: "Credible market analysis and documented demand", max: MATCHING_MAX_SCORES.marketDemandEvidence, guidance: "High: contracts, pipeline, or formal research = 8 | Moderate: some evidence = 5 | Low: anecdotal only = 2" },
            { key: "businessModelScalability", label: "Scalability of Business Model", description: "Ability to grow output, revenue, or reach without proportional cost increases", max: MATCHING_MAX_SCORES.businessModelScalability, guidance: "High: credible and costed growth plan = 8 | Moderate: partial plan = 5 | Low: constrained model = 2" },
            { key: "competitiveDifferentiation", label: "Competitive Differentiation & Uniqueness", description: "How clearly the enterprise stands apart from competitors", max: MATCHING_MAX_SCORES.competitiveDifferentiation, guidance: "High: strong uniqueness or barriers = 9 | Moderate: some advantage = 5 | Low: no clear differentiation = 2" },
        ],
    },
    {
        title: "Impact & Inclusion Potential",
        color: "emerald",
        criteria: [
            { key: "projectedDecentJobs", label: "Projected Direct Decent Jobs", description: "New quality jobs projected within 12-24 months", max: MATCHING_MAX_SCORES.projectedDecentJobs, guidance: "High: >5 jobs = 10 | Moderate: 2-5 jobs = 6 | Low: 1-2 jobs = 2" },
            { key: "inclusionTargeting", label: "Jobs Targeting Women, Youth & PWDs", description: "New jobs targeting women, youth, and persons with disabilities", max: MATCHING_MAX_SCORES.inclusionTargeting, guidance: "High: >=50% targeted or >3 targeted roles = 10 | Moderate: 30-49% = 6 | Low: <30% = 2" },
            { key: "environmentalClimateImpact", label: "Environmental & Climate Resilience Impact", description: "Measurable environmental or climate resilience outcomes", max: MATCHING_MAX_SCORES.environmentalClimateImpact, guidance: "High: significant quantified benefits = 10 | Moderate: partially quantified = 6 | Low: minimal or undefined = 2" },
        ],
    },
    {
        title: "Investment Plan & Leverage",
        color: "amber",
        criteria: [
            { key: "useOfFundsQuality", label: "Clarity & Quality of Use of Funds", description: "Quality of budget, milestones, timelines, and verification methods", max: MATCHING_MAX_SCORES.useOfFundsQuality, guidance: "High: clear milestone-based plan = 7 | Moderate: some gaps = 4 | Low: vague or missing details = 1" },
            { key: "leveragePotential", label: "Additional Funding Leverage Potential", description: "Likelihood of attracting follow-on finance", max: MATCHING_MAX_SCORES.leveragePotential, guidance: "High: strong investor pipeline or deal-room ready = 8 | Moderate: early interest = 5 | Low: minimal pipeline = 2" },
        ],
    },
    {
        title: "Innovation",
        color: "rose",
        criteria: [
            { key: "innovation", label: "Exceptional Innovation Elements", description: "Breadth of evidenced innovation across model, efficiency, market reach, or technology", max: MATCHING_MAX_SCORES.innovation, guidance: "High: >3 distinct areas = 10 | Moderate: 2-3 areas = 6 | Low: 1 area = 2 | None = 0" },
        ],
    },
];

const DEFAULT_MATCHING: MatchingGrantScores = {
    currentAnnualRevenue: 0,
    revenueGrowthTrend: 0,
    coInvestmentCommitment: 0,
    marketDemandEvidence: 0,
    businessModelScalability: 0,
    competitiveDifferentiation: 0,
    projectedDecentJobs: 0,
    inclusionTargeting: 0,
    environmentalClimateImpact: 0,
    useOfFundsQuality: 0,
    leveragePotential: 0,
    innovation: 0,
};

function scoreColor(pct: number) {
    if (pct >= 70) return "text-emerald-700";
    if (pct >= 50) return "text-amber-700";
    return "text-red-600";
}

function scoreBg(pct: number) {
    if (pct >= 70) return "bg-emerald-50 border-emerald-200";
    if (pct >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
}

function matchingStatusClasses(status: string | undefined) {
    if (status === "Qualified") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "Ineligible - Revenue") return "bg-red-100 text-red-700 border-red-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
}

function normalizeTrack(track: string | null | undefined): A2fEnterpriseTrack | null {
    return track === "foundation" || track === "acceleration" ? track : null;
}

function formatTrack(track: string | null | undefined) {
    if (track === "acceleration") return "Accelerator Track";
    if (track === "foundation") return "Foundation Track";
    return "Track not set";
}

function CriterionSlider({
    config,
    value,
    onChange,
    barColor,
    revenueIneligibilityHint,
    readOnly = false,
}: {
    config: CriterionConfig;
    value: number;
    onChange: (val: number) => void;
    barColor: string;
    revenueIneligibilityHint?: string | null;
    readOnly?: boolean;
}) {
    const pct = config.max > 0 ? Math.round((value / config.max) * 100) : 0;
    const disabled = readOnly || config.locked;

    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight flex items-center gap-1.5">
                        {config.label}
                        {disabled && <LockKey className="size-3.5 text-muted-foreground" />}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                    <input
                        type="number"
                        min={0}
                        max={config.max}
                        value={value}
                        disabled={disabled}
                        onChange={e => onChange(Math.min(config.max, Math.max(0, Number(e.target.value))))}
                        className="w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
                    />
                    <span className="text-xs text-muted-foreground">/{config.max}</span>
                </div>
            </div>
            <input
                type="range"
                min={0}
                max={config.max}
                step={1}
                value={value}
                disabled={disabled}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
            />
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground italic leading-tight">{config.guidance}</p>
            {config.key === "currentAnnualRevenue" && value === 0 && revenueIneligibilityHint && (
                <p className="text-[11px] text-red-700 dark:text-red-300 font-medium leading-tight">
                    {revenueIneligibilityHint}
                </p>
            )}
        </div>
    );
}

function ScoringSection({
    section,
    scores,
    onChange,
    revenueIneligibilityHint,
    readOnly = false,
}: {
    section: SectionConfig;
    scores: Record<string, number>;
    onChange: (key: string, val: number) => void;
    revenueIneligibilityHint?: string | null;
    readOnly?: boolean;
}) {
    const sectionTotal = section.criteria.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
    const sectionMax = section.criteria.reduce((sum, c) => sum + c.max, 0);
    const sectionPct = sectionMax > 0 ? Math.round((sectionTotal / sectionMax) * 100) : 0;

    return (
        <div className={`rounded-xl border ring-1 ${RING_MAP[section.color]} p-5 space-y-5`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`size-2.5 rounded-full ${COLOR_MAP[section.color]}`} />
                    <h3 className="font-semibold text-sm">{section.title}</h3>
                </div>
                <Badge className={`text-xs font-bold border ${BADGE_MAP[section.color]}`}>
                    {sectionTotal}/{sectionMax} ({sectionPct}%)
                </Badge>
            </div>
            {section.criteria.map(criterion => (
                <CriterionSlider
                    key={criterion.key}
                    config={criterion}
                    value={scores[criterion.key] ?? 0}
                    onChange={val => onChange(criterion.key, val)}
                    barColor={COLOR_MAP[section.color]}
                    revenueIneligibilityHint={revenueIneligibilityHint}
                    readOnly={readOnly}
                />
            ))}
        </div>
    );
}

function FoundationRangeIndicator({ hint }: { hint: RevenueGateUxDetail['foundationRangeHint'] }) {
    if (!hint || hint === 'within') return null;

    const label = hint === 'above'
        ? 'Your revenue is above this range'
        : 'Your revenue is below this range';

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>500k</span>
                <span>3M</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-y-0 left-[0%] right-[0%] bg-emerald-200/80 dark:bg-emerald-900/40 rounded-full" style={{ left: '8%', right: '8%' }} />
                <div
                    className={cn(
                        'absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-background',
                        hint === 'above' ? 'right-0 bg-red-600' : 'left-0 bg-red-600'
                    )}
                    aria-hidden
                />
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">{label}</p>
        </div>
    );
}

function RevenueGateCard({
    a2fId,
    track,
    revenue,
    revenueScore,
    detail,
    canEdit,
    onRevenueScoreChange,
    onResolved,
}: {
    a2fId: number;
    track: A2fEnterpriseTrack | null;
    revenue: number;
    revenueScore: number;
    detail: RevenueGateUxDetail;
    canEdit: boolean;
    onRevenueScoreChange: (score: number) => void;
    onResolved: () => void;
}) {
    const { isEligible, ruleSummary, ineligibilityReason, suggestedAction, foundationRangeHint, actions } = detail;
    const scoreEligible = revenueScore > 0;
    const [revenueInput, setRevenueInput] = useState("");
    const [revenueSaving, setRevenueSaving] = useState(false);

    useEffect(() => {
        setRevenueInput(revenue > 0 ? String(revenue) : "");
    }, [revenue]);

    async function handleSaveRevenue() {
        const parsed = Number(String(revenueInput).replace(/,/g, ""));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            toast.error("Enter a valid annual revenue greater than zero");
            return;
        }
        setRevenueSaving(true);
        const res = await updateA2fVerifiedRevenue(a2fId, parsed);
        setRevenueSaving(false);
        if (res.success) {
            toast.success(res.message ?? "Revenue updated");
            onResolved();
        } else {
            toast.error(res.error ?? "Failed to update revenue");
        }
    }

    return (
        <Card className={scoreEligible ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/50 dark:bg-red-950/20"}>
            <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-semibold">{formatTrack(track)}</p>
                        {canEdit ? (
                            <div className="space-y-1.5">
                                <Label htmlFor="verified-revenue-gate" className="text-xs text-muted-foreground">
                                    Annual revenue (KES)
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    <Input
                                        id="verified-revenue-gate"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={revenueInput}
                                        onChange={e => setRevenueInput(e.target.value)}
                                        placeholder="e.g. 2500000"
                                        className="max-w-[200px] h-8 text-sm"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSaveRevenue}
                                        disabled={revenueSaving}
                                    >
                                        {revenueSaving ? "Saving…" : "Save revenue"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {revenue > 0 ? `KES ${revenue.toLocaleString("en-KE")} annual revenue` : "Annual revenue not set"}
                            </p>
                        )}
                    </div>
                    {canEdit ? (
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <Label htmlFor="revenue-score-gate" className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                Revenue score
                            </Label>
                            <div className="flex items-center gap-1">
                                <Input
                                    id="revenue-score-gate"
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={revenueScore}
                                    onChange={e => onRevenueScoreChange(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                                    className="w-14 h-8 text-sm text-center font-bold"
                                />
                                <span className="text-xs text-muted-foreground">/10</span>
                            </div>
                        </div>
                    ) : (
                        <Badge className={scoreEligible ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                            Revenue {revenueScore}/10
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{ruleSummary}</p>

                {track !== "acceleration" && (
                    <FoundationRangeIndicator hint={foundationRangeHint} />
                )}

                {!isEligible && ineligibilityReason && (
                    <div className="rounded-lg border border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-red-900 dark:text-red-200">Why revenue score is 0</p>
                        <p className="text-xs text-red-800 dark:text-red-200/90">{ineligibilityReason}</p>
                        {suggestedAction && (
                            <p className="text-xs text-red-800/90 dark:text-red-200/80 pt-1 border-t border-red-200/80 dark:border-red-900/50">
                                <span className="font-medium">What you can do: </span>
                                {suggestedAction}
                            </p>
                        )}
                        {actions.length > 0 && (
                            <RevenueGateActions
                                a2fId={a2fId}
                                track={track}
                                annualRevenue={revenue}
                                actions={actions}
                                onResolved={onResolved}
                            />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function LiveScorePanel({
    a2fId,
    track,
    annualRevenue,
    scores,
    revenueDetail,
    onResolved,
}: {
    a2fId: number;
    track: A2fEnterpriseTrack | null;
    annualRevenue: number;
    scores: Record<string, number>;
    revenueDetail: RevenueGateUxDetail;
    onResolved: () => void;
}) {
    const sections = SCORING_SECTIONS;
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const maxTotal = MATCHING_GRANT_MAX_TOTAL;
    const pct = Math.round((total / maxTotal) * 100);
    const revenueScore = scores.currentAnnualRevenue ?? 0;
    const qualificationStatus = getMatchingGrantQualification(total, revenueScore);
    const statusLabel = qualificationStatus;
    const revenueGateBlocks =
        qualificationStatus === "Ineligible - Revenue" &&
        total >= MATCHING_GRANT_QUALIFYING_SCORE;

    return (
        <div className="sticky top-24 space-y-4">
            <Card className={`border-2 ${scoreBg(pct)}`}>
                <CardContent className="pt-6 pb-5 flex flex-col items-center text-center gap-2">
                    <div>
                        <p className={`text-4xl font-black ${scoreColor(pct)}`}>{total}</p>
                        <p className="text-xs text-muted-foreground font-medium">/{maxTotal} points</p>
                    </div>
                    <Badge className={matchingStatusClasses(qualificationStatus)}>
                        {statusLabel}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                        Qualifying threshold: {MATCHING_GRANT_QUALIFYING_SCORE}/{MATCHING_GRANT_MAX_TOTAL} and revenue score &gt; 0
                    </p>
                    {revenueGateBlocks && (
                        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-md px-2 py-1.5 text-left w-full">
                            Total score meets the {MATCHING_GRANT_QUALIFYING_SCORE}-point threshold, but the revenue gate blocks qualification.
                        </p>
                    )}
                    {qualificationStatus === "Ineligible - Revenue" && revenueDetail.ineligibilityReason && (
                        <p className="text-xs text-red-800 dark:text-red-200/90 text-left w-full line-clamp-3" title={revenueDetail.ineligibilityReason}>
                            {revenueDetail.ineligibilityReason}
                        </p>
                    )}
                    {qualificationStatus === "Ineligible - Revenue" && revenueDetail.actions.length > 0 && (
                        <RevenueGateActions
                            a2fId={a2fId}
                            track={track}
                            annualRevenue={annualRevenue}
                            actions={revenueDetail.actions}
                            compact
                            onResolved={onResolved}
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {sections.map(sec => {
                        const earned = sec.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
                        const max = sec.criteria.reduce((s, c) => s + c.max, 0);
                        const sectionPct = max > 0 ? Math.round((earned / max) * 100) : 0;
                        return (
                            <div key={sec.title} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`size-2 rounded-full ${COLOR_MAP[sec.color]}`} />
                                        <span className="text-muted-foreground">{sec.title}</span>
                                    </div>
                                    <span className="font-semibold">{earned}/{max}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-300 ${COLOR_MAP[sec.color]}`} style={{ width: `${sectionPct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Scoring Guide</p>
                <p>60+ and revenue score &gt; 0: qualifies for GAIR.</p>
                <p>Below 60: refer for further TA support.</p>
                <p>Revenue score 0: ineligible regardless of total.</p>
            </div>
        </div>
    );
}

function PreviousScoresCard({
    a2fId,
    track,
    annualRevenue,
    breakdown,
    revenueDetail,
    onResolved,
}: {
    a2fId: number;
    track: A2fEnterpriseTrack | null;
    annualRevenue: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    breakdown: any;
    revenueDetail: RevenueGateUxDetail;
    onResolved: () => void;
}) {
    if (!breakdown) return null;

    const pct = breakdown.percentage;
    const showRevenueIneligible = breakdown.qualificationStatus === "Ineligible - Revenue";

    return (
        <Card className="border-dashed">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardText weight="duotone" className="size-4 text-muted-foreground" />
                        Previous Score on Record
                    </CardTitle>
                    <Badge className={matchingStatusClasses(breakdown.qualificationStatus)}>
                        {breakdown.totalScore}/{breakdown.maxTotal} pts ({pct}%)
                    </Badge>
                </div>
                {breakdown.qualificationStatus && (
                    <CardDescription className="text-xs">
                        Status: {breakdown.qualificationStatus}
                    </CardDescription>
                )}
                {showRevenueIneligible && revenueDetail.ineligibilityReason && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/50 p-2 space-y-1">
                        <p className="text-xs text-red-800 dark:text-red-200/90">{revenueDetail.ineligibilityReason}</p>
                        {revenueDetail.suggestedAction && (
                            <p className="text-[11px] text-red-800/90 dark:text-red-200/80">
                                <span className="font-medium">What you can do: </span>
                                {revenueDetail.suggestedAction}
                            </p>
                        )}
                        <RevenueGateActions
                            a2fId={a2fId}
                            track={track}
                            annualRevenue={annualRevenue}
                            actions={revenueDetail.actions}
                            compact
                            onResolved={onResolved}
                        />
                    </div>
                )}
                {breakdown.scorerNotes && (
                    <CardDescription className="text-xs mt-1 italic">
                        &ldquo;{breakdown.scorerNotes}&rdquo;
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                {breakdown.categories?.map((cat: { category: string; earned: number; max: number; percentage: number }) => (
                    <div key={cat.category} className="flex items-center gap-2 text-xs">
                        <span className="w-44 shrink-0 text-muted-foreground truncate">{cat.category}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${cat.percentage}%` }} />
                        </div>
                        <span className="w-12 text-right font-medium shrink-0">{cat.earned}/{cat.max}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function ScoringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);
    const { data: session } = useSession();
    const canEdit = canWriteA2fStaff(session?.user?.role);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [previousBreakdown, setPreviousBreakdown] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [matchingScores, setMatchingScores] = useState<MatchingGrantScores>({ ...DEFAULT_MATCHING });
    const [scorerNotes, setScorerNotes] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        const [entryRes, breakdownRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getA2fScoringBreakdown(a2fId),
        ]);

        const loadedEntry = entryRes.success && entryRes.data ? entryRes.data : null;
        if (loadedEntry) {
            setEntry(loadedEntry);
        }

        if (breakdownRes.success && breakdownRes.data) {
            const existing = breakdownRes.data;
            setPreviousBreakdown(existing);
            if (existing.rawScores) {
                setMatchingScores({ ...DEFAULT_MATCHING, ...(existing.rawScores as MatchingGrantScores) });
            }
            if (existing.scorerNotes) setScorerNotes(existing.scorerNotes);
        } else if (loadedEntry) {
            setMatchingScores(prev => {
                const hasEditedScores = Object.values(prev).some(v => v > 0);
                if (hasEditedScores) return prev;
                const track = normalizeTrack(loadedEntry.application?.track);
                const revenue = Number(loadedEntry.application?.business?.revenueLastYear ?? 0);
                return {
                    ...DEFAULT_MATCHING,
                    currentAnnualRevenue: getMatchingGrantRevenueScore(track, revenue),
                };
            });
        }

        setLoading(false);
    }, [a2fId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadData(); }, [loadData]);

    const sections = SCORING_SECTIONS;
    const biz = entry?.application?.business;
    const enterpriseTrack = normalizeTrack(entry?.application?.track);
    const annualRevenue = Number(biz?.revenueLastYear ?? 0);
    const revenueDetail = useMemo(
        () => getRevenueGateUxDetail(enterpriseTrack, annualRevenue),
        [enterpriseTrack, annualRevenue]
    );

    const currentScoresRecord = useMemo(
        () => ({ ...(matchingScores as unknown as Record<string, number>) }),
        [matchingScores]
    );

    function handleScoreChange(key: string, val: number) {
        setMatchingScores(prev => ({ ...prev, [key]: val }));
        setSubmitted(false);
    }

    function handleRevenueScoreChange(score: number) {
        handleScoreChange("currentAnnualRevenue", score);
    }

    async function handleSubmit() {
        setSubmitting(true);

        const payload = {
            instrumentType: "matching_grant" as const,
            scores: matchingScores,
        };

        const res = await action_calculateA2FScore(a2fId, payload, scorerNotes || undefined);
        setSubmitting(false);

        if (res.success) {
            toast.success(res.message ?? "Score saved successfully");
            setSubmitted(true);
            loadData();
        } else {
            toast.error(res.error ?? "Failed to save score");
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-56" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-64" />
                        <Skeleton className="h-48" />
                    </div>
                </div>
            </div>
        );
    }

    if (!entry) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <p className="text-muted-foreground">Pipeline entry not found.</p>
                <Button variant="outline" asChild className="mt-4">
                    <Link href="/a2f">Back to Pipeline</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="pb-24 space-y-6">
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ChartLine weight="duotone" className="size-5 text-violet-600" />
                    Pre-IC Scoring
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    {biz?.name} · 100-point Matching Grant rubric with revenue hard gate
                </p>
            </div>

            {submitted && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
                    <CheckCircle weight="fill" className="size-5 text-emerald-600 shrink-0" />
                    <div>
                        <p className="font-semibold text-emerald-900 text-sm">Score Saved Successfully</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            Qualified Matching Grant cases advance to IC Appraisal Review. Non-qualified cases remain available for review and TA referral.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <PreviousScoresCard
                        a2fId={a2fId}
                        track={enterpriseTrack}
                        annualRevenue={annualRevenue}
                        breakdown={previousBreakdown}
                        revenueDetail={revenueDetail}
                        onResolved={loadData}
                    />

                    <RevenueGateCard
                        a2fId={a2fId}
                        track={enterpriseTrack}
                        revenue={annualRevenue}
                        revenueScore={matchingScores.currentAnnualRevenue}
                        detail={revenueDetail}
                        canEdit={canEdit}
                        onRevenueScoreChange={handleRevenueScoreChange}
                        onResolved={loadData}
                    />

                    {sections.map(section => (
                        <ScoringSection
                            key={section.title}
                            section={section}
                            scores={currentScoresRecord}
                            onChange={handleScoreChange}
                            revenueIneligibilityHint={revenueDetail.ineligibilityReason}
                            readOnly={!canEdit}
                        />
                    ))}

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Warning weight="duotone" className="size-4 text-amber-500" />
                                Reviewer Evidence Notes
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Document score rationale, missing evidence, and any TA referral considerations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                rows={4}
                                placeholder="Summarize evidence reviewed, gaps, and scoring rationale..."
                                value={scorerNotes}
                                onChange={e => setScorerNotes(e.target.value)}
                                className="resize-none text-sm"
                                disabled={!canEdit}
                            />
                        </CardContent>
                    </Card>

                </div>

                <div className="lg:col-span-1">
                    <LiveScorePanel
                        a2fId={a2fId}
                        track={enterpriseTrack}
                        annualRevenue={annualRevenue}
                        scores={currentScoresRecord}
                        revenueDetail={revenueDetail}
                        onResolved={loadData}
                    />
                    <div className="sticky bottom-4 mt-4 rounded-xl border bg-background p-4 shadow-lg lg:hidden">
                        <Button onClick={handleSubmit} disabled={submitting || !canEdit} className="w-full bg-violet-700 hover:bg-violet-800 gap-2">
                            <Calculator className="size-4" />
                            {submitting ? "Saving Score..." : "Save & Submit Score"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur">
                <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
                    <p className="text-xs text-muted-foreground flex-1">
                        Submitting applies the 60-point threshold and revenue hard gate.
                    </p>
                    <Button onClick={handleSubmit} disabled={submitting || !canEdit} className="bg-violet-700 hover:bg-violet-800 gap-2 shrink-0">
                        <Calculator className="size-4" />
                        {submitting ? "Saving Score..." : "Save & Submit Score"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
