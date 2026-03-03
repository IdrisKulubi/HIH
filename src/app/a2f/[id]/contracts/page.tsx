"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import {
    action_generateContract,
    sendOfferLetter,
    recordSignedContract,
    getGrantAgreement,
    type A2fAgreementType,
    type GrantAgreementInput,
} from "@/lib/actions/a2f-contracts";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    ArrowLeft, Handshake, FilePdf, PaperPlaneTilt, CheckCircle,
    Clock, Signature, Warning, Buildings, ArrowRight, DownloadSimple,
    Link as LinkIcon, SealCheck,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ContractWorkflowState =
    | "no_agreement"
    | "generated"
    | "offer_sent"
    | "signed";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function workflowState(agreement: { isFullyExecuted: boolean; offerSentAt: string | Date | null } | null): ContractWorkflowState {
    if (!agreement) return "no_agreement";
    if (agreement.isFullyExecuted) return "signed";
    if (agreement.offerSentAt) return "offer_sent";
    return "generated";
}

const WORKFLOW_STEPS: Array<{ key: ContractWorkflowState; label: string; icon: React.ElementType }> = [
    { key: "no_agreement", label: "Generate Agreement",  icon: FilePdf },
    { key: "generated",    label: "Send Offer Letter",   icon: PaperPlaneTilt },
    { key: "offer_sent",   label: "Awaiting Signature",  icon: Signature },
    { key: "signed",       label: "Fully Executed",       icon: SealCheck },
];

function fmt(amount: string | number | null | undefined) {
    return `KES ${Number(amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Generate Contract Form
// ─────────────────────────────────────────────────────────────────────────────

function GenerateContractStep({
    instrumentType,
    onSuccess,
}: {
    instrumentType: "repayable_grant" | "matching_grant";
    onSuccess: () => void;
}) {
    const defaultType: A2fAgreementType =
        instrumentType === "repayable_grant" ? "repayable" : "matching";

    const [agreementType, setAgreementType] = useState<A2fAgreementType>(defaultType);
    const [totalProject, setTotalProject] = useState("");
    const [hihContrib, setHihContrib] = useState("");
    const [entContrib, setEntContrib] = useState("");
    const [termMonths, setTermMonths] = useState("24");
    const [interestRate, setInterestRate] = useState("6");
    const [gracePeriod, setGracePeriod] = useState("3");
    const [saving, setSaving] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleGenerate = async (a2fId: number) => {
        if (!totalProject || !hihContrib) {
            toast.error("Total project amount and HiH contribution are required");
            return;
        }
        setSaving(true);
        const input: GrantAgreementInput = {
            agreementType,
            totalProjectAmount: parseFloat(totalProject),
            hihContribution: parseFloat(hihContrib),
            enterpriseContribution: entContrib ? parseFloat(entContrib) : undefined,
            termMonths: agreementType === "repayable" ? parseInt(termMonths) : undefined,
            interestRate: agreementType === "repayable" ? parseFloat(interestRate) : undefined,
            gracePeriodMonths: agreementType === "repayable" ? parseInt(gracePeriod) : undefined,
        };
        const res = await action_generateContract(a2fId, input);
        setSaving(false);
        if (res.success) {
            toast.success(res.message ?? "Grant agreement created");
            onSuccess();
        } else {
            toast.error(res.error ?? "Failed to generate agreement");
        }
    };

    return { agreementType, setAgreementType, totalProject, setTotalProject, hihContrib, setHihContrib, entContrib, setEntContrib, termMonths, setTermMonths, interestRate, setInterestRate, gracePeriod, setGracePeriod, saving, handleGenerate };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ContractsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entry, setEntry] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [agreement, setAgreement] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Generate form state
    const [agreementType, setAgreementType] = useState<A2fAgreementType>("matching");
    const [totalProject, setTotalProject] = useState("");
    const [hihContrib, setHihContrib] = useState("");
    const [entContrib, setEntContrib] = useState("");
    const [termMonths, setTermMonths] = useState("24");
    const [interestRate, setInterestRate] = useState("6");
    const [gracePeriod, setGracePeriod] = useState("3");
    const [generating, setGenerating] = useState(false);

    // Send offer letter state
    const [offerLetterUrl, setOfferLetterUrl] = useState("");
    const [sending, setSending] = useState(false);
    const [showSendDialog, setShowSendDialog] = useState(false);

    // Upload signed contract state
    const [signedUrl, setSignedUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showSignDialog, setShowSignDialog] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [entryRes, agreementRes] = await Promise.all([
            getA2fPipelineEntry(a2fId),
            getGrantAgreement(a2fId),
        ]);
        if (entryRes.success) {
            setEntry(entryRes.data);
            const instrType: A2fAgreementType =
                entryRes.data?.instrumentType === "repayable_grant" ? "repayable" : "matching";
            setAgreementType(instrType);
        }
        if (agreementRes.success) setAgreement(agreementRes.data ?? null);
        setLoading(false);
    }, [a2fId]);

    useEffect(() => { loadData(); }, [loadData]);

    const wfState = workflowState(agreement);
    const currentStepIdx = WORKFLOW_STEPS.findIndex(s => s.key === wfState);

    // ── Generate Agreement ──
    async function handleGenerate() {
        if (!totalProject || !hihContrib) {
            toast.error("Total project amount and HiH contribution are required");
            return;
        }
        setGenerating(true);
        const input: GrantAgreementInput = {
            agreementType,
            totalProjectAmount: parseFloat(totalProject),
            hihContribution: parseFloat(hihContrib),
            enterpriseContribution: entContrib ? parseFloat(entContrib) : undefined,
            termMonths: agreementType === "repayable" ? parseInt(termMonths) : undefined,
            interestRate: agreementType === "repayable" ? parseFloat(interestRate) : undefined,
            gracePeriodMonths: agreementType === "repayable" ? parseInt(gracePeriod) : undefined,
        };
        const res = await action_generateContract(a2fId, input);
        setGenerating(false);
        if (res.success) {
            toast.success(res.message ?? "Grant agreement created");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to generate agreement");
        }
    }

    // ── Send Offer Letter ──
    async function handleSendOffer() {
        if (!offerLetterUrl.trim()) {
            toast.error("Please enter the offer letter URL");
            return;
        }
        setSending(true);
        const res = await sendOfferLetter(agreement.id, offerLetterUrl.trim());
        setSending(false);
        if (res.success) {
            toast.success(res.message ?? "Offer letter sent");
            setShowSendDialog(false);
            setOfferLetterUrl("");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to send offer letter");
        }
    }

    // ── Record Signed Contract ──
    async function handleRecordSigned() {
        if (!signedUrl.trim()) {
            toast.error("Please enter the signed document URL");
            return;
        }
        setUploading(true);
        const res = await recordSignedContract(agreement.id, signedUrl.trim());
        setUploading(false);
        if (res.success) {
            toast.success(res.message ?? "Signed contract recorded");
            setShowSignDialog(false);
            setSignedUrl("");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to record signed contract");
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    const biz = entry?.application?.business;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> Entry Overview
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Handshake weight="duotone" className="size-5 text-emerald-600 shrink-0" />
                    <h1 className="text-lg font-bold">Contracting & E-Signature Portal</h1>
                </div>
                {biz && (
                    <Badge className="gap-1.5 shrink-0">
                        <Buildings weight="fill" className="size-3" />
                        {biz.name}
                    </Badge>
                )}
            </div>

            {/* ── Workflow progress ── */}
            <Card className="mb-6">
                <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between">
                        {WORKFLOW_STEPS.map((step, idx) => {
                            const isDone    = idx < currentStepIdx;
                            const isCurrent = idx === currentStepIdx;
                            const StepIcon  = step.icon;
                            return (
                                <div key={step.key} className="flex flex-1 items-center">
                                    <div className="flex flex-col items-center gap-1.5 flex-1">
                                        <div className={`size-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                            isDone    ? "bg-emerald-500 border-emerald-500 text-white" :
                                            isCurrent ? "bg-white border-emerald-500 text-emerald-600" :
                                                        "bg-muted border-muted-foreground/20 text-muted-foreground"
                                        }`}>
                                            {isDone
                                                ? <CheckCircle weight="fill" className="size-5" />
                                                : <StepIcon weight="duotone" className="size-4" />
                                            }
                                        </div>
                                        <span className={`text-[11px] font-medium text-center leading-tight max-w-[80px] ${
                                            isCurrent ? "text-emerald-700" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"
                                        }`}>{step.label}</span>
                                    </div>
                                    {idx < WORKFLOW_STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mb-5 mx-1 rounded-full ${isDone ? "bg-emerald-400" : "bg-muted"}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* ── STEP 1: No Agreement — Generate form ── */}
            {wfState === "no_agreement" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FilePdf weight="duotone" className="size-5 text-blue-600" />
                            Generate Grant Agreement
                        </CardTitle>
                        <CardDescription>
                            Enter the financial terms and generate the agreement record for this enterprise.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Agreement Type */}
                            <div className="space-y-1.5">
                                <Label>Agreement Type</Label>
                                <Select value={agreementType} onValueChange={v => setAgreementType(v as A2fAgreementType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="matching">Matching Grant Agreement</SelectItem>
                                        <SelectItem value="repayable">Repayable Grant Agreement</SelectItem>
                                        <SelectItem value="working_capital">Working Capital Agreement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Total Project Amount */}
                            <div className="space-y-1.5">
                                <Label>Total Project Amount (KES)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 2000000"
                                    value={totalProject}
                                    onChange={e => setTotalProject(e.target.value)}
                                />
                            </div>

                            {/* HiH Contribution */}
                            <div className="space-y-1.5">
                                <Label>HiH Contribution (KES)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 1000000"
                                    value={hihContrib}
                                    onChange={e => setHihContrib(e.target.value)}
                                />
                            </div>

                            {/* Enterprise Contribution (Matching only) */}
                            {agreementType === "matching" && (
                                <div className="space-y-1.5">
                                    <Label>Enterprise Co-Contribution (KES)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 1000000"
                                        value={entContrib}
                                        onChange={e => setEntContrib(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Repayable terms */}
                            {agreementType === "repayable" && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label>Term (months)</Label>
                                        <Input
                                            type="number"
                                            value={termMonths}
                                            onChange={e => setTermMonths(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Interest Rate (% p.a.)</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={interestRate}
                                            onChange={e => setInterestRate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Grace Period (months)</Label>
                                        <Input
                                            type="number"
                                            value={gracePeriod}
                                            onChange={e => setGracePeriod(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Preview of template variables */}
                        {totalProject && hihContrib && (
                            <div className="rounded-lg bg-muted/60 p-4 text-xs space-y-1 text-muted-foreground">
                                <p className="font-semibold text-foreground text-sm mb-2">Agreement Preview</p>
                                <p>Enterprise: <span className="font-medium text-foreground">{biz?.name}</span></p>
                                <p>Total Project: <span className="font-medium text-foreground">{fmt(totalProject)}</span></p>
                                <p>HiH Contribution: <span className="font-medium text-foreground">{fmt(hihContrib)}</span></p>
                                {agreementType === "matching" && entContrib && (
                                    <p>Enterprise Contribution: <span className="font-medium text-foreground">{fmt(entContrib)}</span></p>
                                )}
                                {agreementType === "repayable" && (
                                    <>
                                        <p>Term: <span className="font-medium text-foreground">{termMonths} months</span></p>
                                        <p>Interest Rate: <span className="font-medium text-foreground">{interestRate}% p.a.</span></p>
                                        <p>Grace Period: <span className="font-medium text-foreground">{gracePeriod} months (interest-only)</span></p>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleGenerate} disabled={generating} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
                                <FilePdf className="size-4" />
                                {generating ? "Generating..." : "Generate Agreement"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── STEP 2: Generated — Show terms + send offer letter ── */}
            {(wfState === "generated" || wfState === "offer_sent" || wfState === "signed") && agreement && (
                <div className="space-y-4">
                    {/* Agreement Terms Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Handshake weight="duotone" className="size-5 text-emerald-600" />
                                    Grant Agreement Terms
                                </CardTitle>
                                <Badge className={
                                    wfState === "signed"     ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                    wfState === "offer_sent" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    "bg-amber-100 text-amber-700 border-amber-200"
                                }>
                                    {wfState === "signed"     ? "Fully Executed" :
                                     wfState === "offer_sent" ? "Awaiting Signature" :
                                     "Pending Offer Dispatch"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <InfoRow label="Agreement Type"    value={agreement.agreementType === "repayable" ? "Repayable Grant" : agreement.agreementType === "matching" ? "Matching Grant" : "Working Capital"} />
                                <InfoRow label="Total Project"     value={fmt(agreement.totalProjectAmount)} />
                                <InfoRow label="HiH Contribution"  value={fmt(agreement.hihContribution)} />
                                {parseFloat(agreement.enterpriseContribution ?? "0") > 0 && (
                                    <InfoRow label="Enterprise Contribution" value={fmt(agreement.enterpriseContribution)} />
                                )}
                                {agreement.agreementType === "repayable" && (
                                    <>
                                        <InfoRow label="Term"         value={`${agreement.termMonths ?? 24} months`} />
                                        <InfoRow label="Interest Rate" value={`${agreement.interestRate ?? "6.0"}% p.a.`} />
                                        <InfoRow label="Grace Period"  value={`${agreement.gracePeriodMonths ?? 3} months`} />
                                    </>
                                )}
                                {agreement.offerSentAt && (
                                    <InfoRow label="Offer Sent"  value={format(new Date(agreement.offerSentAt), "dd MMM yyyy, HH:mm")} />
                                )}
                                {agreement.signedAt && (
                                    <InfoRow label="Signed On"  value={format(new Date(agreement.signedAt), "dd MMM yyyy, HH:mm")} />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Offer Letter Card */}
                    {wfState === "generated" && (
                        <Card className="border-blue-200 bg-blue-50/40">
                            <CardContent className="pt-5 pb-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-blue-100 p-2">
                                            <PaperPlaneTilt weight="duotone" className="size-5 text-blue-700" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-blue-900">Next Step: Send Offer Letter</p>
                                            <p className="text-sm text-blue-700 mt-0.5">
                                                Upload the generated offer letter PDF to your file store (UploadThing / Drive), then paste the URL below to send it to the applicant via email.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowSendDialog(true)}
                                        className="shrink-0 bg-blue-700 hover:bg-blue-800 gap-1.5"
                                    >
                                        <PaperPlaneTilt className="size-4" />
                                        Send Offer Letter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Awaiting Signature Card */}
                    {wfState === "offer_sent" && (
                        <Card className="border-amber-200 bg-amber-50/40">
                            <CardContent className="pt-5 pb-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-amber-100 p-2">
                                            <Clock weight="duotone" className="size-5 text-amber-700" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-amber-900">Awaiting Applicant Signature</p>
                                            <p className="text-sm text-amber-700 mt-0.5">
                                                The offer letter was emailed to the applicant. Once they sign and return it, record the signed document URL below.
                                            </p>
                                            {agreement.offerLetterUrl && (
                                                <a
                                                    href={agreement.offerLetterUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline mt-1.5 font-medium"
                                                >
                                                    <DownloadSimple className="size-3" /> View Sent Offer Letter
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowSignDialog(true)}
                                        className="shrink-0 bg-amber-700 hover:bg-amber-800 gap-1.5"
                                    >
                                        <Signature className="size-4" />
                                        Record Signed Contract
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Fully Executed Card */}
                    {wfState === "signed" && (
                        <Card className="border-emerald-200 bg-emerald-50/50">
                            <CardContent className="pt-5 pb-5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-emerald-100 p-2">
                                        <SealCheck weight="duotone" className="size-5 text-emerald-700" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-emerald-900">Grant Agreement Fully Executed</p>
                                        <p className="text-sm text-emerald-700 mt-0.5">
                                            The agreement has been signed by the applicant. The pipeline has advanced to <strong>Disbursement Active</strong>. You may now log disbursements.
                                        </p>
                                        <div className="flex items-center gap-3 mt-3">
                                            {agreement.signedDocumentUrl && (
                                                <a
                                                    href={agreement.signedDocumentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                                                >
                                                    <DownloadSimple className="size-4" />
                                                    Download Signed Agreement
                                                </a>
                                            )}
                                            <Button asChild variant="outline" size="sm" className="gap-1.5">
                                                <Link href={`/a2f/${a2fId}/disbursements`}>
                                                    Go to Disbursements <ArrowRight className="size-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── DIALOG: Send Offer Letter ── */}
            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PaperPlaneTilt weight="duotone" className="size-5 text-blue-600" />
                            Send Offer Letter
                        </DialogTitle>
                        <DialogDescription>
                            Paste the URL of the generated offer letter PDF. An email will be sent to the applicant automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label>Offer Letter URL</Label>
                        <Input
                            placeholder="https://utfs.io/f/abc123..."
                            value={offerLetterUrl}
                            onChange={e => setOfferLetterUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <LinkIcon className="size-3" />
                            The applicant will receive this link via email from Resend.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
                        <Button onClick={handleSendOffer} disabled={sending} className="bg-blue-700 hover:bg-blue-800 gap-1.5">
                            <PaperPlaneTilt className="size-4" />
                            {sending ? "Sending..." : "Send Email"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── DIALOG: Record Signed Contract ── */}
            <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Signature weight="duotone" className="size-5 text-amber-600" />
                            Record Signed Agreement
                        </DialogTitle>
                        <DialogDescription>
                            Paste the URL of the applicant&apos;s signed and returned PDF. This will mark the agreement as fully executed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label>Signed Document URL</Label>
                        <Input
                            placeholder="https://utfs.io/f/signed_abc123..."
                            value={signedUrl}
                            onChange={e => setSignedUrl(e.target.value)}
                        />
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <Warning weight="fill" className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <p>Once submitted, the pipeline will advance to <strong>Disbursement Active</strong> and the applicant will gain access to the financial tracking portal.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSignDialog(false)}>Cancel</Button>
                        <Button onClick={handleRecordSigned} disabled={uploading} className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
                            <SealCheck className="size-4" />
                            {uploading ? "Saving..." : "Mark as Executed"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold mt-0.5">{value ?? "—"}</p>
        </div>
    );
}
