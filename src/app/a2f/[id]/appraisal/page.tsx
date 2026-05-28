"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    getAppraisals,
    getAutoPopulatedAppraisalContent,
    createOrUpdateAppraisal,
    recordIcDecision,
    type AppraisalContent,
    type A2fDocumentType,
    type IcDecision,
} from "@/lib/actions/a2f-investment-appraisals";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowLeft,
    Buildings,
    CaretDown,
    CheckCircle,
    Export,
    FileText,
    FloppyDisk,
    MagicWand,
    SealCheck,
} from "@phosphor-icons/react";
import { downloadGairDocx, exportGairPdf } from "@/lib/gair-export";
import { useSession } from "next-auth/react";
import { GAIR_SECTION_FIELDS as SECTION_FIELDS } from "@/lib/gair-section-fields";

type AppraisalRecord = {
    id: number;
    documentType: A2fDocumentType;
    content: Partial<AppraisalContent>;
    icApprovalStatus: boolean;
    approvedBy: string[] | null;
    icDecision: IcDecision | null;
    approvedGrantAmount: string | null;
    decisionNotes: string | null;
    decisionConditions: string | null;
    decidedAt: string | Date | null;
    updatedAt: string | Date;
};

const EMPTY_CONTENT: Partial<AppraisalContent> = {
    recommendedInstrument: "Matching Grant",
    recommendedAmount: "",
    icRecommendation: "",
    conditions: "",
};

const GAIR_SECTION_KEYS = SECTION_FIELDS.map((field) => field.key);

function isGairContentEmpty(content: Partial<AppraisalContent>): boolean {
    return GAIR_SECTION_KEYS.every(
        (key) => !(typeof content[key] === "string" && content[key].trim())
    );
}

function hasGairRecommendationContent(content: Partial<AppraisalContent>): boolean {
    return Boolean(
        content.recommendedInstrument?.trim()
        || content.recommendedAmount?.trim()
        || content.icRecommendation?.trim()
    );
}

function shouldBlockGairExport(
    content: Partial<AppraisalContent>,
    opts: {
        icDecision?: IcDecision | null;
        decisionNotes?: string | null;
        decisionConditions?: string | null;
    }
): boolean {
    if (!isGairContentEmpty(content)) return false;
    if (hasGairRecommendationContent(content)) return false;
    if (opts.icDecision) return false;
    if (opts.decisionNotes?.trim()) return false;
    if (opts.decisionConditions?.trim()) return false;
    return true;
}

export default function AppraisalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);
    const { data: session } = useSession();
    const userRole = session?.user?.role ?? "";
    const canRecordIcDecision =
        userRole !== "a2f_officer" && userRole !== "a2f_committee";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([]);
    const [content, setContent] = useState<Partial<AppraisalContent>>(EMPTY_CONTENT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoPopulating, setAutoPopulating] = useState(false);
    const [recordingDecision, setRecordingDecision] = useState(false);
    const [decision, setDecision] = useState<IcDecision>("approved");
    const [approvedGrantAmount, setApprovedGrantAmount] = useState("");
    const [decisionNotes, setDecisionNotes] = useState("");
    const [decisionConditions, setDecisionConditions] = useState("");
    const [exporting, setExporting] = useState(false);

    const existingGair = useMemo(
        () => appraisals.find((item) => item.documentType === "gair") ?? null,
        [appraisals]
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        const [entryRes, appraisalsRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getAppraisals(a2fId),
        ]);

        if (entryRes.success) setEntry(entryRes.data);
        if (appraisalsRes.success) {
            const records = (appraisalsRes.data ?? []) as AppraisalRecord[];
            setAppraisals(records);
            const gair = records.find((item) => item.documentType === "gair");
            const initialContent = gair?.content ?? EMPTY_CONTENT;
            setContent(initialContent);
            setDecision(gair?.icDecision ?? "approved");
            setApprovedGrantAmount(String(gair?.approvedGrantAmount ?? gair?.content?.recommendedAmount ?? ""));
            setDecisionNotes(gair?.decisionNotes ?? "");
            setDecisionConditions(gair?.decisionConditions ?? gair?.content?.conditions ?? "");

            const needsAutoPopulate = !gair || isGairContentEmpty(initialContent);
            if (needsAutoPopulate) {
                const autoRes = await getAutoPopulatedAppraisalContent(a2fId, "gair");
                if (autoRes.success && autoRes.data) {
                    setContent({ ...EMPTY_CONTENT, ...initialContent, ...autoRes.data });
                    if (!gair) {
                        toast.info("GAIR auto-populated from application and scoring data.");
                    }
                }
            }
        }
        setLoading(false);
    }, [a2fId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    async function handleAutoPopulate() {
        setAutoPopulating(true);
        const res = await getAutoPopulatedAppraisalContent(a2fId, "gair");
        setAutoPopulating(false);
        if (res.success && res.data) {
            setContent((current) => ({ ...current, ...res.data }));
            toast.success(res.message ?? "GAIR content auto-populated");
        } else {
            toast.error(res.error ?? "Failed to auto-populate GAIR");
        }
    }

    async function handleSave() {
        setSaving(true);
        const res = await createOrUpdateAppraisal(a2fId, {
            documentType: "gair",
            content,
        });
        setSaving(false);
        if (res.success) {
            toast.success(res.message ?? "GAIR saved");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to save GAIR");
        }
    }

    async function handleRecordDecision() {
        if (!existingGair) return;
        setRecordingDecision(true);
        const res = await recordIcDecision(existingGair.id, {
            decision,
            approvedGrantAmount: approvedGrantAmount ? Number(approvedGrantAmount) : undefined,
            decisionNotes,
            decisionConditions,
        });
        setRecordingDecision(false);
        if (res.success) {
            toast.success(res.message ?? "IC decision recorded");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to record IC decision");
        }
    }

    function updateField(key: keyof AppraisalContent, value: string) {
        setContent((current) => ({ ...current, [key]: value }));
    }

    if (loading) {
        return (
            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-28" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const biz = entry?.application?.business;
    const isApproved = existingGair?.icApprovalStatus ?? false;
    const updatedAt = existingGair?.updatedAt ? format(new Date(existingGair.updatedAt), "dd MMM yyyy, HH:mm") : null;
    const decidedAt = existingGair?.decidedAt ? format(new Date(existingGair.decidedAt), "dd MMM yyyy, HH:mm") : null;
    const decisionLabel = existingGair?.icDecision ? formatDecision(existingGair.icDecision) : null;

    function buildExportContext() {
        return {
            businessName: biz?.name ?? "Enterprise",
            applicationId: entry?.applicationId ?? a2fId,
            track: entry?.application?.track ?? null,
            content,
            icDecision: existingGair?.icDecision ?? decision,
            approvedGrantAmount: approvedGrantAmount || existingGair?.approvedGrantAmount,
            decisionNotes: decisionNotes || existingGair?.decisionNotes,
            decisionConditions: decisionConditions || existingGair?.decisionConditions,
        };
    }

    function guardGairExport(): boolean {
        if (
            shouldBlockGairExport(content, {
                icDecision: existingGair?.icDecision ?? decision,
                decisionNotes: decisionNotes || existingGair?.decisionNotes,
                decisionConditions: decisionConditions || existingGair?.decisionConditions,
            })
        ) {
            toast.error("GAIR has no content yet. Click Auto-Populate GAIR or fill the sections first.");
            return false;
        }
        return true;
    }

    async function handleExportDocx() {
        if (!guardGairExport()) return;
        setExporting(true);
        try {
            await downloadGairDocx(buildExportContext());
            toast.success("GAIR Word document downloaded");
        } catch {
            toast.error("Failed to export GAIR as Word document");
        } finally {
            setExporting(false);
        }
    }

    function handleExportPdf() {
        if (!guardGairExport()) return;
        const opened = exportGairPdf(buildExportContext());
        if (!opened) {
            toast.error("Could not open print window. Allow pop-ups for this site and try again.");
            return;
        }
        toast.info("Print dialog opened — choose Save as PDF to download");
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> Entry Overview
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText weight="duotone" className="size-5 shrink-0 text-emerald-700" />
                    <h1 className="text-lg font-bold">GAIR Appraisal Workspace</h1>
                </div>
                {biz && (
                    <Badge className="gap-1.5">
                        <Buildings weight="fill" className="size-3" />
                        {biz.name}
                    </Badge>
                )}
            </div>

            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                Matching Grant Appraisal and Improvement Report
                                {isApproved && <SealCheck weight="fill" className="size-5 text-emerald-600" />}
                            </CardTitle>
                            <CardDescription>
                                Auto-populate from Matching Grant application, scoring, due diligence, and application records, then refine for Investment Committee review.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={isApproved ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                                {decisionLabel ?? (isApproved ? "IC Approved" : "Draft / IC Review")}
                            </Badge>
                            {updatedAt && <Badge variant="outline">Updated {updatedAt}</Badge>}
                            {decidedAt && <Badge variant="outline">Decision {decidedAt}</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleAutoPopulate} disabled={autoPopulating} variant="outline" className="gap-2">
                            <MagicWand className="size-4" />
                            {autoPopulating ? "Populating..." : "Auto-Populate GAIR"}
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
                            <FloppyDisk className="size-4" />
                            {saving ? "Saving..." : "Save GAIR"}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" disabled={exporting} className="gap-2">
                                    <Export className="size-4" />
                                    {exporting ? "Exporting…" : "Export"}
                                    <CaretDown className="size-3.5 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportDocx} disabled={exporting}>
                                    Word document (.docx)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <Separator />
                    {canRecordIcDecision ? (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>IC Decision</Label>
                                    <Select value={decision} onValueChange={(value) => setDecision(value as IcDecision)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="approved_with_conditions">Approved with conditions</SelectItem>
                                            <SelectItem value="deferred">Deferred</SelectItem>
                                            <SelectItem value="declined">Declined</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Approved Grant Amount (KES)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={approvedGrantAmount}
                                        onChange={(event) => setApprovedGrantAmount(event.target.value)}
                                        disabled={decision === "deferred" || decision === "declined"}
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label>Decision Conditions</Label>
                                    <Textarea
                                        value={decisionConditions}
                                        onChange={(event) => setDecisionConditions(event.target.value)}
                                        rows={3}
                                        placeholder="Required for approval with conditions; optional for other decisions."
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label>Decision Notes</Label>
                                    <Textarea
                                        value={decisionNotes}
                                        onChange={(event) => setDecisionNotes(event.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleRecordDecision} disabled={!existingGair || recordingDecision} variant="outline" className="gap-2">
                                    <CheckCircle className="size-4" />
                                    {recordingDecision ? "Recording..." : "Record IC Decision"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
                            <p className="font-medium">Committee decision</p>
                            {decisionLabel ? (
                                <p>
                                    {decisionLabel}
                                    {existingGair?.approvedGrantAmount
                                        ? ` · KES ${Number(existingGair.approvedGrantAmount).toLocaleString("en-KE")}`
                                        : ""}
                                </p>
                            ) : (
                                <p className="text-muted-foreground">Pending committee review.</p>
                            )}
                            {userRole === "a2f_officer" && (
                                <Button variant="link" className="h-auto p-0" asChild>
                                    <Link href={`/a2f/committee/${a2fId}`}>
                                        Open committee case (read-only)
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {SECTION_FIELDS.map((field) => (
                    <Card key={field.key} className="min-h-0">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{field.label}</CardTitle>
                            <CardDescription className="text-xs">{field.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={String(content[field.key] ?? "")}
                                onChange={(event) => updateField(field.key, event.target.value)}
                                rows={field.rows ?? 5}
                                className="resize-y text-sm leading-relaxed"
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function formatDecision(decision: IcDecision) {
    const labels: Record<IcDecision, string> = {
        approved: "Approved",
        approved_with_conditions: "Approved with Conditions",
        deferred: "Deferred",
        declined: "Declined",
    };
    return labels[decision];
}
