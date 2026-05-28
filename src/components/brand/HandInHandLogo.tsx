import Link from "next/link";
import { cn } from "@/lib/utils";
import { HandInHandMark } from "./HandInHandMark";

type HandInHandLogoProps = {
    className?: string;
    markSize?: number;
    showWordmark?: boolean;
    href?: string;
    /** Compact wordmark for narrow headers */
    compact?: boolean;
};

export function HandInHandLogo({
    className,
    markSize = 36,
    showWordmark = true,
    href,
    compact = false,
}: HandInHandLogoProps) {
    const content = (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            <HandInHandMark size={markSize} />
            {showWordmark && (
                <span className="flex flex-col leading-tight">
                    <span
                        className={cn(
                            "font-semibold tracking-wide text-slate-800",
                            compact ? "text-xs" : "text-sm"
                        )}
                    >
                        HAND IN HAND
                    </span>
                    <span
                        className={cn(
                            "font-normal tracking-wider text-slate-500",
                            compact ? "text-[10px]" : "text-xs"
                        )}
                    >
                        EASTERN AFRICA
                    </span>
                </span>
            )}
        </span>
    );

    if (href) {
        return (
            <Link href={href} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40">
                {content}
            </Link>
        );
    }

    return content;
}
