"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    getGrantManagementWorkspace,
    saveGrantMilestone,
    saveProcurementItem,
    seedGrantManagementFromApplication,
    type GrantMilestoneInput,
    type GrantMilestoneStatus,
    type ProcurementItemInput,
    type ProcurementStatus,
} from "@/lib/actions/a2f-grant-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Buildings,
    ClipboardText,
    FloppyDisk,
    Package,
    Path,
    Plus,
    Sparkle,
} from "@phosphor-icons/react";

type WorkspaceData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agreement: any | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    procurementItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    milestones: any[];
};

const PROCUREMENT_STATUSES: ProcurementStatus[] = ["planned", "quotes_requested", "supplier_selected", "ordered", "delivered", "verified", "cancelled"];
const MILESTONE_STATUSES: GrantMilestoneStatus[] = ["planned", "in_progress", "submitted_for_verification", "verified", "delayed", "blocked"];

const EMPTY_PROCUREMENT: ProcurementItemInput = {
    itemName: "",
    category: "productive_equipment",
    procurementStatus: "planned",
    selectedQuoteAmount: 0,
    bireContributionAmount: 0,
    enterpriseContributionAmount: 0,
};

const EMPTY_MILESTONE: GrantMilestoneInput = {
    milestoneName: "",
    status: "planned",
};

export default function GrantManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);

    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [savingProcurement, setSavingProcurement] = useState(false);
    const [savingMilestone, setSavingMilestone] = useState(false);
    const [activeTab, setActiveTab] = useState<"procurement" | "milestones" | "summary">("procurement");
    const [procurementForm, setProcurementForm] = useState<ProcurementItemInput>(EMPTY_PROCUREMENT);
    const [milestoneForm, setMilestoneForm] = useState<GrantMilestoneInput>(EMPTY_MILESTONE);

    const loadData = useCallback(async () => {
        setLoading(true);
        const res = await getGrantManagementWorkspace(a2fId);
        if (res.success) {
            setWorkspace(res.data as WorkspaceData);
        } else {
            toast.error(res.error ?? "Failed to load grant management workspace");
        }
        setLoading(false);
    }, [a2fId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    async function handleSeed() {
        setSeeding(true);
        const res = await seedGrantManagementFromApplication(a2fId);
        setSeeding(false);
        if (res.success) {
            toast.success(res.message ?? "Grant management records seeded");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to seed records");
        }
    }

    async function handleSaveProcurement() {
        setSavingProcurement(true);
        const res = await saveProcurementItem(a2fId, procurementForm);
        setSavingProcurement(false);
        if (res.success) {
            toast.success(res.message ?? "Procurement item saved");
            setProcurementForm(EMPTY_PROCUREMENT);
            loadData();
        } else {
            toast.error(res.error ?? "Failed to save procurement item");
        }
    }

    async function handleSaveMilestone() {
        setSavingMilestone(true);
        const res = await saveGrantMilestone(a2fId, milestoneForm);
        setSavingMilestone(false);
        if (res.success) {
            toast.success(res.message ?? "Grant milestone saved");
            setMilestoneForm(EMPTY_MILESTONE);
            loadData();
        } else {
            toast.error(res.error ?? "Failed to save grant milestone");
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <Skeleton className="h-8 w-72" />
                <Skeleton className="h-28" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const biz = workspace?.pipeline?.application?.business;
    const procurementItems = workspace?.procurementItems ?? [];
    const milestones = workspace?.milestones ?? [];
    const approvedAppraisal = workspace?.pipeline?.investmentAppraisals?.find((item: { icDecision?: string | null }) => item.icDecision === "approved" || item.icDecision === "approved_with_conditions");

    const verifiedCount = milestones.filter((m: { status: string }) => m.status === "verified").length;
    const deliveredCount = procurementItems.filter((p: { procurementStatus: string }) => p.procurementStatus === "delivered" || p.procurementStatus === "verified").length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardText weight="duotone" className="size-5 text-emerald-700" />
                    Grant management
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Procurement, milestones, and implementation monitoring after IC approval.
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle className="text-base">Approved Grant Controls</CardTitle>
                            <CardDescription>
                                Track CAPEX procurement, supplier evidence, tranche milestones, verification documents, and reporting notes.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={approvedAppraisal ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                                {approvedAppraisal ? "IC Approved" : "Awaiting IC Approval"}
                            </Badge>
                            {workspace?.agreement && (
                                <Badge variant="outline">
                                    Agreement {workspace.agreement.isFullyExecuted ? "Executed" : "Pending Signature"}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={handleSeed} disabled={seeding} variant="outline" className="gap-2">
                        <Sparkle className="size-4" />
                        {seeding ? "Seeding..." : "Seed From MG Application"}
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                        <Link href={`/a2f/${a2fId}/disbursements`}>
                            <Path className="size-4" /> Disbursement Ledger
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="flex gap-2 border-b pb-2">
                {([
                    ["procurement", "Procurement"],
                    ["milestones", "Milestones"],
                    ["summary", "Summary"],
                ] as const).map(([key, label]) => (
                    <Button
                        key={key}
                        type="button"
                        variant={activeTab === key ? "default" : "ghost"}
                        size="sm"
                        className={activeTab === key ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                        onClick={() => setActiveTab(key)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            {activeTab === "summary" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs text-muted-foreground">Procurement items</p>
                            <p className="text-2xl font-bold">{procurementItems.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">{deliveredCount} delivered / verified</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs text-muted-foreground">Grant milestones</p>
                            <p className="text-2xl font-bold">{milestones.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">{verifiedCount} verified for disbursement</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs text-muted-foreground">Agreement</p>
                            <p className="text-sm font-semibold mt-1">
                                {workspace?.agreement?.isFullyExecuted ? "Executed" : workspace?.agreement ? "Pending signature" : "Not generated"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className={activeTab === "summary" ? "hidden" : "space-y-6"}>
                <Card className={activeTab !== "procurement" ? "hidden" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="size-5 text-blue-700" /> Procurement Items
                        </CardTitle>
                        <CardDescription>Supplier, quote, purchase, delivery, and verification tracking for approved CAPEX.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <ProcurementForm
                            value={procurementForm}
                            onChange={setProcurementForm}
                            onSave={handleSaveProcurement}
                            saving={savingProcurement}
                        />
                        <Separator />
                        <div className="space-y-3">
                            {procurementItems.length ? procurementItems.map((item) => (
                                <div key={item.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{item.itemName}</p>
                                            <p className="text-xs text-muted-foreground">{item.supplierName ?? "Supplier not selected"}</p>
                                        </div>
                                        <Badge variant="outline">{formatStatus(item.procurementStatus)}</Badge>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                        <Info label="Quote" value={fmt(item.selectedQuoteAmount)} />
                                        <Info label="BIRE" value={fmt(item.bireContributionAmount)} />
                                        <Info label="Enterprise" value={fmt(item.enterpriseContributionAmount)} />
                                    </div>
                                    {item.notes && <p className="mt-3 text-xs text-muted-foreground">{item.notes}</p>}
                                    <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => setProcurementForm(toProcurementInput(item))}>
                                        Edit
                                    </Button>
                                </div>
                            )) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No procurement items yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className={activeTab !== "milestones" ? "hidden" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Path className="size-5 text-emerald-700" /> Milestones & Monitoring
                        </CardTitle>
                        <CardDescription>Implementation milestones, tranche readiness, issues, corrective actions, and verification evidence.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <MilestoneForm
                            value={milestoneForm}
                            onChange={setMilestoneForm}
                            onSave={handleSaveMilestone}
                            saving={savingMilestone}
                        />
                        <Separator />
                        <div className="space-y-3">
                            {milestones.length ? milestones.map((item) => (
                                <div key={item.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{item.milestoneName}</p>
                                            <p className="text-xs text-muted-foreground">{item.trancheLabel ?? "No tranche label"}</p>
                                        </div>
                                        <Badge variant="outline">{formatStatus(item.status)}</Badge>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <Info label="Planned" value={item.plannedCompletionDate ?? "Not set"} />
                                        <Info label="Actual" value={item.actualCompletionDate ?? "Not set"} />
                                    </div>
                                    {item.evidenceUrl && (
                                        <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-700 hover:underline">
                                            View evidence
                                        </a>
                                    )}
                                    {(item.issues || item.correctiveActions) && (
                                        <p className="mt-3 text-xs text-muted-foreground">{item.issues ?? item.correctiveActions}</p>
                                    )}
                                    <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => setMilestoneForm(toMilestoneInput(item))}>
                                        Edit
                                    </Button>
                                </div>
                            )) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No milestones yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ProcurementForm({
    value,
    onChange,
    onSave,
    saving,
}: {
    value: ProcurementItemInput;
    onChange: (value: ProcurementItemInput) => void;
    onSave: () => void;
    saving: boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextField label="Item" value={value.itemName} onChange={(itemName) => onChange({ ...value, itemName })} />
                <TextField label="Supplier" value={value.supplierName ?? ""} onChange={(supplierName) => onChange({ ...value, supplierName })} />
                <TextField label="Category" value={value.category ?? ""} onChange={(category) => onChange({ ...value, category })} />
                <SelectField label="Status" value={value.procurementStatus ?? "planned"} options={PROCUREMENT_STATUSES} onChange={(procurementStatus) => onChange({ ...value, procurementStatus: procurementStatus as ProcurementStatus })} />
                <NumberField label="Quote Amount" value={value.selectedQuoteAmount ?? 0} onChange={(selectedQuoteAmount) => onChange({ ...value, selectedQuoteAmount })} />
                <NumberField label="BIRE Contribution" value={value.bireContributionAmount ?? 0} onChange={(bireContributionAmount) => onChange({ ...value, bireContributionAmount })} />
                <NumberField label="Enterprise Contribution" value={value.enterpriseContributionAmount ?? 0} onChange={(enterpriseContributionAmount) => onChange({ ...value, enterpriseContributionAmount })} />
                <TextField label="Verification URL" value={value.verificationDocumentUrl ?? ""} onChange={(verificationDocumentUrl) => onChange({ ...value, verificationDocumentUrl })} />
            </div>
            <LongField label="Notes" value={value.notes ?? ""} onChange={(notes) => onChange({ ...value, notes })} />
            <Button onClick={onSave} disabled={saving} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
                <FloppyDisk className="size-4" /> {saving ? "Saving..." : value.id ? "Update Procurement Item" : "Add Procurement Item"}
            </Button>
        </div>
    );
}

function MilestoneForm({
    value,
    onChange,
    onSave,
    saving,
}: {
    value: GrantMilestoneInput;
    onChange: (value: GrantMilestoneInput) => void;
    onSave: () => void;
    saving: boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TextField label="Milestone" value={value.milestoneName} onChange={(milestoneName) => onChange({ ...value, milestoneName })} />
                <TextField label="Tranche" value={value.trancheLabel ?? ""} onChange={(trancheLabel) => onChange({ ...value, trancheLabel })} />
                <TextField label="Planned Date" type="date" value={value.plannedCompletionDate ?? ""} onChange={(plannedCompletionDate) => onChange({ ...value, plannedCompletionDate })} />
                <TextField label="Actual Date" type="date" value={value.actualCompletionDate ?? ""} onChange={(actualCompletionDate) => onChange({ ...value, actualCompletionDate })} />
                <SelectField label="Status" value={value.status ?? "planned"} options={MILESTONE_STATUSES} onChange={(status) => onChange({ ...value, status: status as GrantMilestoneStatus })} />
                <TextField label="Evidence URL" value={value.evidenceUrl ?? ""} onChange={(evidenceUrl) => onChange({ ...value, evidenceUrl })} />
            </div>
            <LongField label="Verification Method" value={value.verificationMethod ?? ""} onChange={(verificationMethod) => onChange({ ...value, verificationMethod })} />
            <LongField label="Issues / Corrective Actions" value={[value.issues, value.correctiveActions].filter(Boolean).join("\n")} onChange={(issues) => onChange({ ...value, issues })} />
            <Button onClick={onSave} disabled={saving} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
                <Plus className="size-4" /> {saving ? "Saving..." : value.id ? "Update Milestone" : "Add Milestone"}
            </Button>
        </div>
    );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Input type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        </div>
    );
}

function LongField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>{formatStatus(option)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
        </div>
    );
}

function fmt(value: string | number | null | undefined) {
    return `KES ${Number(value ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

function formatStatus(status: string) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toProcurementInput(item: ProcurementItemInput & { selectedQuoteAmount?: string | number | null; bireContributionAmount?: string | number | null; enterpriseContributionAmount?: string | number | null }): ProcurementItemInput {
    return {
        ...item,
        selectedQuoteAmount: Number(item.selectedQuoteAmount ?? 0),
        bireContributionAmount: Number(item.bireContributionAmount ?? 0),
        enterpriseContributionAmount: Number(item.enterpriseContributionAmount ?? 0),
        procurementStatus: item.procurementStatus ?? "planned",
    };
}

function toMilestoneInput(item: GrantMilestoneInput): GrantMilestoneInput {
    return {
        ...item,
        plannedCompletionDate: item.plannedCompletionDate ? String(item.plannedCompletionDate) : "",
        actualCompletionDate: item.actualCompletionDate ? String(item.actualCompletionDate) : "",
        status: item.status ?? "planned",
    };
}
