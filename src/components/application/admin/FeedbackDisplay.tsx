"use client";

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
    CheckCircle,
    XCircle,
    WarningCircle,
    Prohibit,
    Question
} from "@phosphor-icons/react";

interface FeedbackDisplayProps {
    totalScore: number | null;
    isEligible: boolean;
    eligibilityFlags?: {
        ageEligible: boolean;
        registrationEligible: boolean;
        revenueEligible: boolean;
        businessPlanEligible: boolean;
        impactEligible: boolean;
    };
    compact?: boolean;
}

export function FeedbackDisplay({
    totalScore,
    isEligible,
    eligibilityFlags,
    compact = false,
}: FeedbackDisplayProps) {
    // Determine the score to display. If not eligible, score is effectively treated as relevant for display.
    // If null, it's pending.

    // Logic:
    // 1. If we have a score, show it.
    // 2. If we don't have a score but are ineligible, user wants "Total", which is technically 0 or N/A.
    //    We'll show "0/100" or similar to satisfy "show the total".
    // 3. If pending, show "Pending".

    const numericScore = totalScore !== null ? Number(totalScore) : (isEligible ? null : 0);

    // ---------------------------------------------------------------------------
    // PENDING STATE
    // ---------------------------------------------------------------------------
    if (numericScore === null) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <Question className="h-3.5 w-3.5" />
                <span>Pending Score</span>
            </span>
        );
    }

    // ---------------------------------------------------------------------------
    // SCORED STATE (Visualizing the score)
    // ---------------------------------------------------------------------------
    let colorClass = "bg-gray-50 text-gray-700 border-gray-200";
    let icon = <WarningCircle weight="fill" className="w-3.5 h-3.5 text-gray-400" />;

    if (numericScore >= 60) {
        colorClass = "bg-green-50 text-green-700 border-green-200";
        icon = <CheckCircle weight="fill" className="w-3.5 h-3.5 text-green-500" />;
    } else if (numericScore >= 40) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200";
        icon = <WarningCircle weight="fill" className="w-3.5 h-3.5 text-amber-500" />;
    } else {
        colorClass = "bg-red-50 text-red-700 border-red-200";
        icon = <XCircle weight="fill" className="w-3.5 h-3.5 text-red-500" />;
    }

    // If not eligible, we still show the score (0 or otherwise) but maybe hint at why if hovered
    // The user specifically asked "at the system check show the total and not failed or passed".

    const content = (
        <div className="flex items-center gap-2">
            <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-default transition-colors",
                colorClass
            )}>
                {icon}
                <span>{numericScore.toFixed(0)} Points</span>
            </div>

            {/* Mini Visual Indicator */}
            {!compact && (
                <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                    <div
                        className={cn("h-full rounded-full",
                            numericScore >= 60 ? "bg-green-500" :
                                numericScore >= 40 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.max(5, numericScore)}%` }}
                    />
                </div>
            )}
        </div>
    );

    // If there are eligibility flags that caused issues, we wrap in HoverCard to show details
    if (!isEligible && eligibilityFlags) {
        return (
            <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                    <div className="cursor-help">
                        {content}
                    </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-3 rounded-xl border-red-100 shadow-md">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-xs text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Prohibit className="h-4 w-4" />
                            Eligibility Issues
                        </h4>
                        <ul className="space-y-1">
                            {!eligibilityFlags.ageEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
                                    Age Requirement (18-35)
                                </li>
                            )}
                            {!eligibilityFlags.registrationEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
                                    Business Registration
                                </li>
                            )}
                            {!eligibilityFlags.revenueEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
                                    Revenue Threshold
                                </li>
                            )}
                            {!eligibilityFlags.impactEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
                                    Impact Alignment
                                </li>
                            )}
                        </ul>
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    }

    return content;
}
