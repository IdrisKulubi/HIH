"use client";

import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
    getCommitteeCaseDetail,
    type CommitteeCaseDetail,
} from "@/lib/actions/a2f-committee";
import { CommitteeScoringBreakdown } from "@/components/a2f/committee/CommitteeScoringBreakdown";
import { CommitteeDecisionPanel } from "@/components/a2f/committee/CommitteeDecisionPanel";
import { CommitteeScoreOverridePanel } from "@/components/a2f/committee/CommitteeScoreOverridePanel";
import { CommitteeGairViewer } from "@/components/a2f/committee/CommitteeGairViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, FileText, Warning } from "@phosphor-icons/react";
import { IcDecisionBadge, PipelineStageBadge, RevenueGateBadge } from "@/components/a2f/PipelineBadges";

function EnterpriseFacts({
    pipeline,
}: {
    pipeline: CommitteeCaseDetail["pipeline"];
}) {
    const facts: { label: string; value: ReactNode }[] = [
        { label: "Applicant", value: pipeline.applicantName },
        { label: "Email", value: pipeline.applicantEmail },
        {
            label: "Stage",
            value: <PipelineStageBadge status={pipeline.status} />,
        },
        { label: "Track", value: <span className="capitalize">{pipeline.track ?? "—"}</span> },
        {
            label: "Revenue gate",
            value: <RevenueGateBadge eligible={pipeline.revenueEligible} />,
        },
        {
            label: "Annual revenue",
            value: `KES ${pipeline.annualRevenue.toLocaleString("en-KE")}`,
        },
    ];
    if (pipeline.county) facts.push({ label: "County", value: pipeline.county });
    if (pipeline.sector) facts.push({ label: "Sector", value: pipeline.sector });

    return (
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {facts.map(({ label, value }) => (
                <div key={label} className="rounded-lg border bg-card px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {label}
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function CommitteeCasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const a2fId = Number(id);
    const [detail, setDetail] = useState<CommitteeCaseDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getCommitteeCaseDetail(a2fId);
        if (res.success && res.data) setDetail(res.data);
        else toast.error(res.error ?? "Failed to load case");
        setLoading(false);
    }, [a2fId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-96" />
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                        <Skeleton className="h-40 rounded-xl" />
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-48 rounded-xl" />
                    </div>
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <p className="text-muted-foreground">Case not found.</p>
                <Button variant="link" asChild className="px-0 mt-2">
                    <Link href="/a2f/committee">Back to cases</Link>
                </Button>
            </div>
        );
    }

    const { pipeline, scoring, gair } = detail;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
            <div className="space-y-3">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-brand-blue hover:text-brand-blue-dark">
                    <Link href="/a2f/committee">
                        <ArrowLeft className="size-4" /> All cases
                    </Link>
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{pipeline.businessName}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Application #{pipeline.applicationId}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PipelineStageBadge status={pipeline.status} />
                        {gair && <IcDecisionBadge decision={gair.icDecision} />}
                    </div>
                </div>
            </div>

            {!gair && (
                <div
                    className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 flex gap-3 text-sm text-slate-800"
                    role="status"
                >
                    <Warning className="size-5 shrink-0 text-brand-blue mt-0.5" weight="duotone" />
                    <p>
                        No GAIR has been prepared yet. The Access to Finance Officer must complete the
                        investment appraisal before you can record a committee decision.
                    </p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="space-y-6 min-w-0">
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                            Enterprise
                        </h2>
                        <EnterpriseFacts pipeline={pipeline} />
                    </section>

                    {gair?.scoringSummary && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="size-4 text-brand-blue" />
                                    Scoring summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                    {gair.scoringSummary}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {gair && <CommitteeGairViewer a2fId={a2fId} />}

                    {scoring ? (
                        <div className="space-y-4">
                            <CommitteeScoringBreakdown scoring={scoring} />
                            <CommitteeScoreOverridePanel
                                a2fId={a2fId}
                                currentScores={scoring.rawScores}
                                onOverride={load}
                            />
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-6 text-sm text-muted-foreground">
                                No scoring recorded yet. The officer or reviewer must complete scoring
                                before committee review.
                            </CardContent>
                        </Card>
                    )}
                </div>

                <aside className="lg:sticky lg:top-20 space-y-4">
                    {gair ? (
                        <CommitteeDecisionPanel
                            appraisalId={gair.id}
                            a2fId={a2fId}
                            initialDecision={gair.icDecision}
                            initialApprovedAmount={gair.approvedGrantAmount ?? undefined}
                            initialNotes={gair.decisionNotes ?? undefined}
                            initialConditions={gair.decisionConditions ?? undefined}
                            onRecorded={load}
                        />
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="py-6 text-sm text-muted-foreground">
                                Committee decision will be available once the GAIR is prepared.
                            </CardContent>
                        </Card>
                    )}
                </aside>
            </div>
        </div>
    );
}
