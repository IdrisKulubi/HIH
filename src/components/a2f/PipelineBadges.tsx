import { cn } from "@/lib/utils";
import {
    getDecisionStyle,
    getStageStyle,
    type DecisionStyle,
    type StageStyle,
} from "@/lib/a2f-pipeline-ui";

function Pill({ style, className }: { style: StageStyle | DecisionStyle; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full",
                style.color,
                style.bg,
                className
            )}
        >
            {style.label}
        </span>
    );
}

export function PipelineStageBadge({ status, className }: { status: string; className?: string }) {
    return <Pill style={getStageStyle(status)} className={className} />;
}

export function IcDecisionBadge({
    decision,
    className,
}: {
    decision: string | null | undefined;
    className?: string;
}) {
    return <Pill style={getDecisionStyle(decision)} className={className} />;
}

export function RevenueGateBadge({
    eligible,
    className,
}: {
    eligible: boolean | null;
    className?: string;
}) {
    if (eligible == null) {
        return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
    }
    return (
        <span
            className={cn(
                "inline-flex text-xs font-medium px-2.5 py-1 rounded-full",
                eligible ? "text-emerald-800 bg-emerald-100" : "text-red-800 bg-red-100",
                className
            )}
        >
            {eligible ? "Eligible" : "Ineligible"}
        </span>
    );
}

export function GairReadinessBadge({
    hasGair,
    className,
}: {
    hasGair: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex text-xs font-medium px-2.5 py-1 rounded-full",
                hasGair ? "text-sky-800 bg-sky-100" : "text-slate-600 bg-slate-100",
                className
            )}
        >
            {hasGair ? "GAIR ready" : "Awaiting GAIR"}
        </span>
    );
}
