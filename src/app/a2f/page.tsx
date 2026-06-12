"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
    getA2fPipelineList,
    type A2fPipelineListItem,
} from "@/lib/actions/a2f-pipeline";
import { createA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import { getPipelineListHint } from "@/lib/a2f-workflow";
import { getQualifiedApplications } from "@/lib/actions/due-diligence";
import { toast } from "sonner";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MagnifyingGlass,
    X,
    Plus,
    ArrowRight,
    Coins,
    Buildings,
    ArrowsClockwise,
    CurrencyDollar,
    CaretUpDown,
    Check,
    FileText,
    Scales,
} from "@phosphor-icons/react";

function formatKes(amount: number) {
    return amount.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}
import { STAGE_CONFIG, getStageStyle } from "@/lib/a2f-pipeline-ui";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE (wrapped with Suspense for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

function A2fDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [pipeline, setPipeline] = useState<A2fPipelineListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    // Create entry dialog
    const [showCreate, setShowCreate] = useState(false);
    const [qualifiedApps, setQualifiedApps] = useState<Array<{ applicationId: number; businessName: string }>>([]);
    const [creating, setCreating] = useState(false);

    // Multi-select state: map of applicationId → { instrumentType, requestedAmount }
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [perAppConfig, setPerAppConfig] = useState<Record<number, { requestedAmount: string }>>({});
    const [appPickerOpen, setAppPickerOpen] = useState(false);
    const [appSearch, setAppSearch] = useState("");

    const loadPipeline = useCallback(async () => {
        setLoading(true);
        const res = await getA2fPipelineList();
        if (res.success && res.data) setPipeline(res.data);
        else toast.error(res.error ?? "Failed to load pipeline");
        setLoading(false);
    }, []);

    useEffect(() => { loadPipeline(); }, [loadPipeline]);

    // Stats
    const stats = useMemo(() => {
        const total = pipeline.length;
        const active = pipeline.filter(p =>
            !["post_ta_monitoring", "a2f_pipeline"].includes(p.status)
        ).length;
        const inIcReview = pipeline.filter(p => p.status === "ic_appraisal_review").length;
        const totalDisbursed = pipeline.reduce((s, p) => s + p.totalDisbursed, 0);
        return { total, active, inIcReview, totalDisbursed };
    }, [pipeline]);

    // Filtered data
    const filtered = useMemo(() => {
        return pipeline.filter(p => {
            const term = search.toLowerCase();
            const matchSearch = !term
                || p.businessName.toLowerCase().includes(term)
                || p.applicantName.toLowerCase().includes(term)
                || p.applicantEmail.toLowerCase().includes(term)
                || String(p.applicationId).includes(term);
            const matchStatus = statusFilter === "all" || p.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [pipeline, search, statusFilter]);

    const handleOpenCreate = async () => {
        const res = await getQualifiedApplications();
        if (res.success && res.data) {
            const existingIds = new Set(pipeline.map(p => p.applicationId));
            setQualifiedApps(
                res.data
                    .filter(a => !existingIds.has(a.applicationId))
                    .map(a => ({ applicationId: a.applicationId, businessName: a.businessName }))
            );
        }
        setSelectedIds(new Set());
        setPerAppConfig({});
        setAppSearch("");
        setShowCreate(true);
    };

    const toggleAppSelection = (appId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(appId)) {
                next.delete(appId);
                setPerAppConfig(cfg => {
                    const c = { ...cfg };
                    delete c[appId];
                    return c;
                });
            } else {
                next.add(appId);
                setPerAppConfig(cfg => ({
                    ...cfg,
                    [appId]: { requestedAmount: "" },
                }));
            }
            return next;
        });
    };

    const handleCreate = async () => {
        const entries = Array.from(selectedIds);
        if (entries.length === 0) {
            toast.error("Select at least one enterprise");
            return;
        }
        const invalid = entries.find(id => !perAppConfig[id]?.requestedAmount || Number(perAppConfig[id].requestedAmount) <= 0);
        if (invalid) {
            toast.error(`Enter a valid requested amount for all selected enterprises`);
            return;
        }
        setCreating(true);
        let lastId: number | null = null;
        let successCount = 0;
        for (const appId of entries) {
            const cfg = perAppConfig[appId];
            const res = await createA2fPipelineEntry({
                applicationId: appId,
                requestedAmount: Number(cfg.requestedAmount),
            });
            if (res.success) {
                successCount++;
                if (res.data?.id) lastId = res.data.id;
            } else {
                toast.error(`Failed for app #${appId}: ${res.error}`);
            }
        }
        setCreating(false);
        if (successCount > 0) {
            toast.success(`${successCount} pipeline entr${successCount > 1 ? "ies" : "y"} created`);
            setShowCreate(false);
            loadPipeline();
            if (successCount === 1 && lastId) router.push(`/a2f/${lastId}`);
        }
    };

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Matching Grant pipeline
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track enterprises from pipeline entry through disbursement
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadPipeline}>
                        <ArrowsClockwise className="mr-1.5 size-4" />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="bg-emerald-700 hover:bg-emerald-800"
                    >
                        <Plus className="mr-1.5 size-4" />
                        Add to pipeline
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
                        Pipeline entries
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{stats.total}</p>
                    <p className="mt-1 text-xs text-slate-600">
                        {stats.active} actively progressing
                    </p>
                </div>
                <div className="rounded-xl border bg-muted/50 px-4 py-4">
                    <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Scales className="size-3.5" />
                        In IC review
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">{stats.inIcReview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">GAIR and committee stage</p>
                </div>
                <div className="rounded-xl border bg-muted/50 px-4 py-4">
                    <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <FileText className="size-3.5" />
                        Total disbursed
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        KES {formatKes(stats.totalDisbursed)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Verified disbursements</p>
                </div>
            </div>

            {/* ── Filters ── */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search enterprise, applicant, email or app ID…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9"
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
                                <SelectItem value="all">All Stages</SelectItem>
                                {Object.entries(STAGE_CONFIG).map(([value, cfg]) => (
                                    <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(search || statusFilter !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                            >
                                <X className="size-3.5 mr-1" />
                                Clear filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Table ── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            Pipeline entries
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({filtered.length} of {pipeline.length})
                            </span>
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <Coins weight="duotone" className="size-12 mb-3 opacity-30" />
                            <p className="font-medium">No pipeline entries found</p>
                            <p className="text-sm mt-1">
                                {pipeline.length === 0
                                    ? "Add a DD-qualified application to get started"
                                    : "Try adjusting your filters"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="pl-6">Enterprise</TableHead>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Officer</TableHead>
                                    <TableHead>Next</TableHead>
                                    <TableHead className="text-right">Amount (KES)</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(entry => {
                                    const stage = getStageStyle(entry.status);
                                    return (
                                        <TableRow key={entry.id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6">
                                                <div className="flex items-start gap-2">
                                                    <Buildings className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                                                    <div>
                                                        <p className="font-medium leading-tight">{entry.businessName}</p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {[entry.county, entry.sector?.replace(/_/g, " ")]
                                                                .filter(Boolean)
                                                                .join(" · ") || "Location not set"}
                                                            {" · "}App #{entry.applicationId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{entry.applicantName}</TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stage.color} ${stage.bg}`}>
                                                    {stage.label}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {entry.officerName ? (
                                                    <span className="text-sm">{entry.officerName}</span>
                                                ) : (
                                                    <Badge variant="outline" className="font-normal text-muted-foreground">
                                                        Unassigned
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">{getPipelineListHint(entry)}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-medium tabular-nums">
                                                {formatKes(Number(entry.requestedAmount))}
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/a2f/${entry.id}`}>
                                                        Review
                                                        <ArrowRight className="ml-1 size-3.5" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* ── Create Entry Dialog ── */}
            <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) setAppPickerOpen(false); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="size-4" />
                            Add to Matching Grant Pipeline
                        </DialogTitle>
                        <DialogDescription>
                            Search and select DD-qualified enterprises, then enter the requested grant amount for each.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {/* ── Searchable multi-select picker ── */}
                        <div className="space-y-1.5">
                            <Label>Qualified Applications *</Label>
                            <Popover open={appPickerOpen} onOpenChange={setAppPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between font-normal"
                                    >
                                        <span className="truncate text-muted-foreground">
                                            {selectedIds.size === 0
                                                ? "Search enterprise or applicant name…"
                                                : `${selectedIds.size} enterprise${selectedIds.size > 1 ? "s" : ""} selected`
                                            }
                                        </span>
                                        <CaretUpDown className="size-4 shrink-0 text-muted-foreground ml-2" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[440px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Search by name, applicant or app ID…"
                                            value={appSearch}
                                            onValueChange={setAppSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No matching applications found.</CommandEmpty>
                                            <CommandGroup>
                                                <ScrollArea className="max-h-64">
                                                    {qualifiedApps
                                                        .filter(app => {
                                                            const q = appSearch.toLowerCase();
                                                            return !q
                                                                || app.businessName.toLowerCase().includes(q)
                                                                || String(app.applicationId).includes(q);
                                                        })
                                                        .map(app => {
                                                            const isSelected = selectedIds.has(app.applicationId);
                                                            return (
                                                                <CommandItem
                                                                    key={app.applicationId}
                                                                    value={String(app.applicationId)}
                                                                    onSelect={() => toggleAppSelection(app.applicationId)}
                                                                    className="flex items-center gap-3 cursor-pointer"
                                                                >
                                                                    <div className={`size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                        isSelected
                                                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                                                            : "border-input"
                                                                    }`}>
                                                                        {isSelected && <Check weight="bold" className="size-2.5" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate">{app.businessName}</p>
                                                                        <p className="text-xs text-muted-foreground">App #{app.applicationId}</p>
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        })
                                                    }
                                                </ScrollArea>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    {selectedIds.size > 0 && (
                                        <div className="border-t px-3 py-2 flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => { setSelectedIds(new Set()); setPerAppConfig({}); }}
                                            >
                                                Clear all
                                            </Button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* ── Selected chips ── */}
                        {selectedIds.size > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(selectedIds).map(id => {
                                    const app = qualifiedApps.find(a => a.applicationId === id);
                                    return (
                                        <Badge
                                            key={id}
                                            variant="secondary"
                                            className="gap-1 pr-1 text-xs max-w-[200px]"
                                        >
                                            <span className="truncate">{app?.businessName ?? `#${id}`}</span>
                                            <button
                                                onClick={() => toggleAppSelection(id)}
                                                className="rounded-full hover:bg-muted-foreground/20 p-0.5 ml-0.5 shrink-0"
                                            >
                                                <X className="size-2.5" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Per-enterprise config rows ── */}
                        {selectedIds.size > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Configure each enterprise
                                </p>
                                <ScrollArea className="max-h-56">
                                    <div className="space-y-3 pr-1">
                                        {Array.from(selectedIds).map(id => {
                                            const app = qualifiedApps.find(a => a.applicationId === id);
                                            const cfg = perAppConfig[id] ?? { requestedAmount: "" };
                                            return (
                                                <div key={id} className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-emerald-100 p-1">
                                                            <Buildings weight="duotone" className="size-3.5 text-emerald-700" />
                                                        </div>
                                                        <p className="text-sm font-semibold truncate flex-1">{app?.businessName}</p>
                                                        <span className="text-xs text-muted-foreground shrink-0">#{id}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Requested grant amount (KES)</Label>
                                                        <div className="relative">
                                                            <CurrencyDollar className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                                            <Input
                                                                type="number"
                                                                placeholder="0.00"
                                                                className="h-8 pl-6 text-xs"
                                                                value={cfg.requestedAmount}
                                                                    onChange={e => setPerAppConfig(c => ({
                                                                        ...c,
                                                                        [id]: { ...c[id], requestedAmount: e.target.value },
                                                                    }))}
                                                                />
                                                            </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || selectedIds.size === 0}
                            className="bg-emerald-700 hover:bg-emerald-800 gap-1.5"
                        >
                            {creating
                                ? <ArrowsClockwise className="size-4 animate-spin" />
                                : <Plus className="size-4" />
                            }
                            {creating
                                ? "Creating…"
                                : `Add ${selectedIds.size > 0 ? selectedIds.size : ""} to Pipeline`
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function A2fDashboardPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Skeleton className="h-10 w-80" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[500px]" />
            </div>
        }>
            <A2fDashboardContent />
        </Suspense>
    );
}
