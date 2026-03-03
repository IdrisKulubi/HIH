"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import { action_calculateA2FScore, getA2fScoringBreakdown } from "@/lib/actions/a2f-scoring";
import {
    REPAYABLE_MAX_SCORES,
    MATCHING_MAX_SCORES,
    type RepayableGrantScores,
    type MatchingGrantScores,
} from "@/lib/a2f-constants";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft, ChartLine, CheckCircle, Star, Warning,
    Trophy, Calculator, ClipboardText, Buildings,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// REPAYABLE GRANT — criterion config
// ─────────────────────────────────────────────────────────────────────────────

interface CriterionConfig {
    key: string;
    label: string;
    description: string;
    max: number;
    guidance: string;
}

const REPAYABLE_SECTIONS: Array<{ title: string; color: string; criteria: CriterionConfig[] }> = [
    {
        title: "Repayment Capacity",
        color: "violet",
        criteria: [
            {
                key: "revenueCashFlow",
                label: "Revenue & Cash Flow Quality",
                description: "Stability and growth trend of revenue streams",
                max: REPAYABLE_MAX_SCORES.revenueCashFlow,
                guidance: "Consider 3-year revenue trend, cash flow consistency, seasonal patterns.",
            },
            {
                key: "debtServiceCoverage",
                label: "Debt Service Coverage Ratio",
                description: "Ability to service new debt (DSCR > 1.2x recommended)",
                max: REPAYABLE_MAX_SCORES.debtServiceCoverage,
                guidance: "DSCR ≥ 1.5x → 9-10pts | 1.2x–1.5x → 6-8pts | <1.2x → 0-5pts",
            },
            {
                key: "collateralSecurity",
                label: "Collateral & Security",
                description: "Quality and coverage of assets pledged as security",
                max: REPAYABLE_MAX_SCORES.collateralSecurity,
                guidance: "Full collateral coverage → 9-10pts | Partial → 5-8pts | None → 0-4pts",
            },
        ],
    },
    {
        title: "Market & Scalability Strength",
        color: "blue",
        criteria: [
            {
                key: "marketScalabilityStrength",
                label: "Market Position & Scalability",
                description: "Market share, competitive advantage, and growth potential",
                max: REPAYABLE_MAX_SCORES.marketScalabilityStrength,
                guidance: "Assess TAM, competitive moat, B2B vs B2C model strength, regional expansion readiness.",
            },
        ],
    },
    {
        title: "Impact & Inclusion Potential",
        color: "emerald",
        criteria: [
            {
                key: "impactInclusion",
                label: "Social Impact & Financial Inclusion",
                description: "ESG performance, job creation, and inclusion of marginalized groups",
                max: REPAYABLE_MAX_SCORES.impactInclusion,
                guidance: "Women/youth-led → +5 bonus eligible. Score on measurable impact metrics provided.",
            },
        ],
    },
    {
        title: "Investment Plan & Safeguards",
        color: "amber",
        criteria: [
            {
                key: "investmentPlanSafeguards",
                label: "Use of Funds & Risk Safeguards",
                description: "Clarity of investment plan and risk mitigation measures",
                max: REPAYABLE_MAX_SCORES.investmentPlanSafeguards,
                guidance: "Clear fund utilization plan, insurance, contingency arrangements.",
            },
        ],
    },
    {
        title: "Bonus Points",
        color: "rose",
        criteria: [
            {
                key: "bonusPoints",
                label: "Bonus: Special Criteria",
                description: "Climate-smart practices, women/youth ownership, cross-border trade",
                max: REPAYABLE_MAX_SCORES.bonusPoints,
                guidance: "Awarded for exceptional impact, climate alignment, or export potential.",
            },
        ],
    },
];

const MATCHING_SECTIONS: Array<{ title: string; color: string; criteria: CriterionConfig[] }> = [
    {
        title: "Financial Readiness & Co-Investment",
        color: "violet",
        criteria: [
            {
                key: "ownContributionPct",
                label: "Own Contribution Percentage",
                description: "Level of enterprise's own financial co-investment",
                max: MATCHING_MAX_SCORES.ownContributionPct,
                guidance: "≥50% own contribution → 13-15pts | 30-50% → 8-12pts | <30% → 0-7pts",
            },
            {
                key: "financialManagementCapacity",
                label: "Financial Management Capacity",
                description: "Quality of financial records, accounting systems, and controls",
                max: MATCHING_MAX_SCORES.financialManagementCapacity,
                guidance: "Audited accounts + ERP → 13-15pts | Basic bookkeeping → 5-9pts | None → 0-4pts",
            },
        ],
    },
    {
        title: "Market & Scalability Potential",
        color: "blue",
        criteria: [
            {
                key: "marketScalabilityPotential",
                label: "Market Access & Scalability",
                description: "Existing market demand, distribution channels, and scale-up plan",
                max: MATCHING_MAX_SCORES.marketScalabilityPotential,
                guidance: "Proven B2B contracts → higher scores. Assess geographic expansion readiness.",
            },
        ],
    },
    {
        title: "Impact & Inclusion Potential",
        color: "emerald",
        criteria: [
            {
                key: "impactInclusion",
                label: "Social Impact & Inclusion",
                description: "Jobs created, women/youth empowerment, rural market access",
                max: MATCHING_MAX_SCORES.impactInclusion,
                guidance: "Quantitative impact targets required. Verify baseline data from DD report.",
            },
        ],
    },
    {
        title: "Investment Plan & Leverage",
        color: "amber",
        criteria: [
            {
                key: "investmentLeverage",
                label: "Investment Leverage Potential",
                description: "Ability to attract additional co-financing beyond HiH contribution",
                max: MATCHING_MAX_SCORES.investmentLeverage,
                guidance: "Evidence of bank lines, DFI interest, or grant co-funding unlocks higher scores.",
            },
        ],
    },
    {
        title: "Bonus Points",
        color: "rose",
        criteria: [
            {
                key: "bonusPoints",
                label: "Bonus: Special Criteria",
                description: "Climate-smart value chains, export potential, disability inclusion",
                max: MATCHING_MAX_SCORES.bonusPoints,
                guidance: "Awarded for measurable climate or social additionality beyond baseline.",
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
    violet:  "bg-violet-500",
    blue:    "bg-blue-500",
    emerald: "bg-emerald-500",
    amber:   "bg-amber-500",
    rose:    "bg-rose-500",
};

const RING_MAP: Record<string, string> = {
    violet:  "ring-violet-200",
    blue:    "ring-blue-200",
    emerald: "ring-emerald-200",
    amber:   "ring-amber-200",
    rose:    "ring-rose-200",
};

const BADGE_MAP: Record<string, string> = {
    violet:  "bg-violet-100 text-violet-700 border-violet-200",
    blue:    "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber:   "bg-amber-100 text-amber-700 border-amber-200",
    rose:    "bg-rose-100 text-rose-700 border-rose-200",
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

function scoreBar(pct: number) {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
}

function getRecommendation(pct: number): { label: string; color: string; icon: React.ElementType } {
    if (pct >= 80) return { label: "Strong Recommend", color: "text-emerald-700", icon: Trophy };
    if (pct >= 70) return { label: "Recommend",        color: "text-emerald-600", icon: CheckCircle };
    if (pct >= 55) return { label: "Conditional",      color: "text-amber-700",   icon: Warning };
    return          { label: "Do Not Recommend",        color: "text-red-700",     icon: Warning };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITERION SLIDER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function CriterionSlider({
    config,
    value,
    onChange,
    barColor,
}: {
    config: CriterionConfig;
    value: number;
    onChange: (val: number) => void;
    barColor: string;
}) {
    const pct = config.max > 0 ? Math.round((value / config.max) * 100) : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                    <input
                        type="number"
                        min={0}
                        max={config.max}
                        value={value}
                        onChange={e => {
                            const v = Math.min(config.max, Math.max(0, Number(e.target.value)));
                            onChange(v);
                        }}
                        className="w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">/{config.max}</span>
                </div>
            </div>

            {/* Slider track */}
            <div className="relative">
                <input
                    type="range"
                    min={0}
                    max={config.max}
                    step={1}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm"
                    style={{ accentColor: "currentColor" }}
                />
            </div>

            {/* Fill bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Guidance hint */}
            <p className="text-[11px] text-muted-foreground italic leading-tight">{config.guidance}</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function ScoringSection({
    section,
    scores,
    onChange,
}: {
    section: typeof REPAYABLE_SECTIONS[number];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (key: string, val: number) => void;
}) {
    const sectionTotal = section.criteria.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
    const sectionMax   = section.criteria.reduce((sum, c) => sum + c.max, 0);
    const sectionPct   = sectionMax > 0 ? Math.round((sectionTotal / sectionMax) * 100) : 0;

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
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE SCORE PANEL
// ─────────────────────────────────────────────────────────────────────────────

function LiveScorePanel({
    instrumentType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores,
}: {
    instrumentType: "repayable_grant" | "matching_grant";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores: any;
}) {
    const sections = instrumentType === "repayable_grant" ? REPAYABLE_SECTIONS : MATCHING_SECTIONS;

    const total    = Object.values(scores as Record<string, number>).reduce((a, b) => a + b, 0);
    const maxTotal = 110;
    const pct      = Math.round((total / maxTotal) * 100);
    const rec      = getRecommendation(pct);
    const RecIcon  = rec.icon;

    return (
        <div className="sticky top-24 space-y-4">
            {/* Score ring */}
            <Card className={`border-2 ${scoreBg(pct)}`}>
                <CardContent className="pt-6 pb-5 flex flex-col items-center text-center gap-2">
                    <div className="relative size-28">
                        <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                            <circle
                                cx="60" cy="60" r="50"
                                fill="none" stroke="#e5e7eb" strokeWidth="12"
                            />
                            <circle
                                cx="60" cy="60" r="50"
                                fill="none"
                                stroke={pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 50}`}
                                strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                                className="transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-black ${scoreColor(pct)}`}>{total}</span>
                            <span className="text-xs text-muted-foreground font-medium">/{maxTotal}</span>
                        </div>
                    </div>

                    <div>
                        <p className={`text-lg font-bold ${scoreColor(pct)}`}>{pct}%</p>
                        <div className={`flex items-center justify-center gap-1.5 mt-0.5 ${rec.color}`}>
                            <RecIcon weight="fill" className="size-4" />
                            <span className="text-sm font-semibold">{rec.label}</span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Passing threshold: 70% (77/110 pts)
                    </p>
                </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {sections.map(sec => {
                        const earned = sec.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
                        const max    = sec.criteria.reduce((s, c) => s + c.max, 0);
                        const p      = max > 0 ? Math.round((earned / max) * 100) : 0;
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
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${COLOR_MAP[sec.color]}`}
                                        style={{ width: `${p}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Tip */}
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Scoring Guide</p>
                <p>≥80% → Strong Recommend</p>
                <p>70–79% → Recommend (Pass)</p>
                <p>55–69% → Conditional Review</p>
                <p>&lt;55% → Do Not Recommend</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIOUS SCORES HISTORY
// ─────────────────────────────────────────────────────────────────────────────

function PreviousScoresCard({
    breakdown,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    breakdown: any;
}) {
    if (!breakdown) return null;

    const pct = breakdown.percentage;

    return (
        <Card className="border-dashed">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardText weight="duotone" className="size-4 text-muted-foreground" />
                        Previous Score on Record
                    </CardTitle>
                    <Badge className={
                        pct >= 70 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        pct >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-red-100 text-red-700 border-red-200"
                    }>
                        {breakdown.totalScore}/{breakdown.maxTotal} pts ({pct}%)
                    </Badge>
                </div>
                {breakdown.scorerNotes && (
                    <CardDescription className="text-xs mt-1 italic">
                        &ldquo;{breakdown.scorerNotes}&rdquo;
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                {breakdown.categories?.map((cat: {
                    category: string;
                    earned: number;
                    max: number;
                    percentage: number;
                }) => (
                    <div key={cat.category} className="flex items-center gap-2 text-xs">
                        <span className="w-44 shrink-0 text-muted-foreground truncate">{cat.category}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full ${scoreBar(cat.percentage)}`}
                                style={{ width: `${cat.percentage}%` }}
                            />
                        </div>
                        <span className="w-12 text-right font-medium shrink-0">{cat.earned}/{cat.max}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_REPAYABLE: RepayableGrantScores = {
    revenueCashFlow: 0,
    debtServiceCoverage: 0,
    collateralSecurity: 0,
    marketScalabilityStrength: 0,
    impactInclusion: 0,
    investmentPlanSafeguards: 0,
    bonusPoints: 0,
};

const DEFAULT_MATCHING: MatchingGrantScores = {
    ownContributionPct: 0,
    financialManagementCapacity: 0,
    marketScalabilityPotential: 0,
    impactInclusion: 0,
    investmentLeverage: 0,
    bonusPoints: 0,
};

export default function ScoringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [previousBreakdown, setPreviousBreakdown] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [repayableScores, setRepayableScores] = useState<RepayableGrantScores>({ ...DEFAULT_REPAYABLE });
    const [matchingScores, setMatchingScores]   = useState<MatchingGrantScores>({ ...DEFAULT_MATCHING });
    const [scorerNotes, setScorerNotes] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        const [entryRes, breakdownRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getA2fScoringBreakdown(a2fId),
        ]);

        if (entryRes.success && entryRes.data) {
            setEntry(entryRes.data);
        }

        if (breakdownRes.success && breakdownRes.data) {
            setPreviousBreakdown(breakdownRes.data);
            // Pre-fill form with existing raw scores
            const existing = breakdownRes.data;
            if (existing.instrumentType === "repayable_grant" && existing.rawScores) {
                setRepayableScores({ ...DEFAULT_REPAYABLE, ...(existing.rawScores as RepayableGrantScores) });
            } else if (existing.instrumentType === "matching_grant" && existing.rawScores) {
                setMatchingScores({ ...DEFAULT_MATCHING, ...(existing.rawScores as MatchingGrantScores) });
            }
            if (existing.scorerNotes) setScorerNotes(existing.scorerNotes);
        }

        setLoading(false);
    }, [a2fId]);

    useEffect(() => { loadData(); }, [loadData]);

    const instrumentType = entry?.instrumentType as "repayable_grant" | "matching_grant" | undefined;
    const sections       = instrumentType === "repayable_grant" ? REPAYABLE_SECTIONS : MATCHING_SECTIONS;
    const currentScores  = instrumentType === "repayable_grant" ? repayableScores : matchingScores;

    function handleScoreChange(key: string, val: number) {
        if (instrumentType === "repayable_grant") {
            setRepayableScores(prev => ({ ...prev, [key]: val }));
        } else {
            setMatchingScores(prev => ({ ...prev, [key]: val }));
        }
        setSubmitted(false);
    }

    async function handleSubmit() {
        if (!instrumentType) return;
        setSubmitting(true);

        const payload =
            instrumentType === "repayable_grant"
                ? { instrumentType: "repayable_grant" as const, scores: repayableScores }
                : { instrumentType: "matching_grant" as const, scores: matchingScores };

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
            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
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

    if (!entry || !instrumentType) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <p className="text-muted-foreground">Pipeline entry not found.</p>
                <Button variant="outline" asChild className="mt-4">
                    <Link href="/a2f">Back to Pipeline</Link>
                </Button>
            </div>
        );
    }

    const biz = entry.application?.business;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> Entry Overview
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ChartLine weight="duotone" className="size-5 text-violet-600 shrink-0" />
                    <h1 className="text-lg font-bold truncate">Pre-IC Scoring</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge className="gap-1.5 items-center">
                        <Buildings weight="fill" className="size-3" />
                        {biz?.name}
                    </Badge>
                    <Badge
                        className={
                            instrumentType === "matching_grant"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-purple-100 text-purple-700 border border-purple-200"
                        }
                    >
                        {instrumentType === "matching_grant" ? "Matching Grant" : "Repayable Grant"}
                    </Badge>
                </div>
            </div>

            {/* ── Submitted banner ── */}
            {submitted && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
                    <CheckCircle weight="fill" className="size-5 text-emerald-600 shrink-0" />
                    <div>
                        <p className="font-semibold text-emerald-900 text-sm">Score Saved Successfully</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            The pipeline has been advanced to IC Appraisal Review. You can continue editing and re-submit.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: Scoring form ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Previous scores */}
                    <PreviousScoresCard breakdown={previousBreakdown} />

                    {/* Scoring sections */}
                    {sections.map(section => (
                        <ScoringSection
                            key={section.title}
                            section={section}
                            scores={currentScores}
                            onChange={handleScoreChange}
                        />
                    ))}

                    {/* Scorer notes */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Star weight="duotone" className="size-4 text-amber-500" />
                                Scorer Notes & Narrative
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Provide a brief qualitative summary of your scoring rationale. This will be included in the IC Appraisal pack.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                rows={4}
                                placeholder="e.g. 'Strong repayment capacity indicated by stable revenue over 3 years. DSCR is 1.4x, slightly below ideal but mitigated by strong collateral. Market position is excellent with 4 B2B contracts in place...'"
                                value={scorerNotes}
                                onChange={e => setScorerNotes(e.target.value)}
                                className="resize-none text-sm"
                            />
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                            Submitting will advance the pipeline to{" "}
                            <span className="font-semibold">IC Appraisal Review</span> if not already there.
                        </p>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-violet-700 hover:bg-violet-800 gap-2"
                        >
                            <Calculator className="size-4" />
                            {submitting ? "Saving Score..." : "Save & Submit Score"}
                        </Button>
                    </div>
                </div>

                {/* ── RIGHT: Live score panel ── */}
                <div>
                    <LiveScorePanel
                        instrumentType={instrumentType}
                        scores={currentScores}
                    />
                </div>
            </div>
        </div>
    );
}

