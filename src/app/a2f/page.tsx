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
    Kanban, MagnifyingGlass, X, Plus, ArrowRight, Coins,
    Buildings, MapPin, User, ArrowsClockwise,
    CheckCircle, CurrencyDollar, CaretUpDown, Check,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// STAGE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    a2f_pipeline:        { label: "In Pipeline",       color: "text-slate-700",   bg: "bg-slate-100" },
    due_diligence_initial: { label: "Initial DD",      color: "text-blue-700",    bg: "bg-blue-100" },
    pre_ic_scoring:      { label: "Pre-IC Scoring",    color: "text-violet-700",  bg: "bg-violet-100" },
    ic_appraisal_review: { label: "IC Appraisal",      color: "text-amber-700",   bg: "bg-amber-100" },
    offer_issued:        { label: "Offer Issued",       color: "text-orange-700",  bg: "bg-orange-100" },
    contracting:         { label: "Contracting",        color: "text-cyan-700",    bg: "bg-cyan-100" },
    disbursement_active: { label: "Disbursing",         color: "text-emerald-700", bg: "bg-emerald-100" },
    post_ta_monitoring:  { label: "Post-TA Monitor",    color: "text-green-700",   bg: "bg-green-100" },
};

const INSTRUMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    matching_grant:  { label: "Matching",  color: "text-blue-700",  bg: "bg-blue-50 border border-blue-200" },
    repayable_grant: { label: "Repayable", color: "text-purple-700", bg: "bg-purple-50 border border-purple-200" },
};

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
    const [instrumentFilter, setInstrumentFilter] = useState("all");

    // Create entry dialog
    const [showCreate, setShowCreate] = useState(false);
    const [qualifiedApps, setQualifiedApps] = useState<Array<{ applicationId: number; businessName: string }>>([]);
    const [creating, setCreating] = useState(false);

    // Multi-select state: map of applicationId → { instrumentType, requestedAmount }
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [perAppConfig, setPerAppConfig] = useState<Record<number, {
        instrumentType: "matching_grant" | "repayable_grant";
        requestedAmount: string;
    }>>({});
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
        const matching = pipeline.filter(p => p.instrumentType === "matching_grant").length;
        const repayable = pipeline.filter(p => p.instrumentType === "repayable_grant").length;
        const totalDisbursed = pipeline.reduce((s, p) => s + p.totalDisbursed, 0);
        return { total, active, matching, repayable, totalDisbursed };
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
            const matchInstrument = instrumentFilter === "all" || p.instrumentType === instrumentFilter;
            return matchSearch && matchStatus && matchInstrument;
        });
    }, [pipeline, search, statusFilter, instrumentFilter]);

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
                    [appId]: { instrumentType: "matching_grant", requestedAmount: "" },
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
                instrumentType: cfg.instrumentType,
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
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
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
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Kanban weight="duotone" className="size-7 text-emerald-600" />
                        A2F Investment Pipeline
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Manage enterprises through the Access to Finance investment lifecycle
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadPipeline}>
                        <ArrowsClockwise className="size-4 mr-1.5" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleOpenCreate} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="size-4 mr-1.5" />
                        Add to Pipeline
                    </Button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Entries</p>
                        <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.active} actively progressing</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Matching Grants</p>
                        <p className="text-3xl font-bold mt-1 text-blue-700">{stats.matching}</p>
                        <p className="text-xs text-muted-foreground mt-1">Co-investment model</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Repayable Grants</p>
                        <p className="text-3xl font-bold mt-1 text-purple-700">{stats.repayable}</p>
                        <p className="text-xs text-muted-foreground mt-1">24-month term, 6% p.a.</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Disbursed</p>
                        <p className="text-2xl font-bold mt-1 text-amber-700">
                            KES {stats.totalDisbursed.toLocaleString("en-KE")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Verified disbursements</p>
                    </CardContent>
                </Card>
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
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All instruments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Instruments</SelectItem>
                                <SelectItem value="matching_grant">Matching Grant</SelectItem>
                                <SelectItem value="repayable_grant">Repayable Grant</SelectItem>
                            </SelectContent>
                        </Select>
                        {(search || statusFilter !== "all" || instrumentFilter !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearch(""); setStatusFilter("all"); setInstrumentFilter("all"); }}
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
                            Pipeline Entries
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
                                    <TableHead>Instrument</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Officer</TableHead>
                                    <TableHead className="text-right">Amount (KES)</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(entry => {
                                    const stage = STAGE_CONFIG[entry.status] ?? { label: entry.status, color: "text-gray-600", bg: "bg-gray-100" };
                                    const instrument = INSTRUMENT_CONFIG[entry.instrumentType] ?? { label: entry.instrumentType, color: "text-gray-600", bg: "bg-gray-50" };
                                    return (
                                        <TableRow key={entry.id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="rounded-lg bg-emerald-100 p-1.5 mt-0.5">
                                                        <Buildings weight="duotone" className="size-4 text-emerald-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm leading-tight">{entry.businessName}</p>
                                                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                                            <MapPin className="size-3" />
                                                            {entry.county ?? "—"}
                                                            {entry.sector && <> · {entry.sector.replace(/_/g, " ")}</>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <User weight="duotone" className="size-3.5 text-muted-foreground" />
                                                    <span>{entry.applicantName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${instrument.color} ${instrument.bg}`}>
                                                    {instrument.label}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stage.color} ${stage.bg}`}>
                                                    {stage.label}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {entry.officerName ?? <span className="italic opacity-60">Unassigned</span>}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-medium">
                                                {Number(entry.requestedAmount).toLocaleString("en-KE")}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/a2f/${entry.id}`}>
                                                        View <ArrowRight className="size-3.5 ml-1" />
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
                            Add to A2F Pipeline
                        </DialogTitle>
                        <DialogDescription>
                            Search and select one or more DD-qualified enterprises, then configure each grant instrument.
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
                                            const cfg = perAppConfig[id] ?? { instrumentType: "matching_grant", requestedAmount: "" };
                                            return (
                                                <div key={id} className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-emerald-100 p-1">
                                                            <Buildings weight="duotone" className="size-3.5 text-emerald-700" />
                                                        </div>
                                                        <p className="text-sm font-semibold truncate flex-1">{app?.businessName}</p>
                                                        <span className="text-xs text-muted-foreground shrink-0">#{id}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Instrument</Label>
                                                            <Select
                                                                value={cfg.instrumentType}
                                                                onValueChange={v => setPerAppConfig(c => ({
                                                                    ...c,
                                                                    [id]: { ...c[id], instrumentType: v as "matching_grant" | "repayable_grant" },
                                                                }))}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="matching_grant">Matching Grant</SelectItem>
                                                                    <SelectItem value="repayable_grant">Repayable (24m @ 6%)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Amount (KES)</Label>
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
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-[500px]" />
            </div>
        }>
            <A2fDashboardContent />
        </Suspense>
    );
}
