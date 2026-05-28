"use client";

import { use, useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, FileText, Buildings } from "@phosphor-icons/react";
import { PIPELINE_STAGE_LABELS, type A2fPipelineStatus } from "@/lib/a2f-constants";

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
            <div className="container mx-auto px-4 py-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-muted-foreground">Case not found.</p>
                <Button variant="link" asChild className="px-0 mt-2">
                    <Link href="/a2f/committee">Back to cases</Link>
                </Button>
            </div>
        );
    }

    const { pipeline, scoring, gair } = detail;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href="/a2f/committee">
                        <ArrowLeft className="size-4" /> All cases
                    </Link>
                </Button>
                <Badge className="gap-1.5">
                    <Buildings className="size-3" />
                    {pipeline.businessName}
                </Badge>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{pipeline.businessName}</CardTitle>
                    <CardDescription>
                        {pipeline.applicantName} · {pipeline.applicantEmail}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                        <span className="text-muted-foreground">Stage: </span>
                        {PIPELINE_STAGE_LABELS[pipeline.status as A2fPipelineStatus] ?? pipeline.status}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Track: </span>
                        <span className="capitalize">{pipeline.track ?? "—"}</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Revenue gate: </span>
                        {pipeline.revenueEligible ? "Eligible" : "Ineligible"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Annual revenue: </span>
                        KES {pipeline.annualRevenue.toLocaleString("en-KE")}
                    </p>
                    {pipeline.county && (
                        <p>
                            <span className="text-muted-foreground">County: </span>
                            {pipeline.county}
                        </p>
                    )}
                    {pipeline.sector && (
                        <p>
                            <span className="text-muted-foreground">Sector: </span>
                            {pipeline.sector}
                        </p>
                    )}
                </CardContent>
            </Card>

            {gair && (
                <div className="mb-6 space-y-4">
                    {gair.scoringSummary && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="size-4" />
                                    Scoring summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                    {gair.scoringSummary}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                    <CommitteeGairViewer a2fId={a2fId} />
                </div>
            )}

            {!gair && (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                    <CardContent className="py-4 text-sm text-amber-900">
                        No GAIR has been prepared yet. The A2F Officer must prepare the GAIR before committee decision.
                    </CardContent>
                </Card>
            )}

            {scoring ? (
                <div className="mb-6">
                    <CommitteeScoringBreakdown scoring={scoring} />
                    <CommitteeScoreOverridePanel
                        a2fId={a2fId}
                        currentScores={scoring.rawScores}
                        onOverride={load}
                    />
                </div>
            ) : (
                <Card className="mb-6">
                    <CardContent className="py-6 text-sm text-muted-foreground">
                        No scoring recorded yet.
                    </CardContent>
                </Card>
            )}

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
            ) : null}
        </div>
    );
}
