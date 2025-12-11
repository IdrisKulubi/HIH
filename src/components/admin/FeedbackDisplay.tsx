"use client";

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    CheckCircle,
    XCircle,
    WarningCircle,
    Stethoscope,
    TrendUp,
    Scales,
    Lightbulb,
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
    // ---------------------------------------------------------------------------
    // 1. SYSTEM FAILURE STATE (If not eligible)
    // ---------------------------------------------------------------------------
    if (!isEligible && eligibilityFlags) {
        const failures = [];
        if (!eligibilityFlags.ageEligible) failures.push("Age Check");
        if (!eligibilityFlags.registrationEligible) failures.push("Registration");
        if (!eligibilityFlags.revenueEligible) failures.push("Revenue");
        if (!eligibilityFlags.impactEligible) failures.push("Impact");
        if (!eligibilityFlags.businessPlanEligible) failures.push("Business Plan");

        const mainReason = failures[0] || "Eligibility Criteria";
        const extraCount = failures.length - 1;

        return (
            <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                    <div
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-help",
                            "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        )}
                    >
                        <XCircle weight="fill" className="h-3.5 w-3.5 text-red-600" />
                        <span className="truncate max-w-[120px]">
                            Failed: {mainReason} {extraCount > 0 && `+${extraCount}`}
                        </span>
                    </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-3 rounded-xl">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-xs text-red-700 uppercase tracking-wide">
                            System Check Failed
                        </h4>
                        <ul className="space-y-1">
                            {!eligibilityFlags.ageEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mr-2" />
                                    Age Requirement (18-35)
                                </li>
                            )}
                            {!eligibilityFlags.registrationEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mr-2" />
                                    Business Registration
                                </li>
                            )}
                            {!eligibilityFlags.revenueEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mr-2" />
                                    Revenue Threshold
                                </li>
                            )}
                            {!eligibilityFlags.impactEligible && (
                                <li className="flex items-center text-xs text-gray-700">
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mr-2" />
                                    Impact Alignment
                                </li>
                            )}
                        </ul>
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    }

    // ---------------------------------------------------------------------------
    // 2. PENDING SCORING STATE
    // ---------------------------------------------------------------------------
    if (totalScore === null) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                System Check Passed
            </span>
        );
    }

    // ---------------------------------------------------------------------------
    // 3. SCORED STATE (Eligible + Score)
    // ---------------------------------------------------------------------------
    const numericScore = Number(totalScore);

    // Dynamic color coding
    let colorClass = "bg-red-50 text-red-700 border-red-200";
    let icon = <XCircle weight="fill" className="w-3.5 h-3.5 text-red-500" />;

    if (numericScore >= 70) {
        colorClass = "bg-green-50 text-green-700 border-green-200";
        icon = <CheckCircle weight="fill" className="w-3.5 h-3.5 text-green-500" />;
    } else if (numericScore >= 50) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200";
        icon = <WarningCircle weight="fill" className="w-3.5 h-3.5 text-amber-500" />;
    }

    return (
        <div className="flex items-center gap-2">
            <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-default",
                colorClass
            )}>
                {icon}
                <span>{numericScore.toFixed(0)}%</span>
            </div>

            {/* Mini Visual Indicator */}
            <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                <div
                    className={cn("h-full rounded-full",
                        numericScore >= 70 ? "bg-green-500" :
                            numericScore >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${numericScore}%` }}
                />
            </div>
        </div>
    );
}
