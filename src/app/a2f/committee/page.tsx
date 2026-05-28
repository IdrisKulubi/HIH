"use client";

import { useCallback, useEffect, useState } from "react";
import { getCommitteePipelineList, type CommitteePipelineListItem } from "@/lib/actions/a2f-committee";
import { CommitteePipelineTable } from "@/components/a2f/committee/CommitteePipelineTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function A2fCommitteePage() {
    const [items, setItems] = useState<CommitteePipelineListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getCommitteePipelineList();
        if (res.success && res.data) setItems(res.data);
        else toast.error(res.error ?? "Failed to load cases");
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = items.filter((item) => {
        const term = search.toLowerCase();
        if (!term) return true;
        return (
            item.businessName.toLowerCase().includes(term) ||
            item.applicantName.toLowerCase().includes(term) ||
            String(item.applicationId).includes(term)
        );
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Committee cases</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Review scores and record decisions for all Matching Grant pipeline enterprises.
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pipeline</CardTitle>
                    <CardDescription>{items.length} case(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative max-w-sm">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Search enterprise or applicant…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {loading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : (
                        <CommitteePipelineTable items={filtered} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
