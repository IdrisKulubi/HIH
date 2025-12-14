"use client";

import { cn } from "@/lib/utils";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, WarningCircle } from "@phosphor-icons/react";

interface ScoreDisplayProps {
    totalScore: number | null;
    isEligible: boolean;
    scoreBreakdown?: {
        commercial: number;
        businessModel: number;
        market: number;
        impact: number;
    };
    compact?: boolean;
}

export function ScoreDisplay({
    totalScore,
    isEligible,
    scoreBreakdown,
    compact = false,
}: ScoreDisplayProps) {
    if (totalScore === null) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                Not Scored
            </span>
        );
    }

    // Apple-style color thresholds
    const numericScore = Number(totalScore);
    let colorClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50";
    let icon = <XCircle weight="fill" className="w-4 h-4 mr-1.5 text-red-500" />;

    if (numericScore >= 70) {
        colorClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50";
        icon = <CheckCircle weight="fill" className="w-4 h-4 mr-1.5 text-green-500" />;
    } else if (numericScore >= 50) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50";
        icon = <WarningCircle weight="fill" className="w-4 h-4 mr-1.5 text-amber-500" />;
    }

    const Badge = (
        <div
            className={cn(
                "inline-flex items-center justify-between border rounded-full transition-all duration-200 cursor-default select-none",
                compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
                colorClass
            )}
        >
            <div className="flex items-center">
                {icon}
                <span className="font-semibold">{numericScore.toFixed(0)}%</span>
            </div>
        </div>
    );

    if (!scoreBreakdown) {
        return Badge;
    }

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>{Badge}</HoverCardTrigger>
            <HoverCardContent className="w-80 p-4 rounded-2xl shadow-xl border-border/60 bg-background/95 backdrop-blur-xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <h4 className="text-sm font-semibold tracking-tight">Score Breakdown</h4>
                        <span className={cn("text-xs font-mono font-medium px-2 py-0.5 rounded-md", colorClass)}>
                            Total: {numericScore}%
                        </span>
                    </div>

                    <div className="space-y-3">
                        <ScoreRow label="Commercial Viability" score={scoreBreakdown.commercial} max={20} />
                        <ScoreRow label="Market Potential" score={scoreBreakdown.market} max={30} />
                        <ScoreRow label="Social Impact" score={scoreBreakdown.impact} max={40} />
                        <ScoreRow label="Business Model" score={scoreBreakdown.businessModel} max={10} />
                    </div>

                    <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg mt-2">
                        {isEligible ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span>
                            {isEligible
                                ? "Eligible for next stage"
                                : "Does not meet eligibility criteria"}
                        </span>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
    const percentage = (score / max) * 100;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="font-mono text-foreground font-semibold">
                    {score}/{max}
                </span>
            </div>
            <Progress value={percentage} className="h-1.5 bg-muted/50" indicatorClassName={cn(
                percentage >= 80 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500"
            )} />
        </div>
    );
}
