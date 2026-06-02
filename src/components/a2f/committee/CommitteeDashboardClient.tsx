"use client";

import { useCallback, useMemo, useState } from "react";
import {
    getCommitteePipelineList,
    type CommitteePipelineListItem,
} from "@/lib/actions/a2f-committee";
import {
    CommitteePipelineEmpty,
    CommitteePipelineTable,
} from "@/components/a2f/committee/CommitteePipelineTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    ArrowsClockwise,
    Clock,
    MagnifyingGlass,
    FileText,
    X,
} from "@phosphor-icons/react";
import {
    committeeDecisionKey,
    DECISION_FILTER_OPTIONS,
    STAGE_CONFIG,
} from "@/lib/a2f-pipeline-ui";

function matchesDecisionFilter(
    item: CommitteePipelineListItem,
    filter: string
): boolean {
    if (filter === "all") return true;
    const key = committeeDecisionKey(item.donorDecision, item.icDecision);
    if (filter === "pending") return !key;
    return key === filter;
}

export function CommitteeDashboardClient({
    initialItems,
    initialError,
}: {
    initialItems: CommitteePipelineListItem[];
    initialError?: string;
}) {
    const [items, setItems] = useState(initialItems);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [decisionFilter, setDecisionFilter] = useState("all");

    const refresh = useCallback(async () => {
        setRefreshing(true);
        const res = await getCommitteePipelineList();
        if (res.success && res.data) setItems(res.data);
        else toast.error(res.error ?? "Failed to load cases");
        setRefreshing(false);
    }, []);

    const stats = useMemo(() => {
        const total = items.length;
        const pendingDecision = items.filter(
            (i) => !committeeDecisionKey(i.donorDecision, i.icDecision)
        ).length;
        const readyForReview = items.filter(
            (i) => i.hasGair && !committeeDecisionKey(i.donorDecision, i.icDecision)
        ).length;
        return { total, pendingDecision, readyForReview };
    }, [items]);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return items.filter((item) => {
            const matchSearch =
                !term ||
                item.businessName.toLowerCase().includes(term) ||
                item.applicantName.toLowerCase().includes(term) ||
                String(item.applicationId).includes(term);
            const matchStatus = statusFilter === "all" || item.status === statusFilter;
            const matchDecision = matchesDecisionFilter(item, decisionFilter);
            return matchSearch && matchStatus && matchDecision;
        });
    }, [items, search, statusFilter, decisionFilter]);

    const hasActiveFilters =
        Boolean(search) || statusFilter !== "all" || decisionFilter !== "all";

    if (refreshing) {
        return (
            <div className="container mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {initialError && items.length === 0 && (
                <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                    {initialError}
                </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-slate-900">
                        Committee review
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Review scores, GAIR, and record decisions for Matching Grant pipeline enterprises
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void refresh()}>
                    <ArrowsClockwise className="size-4 mr-1.5" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/15 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-dark">
                        Total cases
                    </p>
                    <p className="text-3xl font-bold mt-1 text-slate-900 tabular-nums">{stats.total}</p>
                    <p className="text-xs text-slate-600 mt-1">In Matching Grant pipeline</p>
                </div>
                <div className="rounded-xl bg-muted/50 border px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5" />
                        Pending decision
                    </p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">{stats.pendingDecision}</p>
                    <p className="text-xs text-muted-foreground mt-1">No committee outcome yet</p>
                </div>
                <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/15 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-blue-dark flex items-center gap-1">
                        <FileText className="size-3.5" />
                        Ready for review
                    </p>
                    <p className="text-3xl font-bold mt-1 text-slate-900 tabular-nums">
                        {stats.readyForReview}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">GAIR prepared, decision open</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Search enterprise, applicant, or app ID…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All stages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All stages</SelectItem>
                                {Object.entries(STAGE_CONFIG).map(([value, cfg]) => (
                                    <SelectItem key={value} value={value}>
                                        {cfg.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="All decisions" />
                            </SelectTrigger>
                            <SelectContent>
                                {DECISION_FILTER_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                    setDecisionFilter("all");
                                }}
                            >
                                <X className="size-3.5 mr-1" />
                                Clear filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        Cases
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({filtered.length} of {items.length})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                    {filtered.length === 0 ? (
                        <CommitteePipelineEmpty hasAnyCases={items.length > 0} />
                    ) : (
                        <CommitteePipelineTable items={filtered} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
