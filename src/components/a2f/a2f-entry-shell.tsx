"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Buildings,
    ChartLine,
    ClipboardText,
    CurrencyDollar,
    FileText,
    Handshake,
    House,
    Package,
    PenNib,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGE_LABELS, type A2fPipelineStatus } from "@/lib/a2f-constants";
import { cn } from "@/lib/utils";
import { getA2fNavItemsForRole } from "@/lib/a2f-nav-items";
import { isA2fDdOnlyStaffRole } from "@/lib/a2f-nav";

export interface A2fEntryShellProps {
    a2fId: number;
    viewerRole: string;
    businessName: string;
    track?: string | null;
    pipelineStatus: string;
    requestedAmount?: string | number | null;
    approvedAmount?: string | number | null;
    children: React.ReactNode;
}

function formatTrack(track: string | null | undefined) {
    if (track === "acceleration") return "Accelerator";
    if (track === "foundation") return "Foundation";
    return null;
}

function formatKes(value: string | number | null | undefined) {
    if (value == null || value === "") return "—";
    return `KES ${Number(value).toLocaleString("en-KE")}`;
}

export function A2fEntryShell({
    a2fId,
    viewerRole,
    businessName,
    track,
    pipelineStatus,
    requestedAmount,
    approvedAmount,
    children,
}: A2fEntryShellProps) {
    const pathname = usePathname();
    const base = `/a2f/${a2fId}`;
    const navItems = getA2fNavItemsForRole(viewerRole);
    const ddOnlyShell = isA2fDdOnlyStaffRole(viewerRole);
    const trackLabel = formatTrack(track);
    const stageLabel = PIPELINE_STAGE_LABELS[pipelineStatus as A2fPipelineStatus] ?? pipelineStatus;

    return (
        <div className="min-h-[calc(100vh-8rem)]">
            <div className="sticky top-[57px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="container mx-auto max-w-7xl px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <nav className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                <Link href="/a2f" className="hover:text-foreground">
                                    Pipeline
                                </Link>
                                <span>/</span>
                                <span className="truncate text-foreground font-medium">{businessName}</span>
                            </nav>
                            <div className="flex flex-wrap items-center gap-2">
                                <Buildings weight="duotone" className="size-5 text-emerald-600 shrink-0" />
                                <h1 className="text-lg font-bold truncate">{businessName}</h1>
                                {trackLabel && (
                                    <Badge variant="outline" className="text-xs">
                                        {trackLabel} Track
                                    </Badge>
                                )}
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                                    {stageLabel}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Requested {formatKes(requestedAmount)}
                                {approvedAmount != null && Number(approvedAmount) > 0 && (
                                    <> · Approved {formatKes(approvedAmount)}</>
                                )}
                                {ddOnlyShell && (
                                    <> · Due diligence</>
                                )}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" asChild className="shrink-0 self-start lg:self-center">
                            <Link href="/a2f">All entries</Link>
                        </Button>
                    </div>

                    {!ddOnlyShell && (
                        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                            {navItems.map((item) => {
                                const { label, href, icon: Icon } = item;
                                const path = `${base}${href}`;
                                const active = item.exact
                                    ? pathname === base || pathname === `${base}/`
                                    : pathname.startsWith(path);
                                return (
                                    <Link
                                        key={href || "overview"}
                                        href={path}
                                        className={cn(
                                            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                                            active
                                                ? "bg-emerald-700 text-white"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="size-3.5" weight={active ? "fill" : "duotone"} />
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                </div>
            </div>

            <div className="container mx-auto max-w-7xl px-4 py-6">{children}</div>
        </div>
    );
}
