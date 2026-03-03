"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getApplicantContracts, recordSignedContract } from "@/lib/actions/a2f-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Handshake, DownloadSimple, Signature, SealCheck, Clock, Warning, Lock, CheckCircle,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined) {
    return `KES ${Number(v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function agreementLabel(type: string) {
    if (type === "repayable") return "Repayable Grant Agreement";
    if (type === "matching")  return "Matching Grant Agreement";
    return "Working Capital Agreement";
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function ApplicantContractsTab() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<number | null>(null);
    const [signedUrl, setSignedUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    async function loadContracts() {
        setLoading(true);
        const res = await getApplicantContracts();
        if (res.success) setContracts(res.data ?? []);
        setLoading(false);
    }

    useEffect(() => { loadContracts(); }, []);

    async function handleSubmitSigned() {
        if (!signedUrl.trim()) {
            toast.error("Please paste the URL of your signed document");
            return;
        }
        if (!selectedContract) return;
        setUploading(true);
        const res = await recordSignedContract(selectedContract, signedUrl.trim());
        setUploading(false);
        if (res.success) {
            toast.success("Signed agreement submitted successfully!");
            setSelectedContract(null);
            setSignedUrl("");
            loadContracts();
        } else {
            toast.error(res.error ?? "Submission failed");
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        );
    }

    if (!contracts.length) {
        return (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Contracts Yet</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Grant agreements will appear here once your application has been approved and
                    progressed through the A2F Investment Pipeline. You will receive an email notification.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {contracts.map((contract: {
                id: number;
                agreementType: string;
                hihContribution: string;
                enterpriseContribution: string | null;
                totalProjectAmount: string;
                termMonths: number | null;
                interestRate: string | null;
                gracePeriodMonths: number | null;
                isFullyExecuted: boolean;
                offerSentAt: string | Date | null;
                signedAt: string | Date | null;
                offerLetterUrl: string | null;
                signedDocumentUrl: string | null;
                pipelineStatus: string;
                instrumentType: string;
            }) => {
                const state = contract.isFullyExecuted
                    ? "signed"
                    : contract.offerSentAt
                        ? "awaiting_signature"
                        : "pending_offer";

                return (
                    <div key={contract.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <Handshake className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{agreementLabel(contract.agreementType)}</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        HiH Contribution: <span className="font-semibold text-slate-700">{fmt(contract.hihContribution)}</span>
                                    </p>
                                </div>
                            </div>
                            <Badge className={
                                state === "signed"             ? "bg-emerald-100 text-emerald-700 border-emerald-200 gap-1" :
                                state === "awaiting_signature" ? "bg-amber-100 text-amber-700 border-amber-200 gap-1" :
                                "bg-slate-100 text-slate-600 border-slate-200 gap-1"
                            }>
                                {state === "signed"             ? <><SealCheck weight="fill" className="size-3" /> Fully Executed</> :
                                 state === "awaiting_signature" ? <><Clock weight="fill" className="size-3" /> Awaiting Your Signature</> :
                                 <><Warning weight="fill" className="size-3" /> Offer Pending</>
                                }
                            </Badge>
                        </div>

                        {/* Terms grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5 bg-slate-50 rounded-xl p-4">
                            <TermRow label="Total Project" value={fmt(contract.totalProjectAmount)} />
                            <TermRow label="HiH Grant" value={fmt(contract.hihContribution)} />
                            {contract.enterpriseContribution && parseFloat(contract.enterpriseContribution) > 0 && (
                                <TermRow label="Your Contribution" value={fmt(contract.enterpriseContribution)} />
                            )}
                            {contract.agreementType === "repayable" && (
                                <>
                                    <TermRow label="Term" value={`${contract.termMonths ?? 24} months`} />
                                    <TermRow label="Interest Rate" value={`${contract.interestRate ?? "6.0"}% p.a.`} />
                                    <TermRow label="Grace Period" value={`${contract.gracePeriodMonths ?? 3} months`} />
                                </>
                            )}
                            {contract.offerSentAt && (
                                <TermRow label="Offer Sent" value={format(new Date(contract.offerSentAt), "dd MMM yyyy")} />
                            )}
                            {contract.signedAt && (
                                <TermRow label="Signed On" value={format(new Date(contract.signedAt), "dd MMM yyyy")} />
                            )}
                        </div>

                        {/* Action area */}
                        {state === "awaiting_signature" && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <Signature className="size-5 text-amber-700 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-amber-900 text-sm">Action Required: Sign & Return</p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Download your offer letter, print and sign it (or use an e-signature tool), then upload the signed PDF and paste the link below.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {contract.offerLetterUrl && (
                                        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs border-amber-300">
                                            <a href={contract.offerLetterUrl} target="_blank" rel="noreferrer">
                                                <DownloadSimple className="size-3.5" /> Download Offer Letter
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        className="gap-1.5 text-xs bg-amber-700 hover:bg-amber-800"
                                        onClick={() => setSelectedContract(contract.id)}
                                    >
                                        <Signature className="size-3.5" /> Submit Signed Copy
                                    </Button>
                                </div>
                            </div>
                        )}

                        {state === "signed" && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                                <CheckCircle weight="fill" className="size-5 text-emerald-600 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold text-emerald-900 text-sm">Agreement Fully Executed</p>
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                        Your signed agreement has been received. Funds will be disbursed in accordance with your approved work plan.
                                    </p>
                                </div>
                                {contract.signedDocumentUrl && (
                                    <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs border-emerald-300 shrink-0">
                                        <a href={contract.signedDocumentUrl} target="_blank" rel="noreferrer">
                                            <DownloadSimple className="size-3.5" /> Your Copy
                                        </a>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Upload signed contract dialog */}
            <Dialog open={!!selectedContract} onOpenChange={open => { if (!open) { setSelectedContract(null); setSignedUrl(""); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Signature className="size-5 text-amber-600" />
                            Submit Signed Agreement
                        </DialogTitle>
                        <DialogDescription>
                            Upload your signed agreement to a cloud storage service (Google Drive, Dropbox, etc.), then paste the shareable link below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label>Signed Document URL</Label>
                        <Input
                            placeholder="https://drive.google.com/file/d/..."
                            value={signedUrl}
                            onChange={e => setSignedUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Ensure the link is publicly accessible (view-only). Your A2F Officer will verify the document.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSelectedContract(null); setSignedUrl(""); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitSigned} disabled={uploading} className="bg-amber-700 hover:bg-amber-800 gap-1.5">
                            <SealCheck className="size-4" />
                            {uploading ? "Submitting..." : "Submit Signed Copy"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function TermRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
        </div>
    );
}
