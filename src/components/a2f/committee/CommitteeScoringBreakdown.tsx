"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CommitteeCaseDetail } from "@/lib/actions/a2f-committee";

export function CommitteeScoringBreakdown({
    scoring,
}: {
    scoring: NonNullable<CommitteeCaseDetail["scoring"]>;
}) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score summary</CardTitle>
                    <CardDescription>
                        Total {scoring.totalScore} — {scoring.qualificationStatus}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {scoring.scorerNotes && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm mb-4">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Reviewer notes</p>
                            <p className="whitespace-pre-wrap">{scoring.scorerNotes}</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        {scoring.categories.map((cat) => (
                            <div key={cat.category}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{cat.category}</span>
                                    <span className="text-muted-foreground">
                                        {cat.earned}/{cat.max}
                                    </span>
                                </div>
                                <Progress value={cat.percentage} className="h-2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Parameter breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        {scoring.parameterBreakdown.map((row) => (
                            <li key={row.parameter} className="flex justify-between gap-4">
                                <span className="text-muted-foreground">{row.parameter}</span>
                                <span className="font-medium shrink-0">
                                    {row.earned}/{row.max}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
