"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import type { CommitteeCaseDetail } from "@/lib/actions/a2f-committee";

export function CommitteeScoringBreakdown({
    scoring,
}: {
    scoring: NonNullable<CommitteeCaseDetail["scoring"]>;
}) {
    return (
        <div className="space-y-4">
            <Card className="border-brand-blue/15">
                <CardHeader className="pb-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <CardTitle className="text-base">Score summary</CardTitle>
                            <CardDescription>{scoring.qualificationStatus}</CardDescription>
                        </div>
                        <p className="text-3xl font-bold tabular-nums text-brand-blue-dark">
                            {scoring.totalScore}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                total
                            </span>
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    {scoring.scorerNotes && (
                        <div className="rounded-lg bg-muted/50 p-3 text-sm mb-4">
                            <p className="font-medium text-xs text-muted-foreground mb-1">
                                Reviewer notes
                            </p>
                            <p className="whitespace-pre-wrap">{scoring.scorerNotes}</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        {scoring.categories.map((cat) => (
                            <div key={cat.category}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{cat.category}</span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {cat.earned}/{cat.max}
                                    </span>
                                </div>
                                <Progress value={cat.percentage} className="h-2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {scoring.parameterBreakdown.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Parameter breakdown</CardTitle>
                        <CardDescription>Individual scoring parameters</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="parameters" className="border-none">
                                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                                    Show {scoring.parameterBreakdown.length} parameters
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 text-sm pt-1">
                                        {scoring.parameterBreakdown.map((row) => (
                                            <li
                                                key={row.parameter}
                                                className="flex justify-between gap-4 border-b border-dashed pb-2 last:border-0"
                                            >
                                                <span className="text-muted-foreground">
                                                    {row.parameter}
                                                </span>
                                                <span className="font-medium shrink-0 tabular-nums">
                                                    {row.earned}/{row.max}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
