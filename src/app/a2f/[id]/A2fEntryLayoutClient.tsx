"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import { getAppraisals } from "@/lib/actions/a2f-investment-appraisals";
import { A2fEntryShell } from "@/components/a2f/a2f-entry-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
    canAccessA2fStaffPath,
    pathnameToA2fNavSegment,
    parseA2fStaffPipelinePath,
} from "@/lib/a2f-nav";

export function A2fEntryLayoutClient({
    a2fId,
    viewerRole,
    children,
}: {
    a2fId: number;
    viewerRole: string;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!canAccessA2fStaffPath(viewerRole, pathname)) {
            const segment = pathnameToA2fNavSegment(pathname, a2fId);
            if (segment) {
                router.replace(`/a2f/${a2fId}`);
            } else {
                router.replace("/a2f");
            }
        }
    }, [pathname, viewerRole, a2fId, router]);

    const loadEntry = useCallback(async () => {
        setLoading(true);
        const [entryRes, appraisalsRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getAppraisals(a2fId),
        ]);
        if (entryRes.success && entryRes.data) {
            const data = entryRes.data;
            if (appraisalsRes.success && appraisalsRes.data) {
                data.investmentAppraisals = appraisalsRes.data;
            }
            setEntry(data);
        }
        setLoading(false);
    }, [a2fId]);

    useEffect(() => {
        loadEntry();
    }, [loadEntry]);

    if (loading) {
        return (
            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!entry) {
        return (
            <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
                Pipeline entry not found.
            </div>
        );
    }

    const gair = entry.investmentAppraisals?.find(
        (a: { documentType?: string }) => a.documentType === "gair"
    );
    const biz = entry.application?.business;

    return (
        <A2fEntryShell
            a2fId={a2fId}
            viewerRole={viewerRole}
            businessName={biz?.name ?? "Enterprise"}
            track={entry.application?.track}
            pipelineStatus={entry.status}
            requestedAmount={entry.requestedAmount}
            approvedAmount={gair?.approvedGrantAmount}
        >
            {children}
        </A2fEntryShell>
    );
}
