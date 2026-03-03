"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { getGrantAgreement } from "@/lib/actions/a2f-contracts";
import {
    action_logDisbursement,
    verifyTransaction,
    getDisbursementLedger,
    getAmortizationSchedule,
    type LogTransactionInput,
    type AmortizationSchedule,
} from "@/lib/actions/a2f-disbursements";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft, CurrencyDollar, Plus, CheckCircle, XCircle,
    Warning, ArrowDown, ArrowUp, CalendarBlank, Receipt,
    Handshake, Lock, Clock, SealCheck,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(amount: string | number | null | undefined) {
    return `KES ${Number(amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function statusBadge(status: string) {
    if (status === "verified")
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><SealCheck className="size-3" />Verified</Badge>;
    if (status === "rejected")
        return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="size-3" />Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="size-3" />Pending</Badge>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMORTIZATION TABLE
// ─────────────────────────────────────────────────────────────────────────────

function AmortizationTable({ schedule }: { schedule: AmortizationSchedule }) {
    const [showAll, setShowAll] = useState(false);
    const rows = showAll ? schedule.schedule : schedule.schedule.slice(0, 12);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarBlank weight="duotone" className="size-5 text-violet-600" />
                        Amortization Schedule
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Principal: <strong>{fmt(schedule.principal)}</strong></span>
                        <span>Rate: <strong>{schedule.interestRatePa}% p.a.</strong></span>
                        <span>EMI: <strong>{fmt(schedule.monthlyInstalment)}</strong></span>
                    </div>
                </div>
                <CardDescription>
                    {schedule.termMonths}-month schedule · {schedule.gracePeriodMonths}-month grace · Total repayable: {fmt(schedule.totalRepayable)}
                    (interest: {fmt(schedule.totalInterest)})
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="text-xs">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Opening Bal.</TableHead>
                                <TableHead className="text-right">Principal</TableHead>
                                <TableHead className="text-right">Interest</TableHead>
                                <TableHead className="text-right">Total Due</TableHead>
                                <TableHead className="text-right">Closing Bal.</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow
                                    key={row.month}
                                    className={
                                        row.isOverdue  ? "bg-red-50 hover:bg-red-100" :
                                        row.isPaid     ? "bg-emerald-50/60 hover:bg-emerald-50" :
                                        row.isGracePeriod ? "bg-blue-50/40" :
                                        ""
                                    }
                                >
                                    <TableCell className="font-mono text-xs text-muted-foreground">{row.month}</TableCell>
                                    <TableCell className="text-xs font-medium">
                                        {format(new Date(row.dueDate), "dd MMM yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{fmt(row.openingBalance)}</TableCell>
                                    <TableCell className="text-right text-xs">
                                        {row.isGracePeriod ? <span className="text-muted-foreground">—</span> : fmt(row.principalPayment)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{fmt(row.interestPayment)}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold">{fmt(row.totalPayment)}</TableCell>
                                    <TableCell className="text-right text-xs">{fmt(row.closingBalance)}</TableCell>
                                    <TableCell className="text-center">
                                        {row.isOverdue ? (
                                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] gap-0.5">
                                                <Warning weight="fill" className="size-2.5" />Overdue
                                            </Badge>
                                        ) : row.isPaid ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-0.5">
                                                <CheckCircle weight="fill" className="size-2.5" />Paid
                                            </Badge>
                                        ) : row.isGracePeriod ? (
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Grace</Badge>
                                        ) : (
                                            <Badge className="bg-muted text-muted-foreground border text-[10px]">Upcoming</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {schedule.schedule.length > 12 && (
                    <div className="flex justify-center py-3 border-t">
                        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs gap-1">
                            {showAll ? "Show less" : `Show all ${schedule.schedule.length} months`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION LEDGER
// ─────────────────────────────────────────────────────────────────────────────

function TransactionLedger({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions,
    onVerify,
    verifying,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
    onVerify: (id: number, action: "verified" | "rejected") => void;
    verifying: number | null;
}) {
    if (!transactions.length) {
        return (
            <div className="text-center py-12 text-muted-foreground text-sm">
                <Receipt className="size-10 mx-auto mb-3 opacity-30" />
                <p>No transactions logged yet.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="text-xs">
                        <TableHead>Ref</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx: {
                        id: number;
                        transactionType: string;
                        transactionDate: string | Date;
                        amount: string | number;
                        proofDocumentUrl: string | null;
                        status: string;
                        notes: string | null;
                        rejectionReason: string | null;
                    }) => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                                TXN-{String(tx.id).padStart(6, "0")}
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    tx.transactionType === "disbursement"
                                        ? "text-blue-700"
                                        : "text-emerald-700"
                                }`}>
                                    {tx.transactionType === "disbursement"
                                        ? <ArrowDown className="size-3" />
                                        : <ArrowUp className="size-3" />
                                    }
                                    {tx.transactionType === "disbursement" ? "Disbursement" : "Repayment"}
                                </span>
                            </TableCell>
                            <TableCell className="text-xs">
                                {format(new Date(tx.transactionDate), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                                {fmt(tx.amount)}
                            </TableCell>
                            <TableCell>
                                {tx.proofDocumentUrl ? (
                                    <a
                                        href={tx.proofDocumentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        View
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </TableCell>
                            <TableCell>{statusBadge(tx.status)}</TableCell>
                            <TableCell>
                                {tx.status === "pending" && (
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 px-2 gap-0.5"
                                            disabled={verifying === tx.id}
                                            onClick={() => onVerify(tx.id, "verified")}
                                        >
                                            <CheckCircle className="size-3" /> Verify
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 px-2 gap-0.5"
                                            disabled={verifying === tx.id}
                                            onClick={() => onVerify(tx.id, "rejected")}
                                        >
                                            <XCircle className="size-3" /> Reject
                                        </Button>
                                    </div>
                                )}
                                {tx.status === "rejected" && tx.rejectionReason && (
                                    <p className="text-[10px] text-red-600 max-w-[120px] truncate" title={tx.rejectionReason}>
                                        {tx.rejectionReason}
                                    </p>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DisbursementsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const a2fId = Number(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [agreement, setAgreement] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [ledger, setLedger] = useState<any>(null);
    const [amortization, setAmortization] = useState<AmortizationSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);

    // Log transaction form
    const [showLogDialog, setShowLogDialog] = useState(false);
    const [txType, setTxType] = useState<"disbursement" | "repayment">("disbursement");
    const [txAmount, setTxAmount] = useState("");
    const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
    const [txProofUrl, setTxProofUrl] = useState("");
    const [txNotes, setTxNotes] = useState("");
    const [logging, setLogging] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const agreementRes = await getGrantAgreement(a2fId);
        if (agreementRes.success && agreementRes.data) {
            const agr = agreementRes.data;
            setAgreement(agr);

            const [ledgerRes, amortRes] = await Promise.all([
                getDisbursementLedger(agr.id),
                agr.agreementType === "repayable" ? getAmortizationSchedule(agr.id) : Promise.resolve(null),
            ]);

            if (ledgerRes.success) setLedger(ledgerRes.data);
            if (amortRes && "success" in amortRes && amortRes.success && amortRes.data) {
                setAmortization(amortRes.data as AmortizationSchedule);
            }
        }
        setLoading(false);
    }, [a2fId]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleLogTransaction() {
        if (!txAmount || parseFloat(txAmount) <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }
        setLogging(true);
        const input: LogTransactionInput = {
            transactionType: txType,
            amount: parseFloat(txAmount),
            transactionDate: new Date(txDate),
            proofDocumentUrl: txProofUrl.trim() || undefined,
            notes: txNotes.trim() || undefined,
        };
        const res = await action_logDisbursement(agreement.id, input);
        setLogging(false);
        if (res.success) {
            toast.success(res.message ?? "Transaction logged");
            setShowLogDialog(false);
            setTxAmount(""); setTxProofUrl(""); setTxNotes("");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to log transaction");
        }
    }

    async function handleVerify(txId: number, action: "verified" | "rejected") {
        setVerifying(txId);
        const rejectionReason = action === "rejected"
            ? window.prompt("Enter rejection reason:") ?? undefined
            : undefined;
        if (action === "rejected" && !rejectionReason?.trim()) {
            setVerifying(null);
            return;
        }
        const res = await verifyTransaction(txId, action, rejectionReason);
        setVerifying(null);
        if (res.success) {
            toast.success(res.message ?? "Transaction updated");
            loadData();
        } else {
            toast.error(res.error ?? "Failed to update transaction");
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
                <Skeleton className="h-8 w-56" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (!agreement) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
                <div className="rounded-xl border border-dashed p-12">
                    <Lock className="size-10 mx-auto mb-4 text-muted-foreground/40" />
                    <h2 className="text-lg font-semibold mb-2">No Grant Agreement Yet</h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        A signed grant agreement is required before disbursements can be logged. Generate and execute the agreement first.
                    </p>
                    <Button asChild variant="outline" className="gap-1.5">
                        <Link href={`/a2f/${a2fId}/contracts`}>
                            <Handshake className="size-4" /> Go to Contracts
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const summary = ledger?.summary ?? { totalDisbursed: 0, totalRepaid: 0, pendingCount: 0 };
    const outstanding = Math.max(0, summary.totalDisbursed - summary.totalRepaid);
    const isRepayable = agreement.agreementType === "repayable";

    // Overdue count from amortization
    const overdueCount = amortization?.schedule.filter(r => r.isOverdue).length ?? 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={`/a2f/${a2fId}`}>
                        <ArrowLeft className="size-4" /> Entry Overview
                    </Link>
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CurrencyDollar weight="duotone" className="size-5 text-amber-600 shrink-0" />
                    <h1 className="text-lg font-bold">Financial Tracking Dashboard</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge className={
                        isRepayable
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                    }>
                        {isRepayable ? "Repayable Grant" : agreement.agreementType === "matching" ? "Matching Grant" : "Working Capital"}
                    </Badge>
                    {!agreement.isFullyExecuted && (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1">
                            <Lock className="size-3" /> Not Executed
                        </Badge>
                    )}
                </div>
            </div>

            {/* ── Overdue warning ── */}
            {overdueCount > 0 && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 flex items-center gap-3">
                    <Warning weight="fill" className="size-5 text-red-600 shrink-0" />
                    <p className="text-sm font-semibold text-red-900">
                        {overdueCount} instalment{overdueCount > 1 ? "s" : ""} overdue
                        <span className="font-normal text-red-700 ml-1.5">— payments were due by the 15th of the respective month.</span>
                    </p>
                </div>
            )}

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                    label="Total Approved"
                    value={fmt(agreement.hihContribution)}
                    color="emerald"
                />
                <SummaryCard
                    label="Total Disbursed"
                    value={fmt(summary.totalDisbursed)}
                    color="blue"
                />
                <SummaryCard
                    label={isRepayable ? "Total Repaid" : "Receipts Verified"}
                    value={fmt(summary.totalRepaid)}
                    color="violet"
                />
                <SummaryCard
                    label="Outstanding Balance"
                    value={fmt(outstanding)}
                    color={outstanding > 0 ? "amber" : "emerald"}
                    badge={summary.pendingCount > 0 ? `${summary.pendingCount} pending` : undefined}
                />
            </div>

            {/* ── Log Transaction button ── */}
            <div className="flex justify-end mb-4">
                <Button
                    onClick={() => setShowLogDialog(true)}
                    disabled={!agreement.isFullyExecuted}
                    className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus weight="bold" className="size-4" />
                    Log Transaction
                </Button>
            </div>

            {/* ── Transaction Ledger ── */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Receipt weight="duotone" className="size-5 text-muted-foreground" />
                        Transaction Ledger
                    </CardTitle>
                    <CardDescription>
                        All disbursements and repayments for this agreement. Pending transactions require admin verification.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <TransactionLedger
                        transactions={ledger?.transactions ?? []}
                        onVerify={handleVerify}
                        verifying={verifying}
                    />
                </CardContent>
            </Card>

            {/* ── Amortization Schedule (Repayable only) ── */}
            {isRepayable && amortization && (
                <AmortizationTable schedule={amortization} />
            )}

            {/* ── Working Capital Accountability note ── */}
            {!isRepayable && (
                <Card className="border-dashed">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Receipt weight="duotone" className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Accountability Portal</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    For Matching / Working Capital grants, enterprises upload expenditure receipts as proof of utilisation.
                                    Use the <strong>Log Transaction</strong> button above to record repayments or verified receipts, then verify each one.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── DIALOG: Log Transaction ── */}
            <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CurrencyDollar weight="duotone" className="size-5 text-amber-600" />
                            Log Transaction
                        </DialogTitle>
                        <DialogDescription>
                            Record a disbursement or repayment for this grant agreement. All transactions are pending until verified by an admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Transaction Type</Label>
                                <Select value={txType} onValueChange={v => setTxType(v as "disbursement" | "repayment")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="disbursement">Disbursement</SelectItem>
                                        <SelectItem value="repayment">Repayment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Amount (KES)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 500000"
                                    value={txAmount}
                                    onChange={e => setTxAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Transaction Date</Label>
                            <Input
                                type="date"
                                value={txDate}
                                onChange={e => setTxDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Proof Document URL <span className="text-muted-foreground">(optional)</span></Label>
                            <Input
                                placeholder="https://utfs.io/f/receipt_abc123..."
                                value={txProofUrl}
                                onChange={e => setTxProofUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                rows={2}
                                placeholder="e.g. First tranche disbursement per approved work plan..."
                                value={txNotes}
                                onChange={e => setTxNotes(e.target.value)}
                                className="resize-none text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
                        <Button onClick={handleLogTransaction} disabled={logging} className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
                            <Plus weight="bold" className="size-4" />
                            {logging ? "Saving..." : "Log Transaction"}
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

function SummaryCard({
    label, value, color, badge,
}: {
    label: string;
    value: string;
    color: "emerald" | "blue" | "violet" | "amber";
    badge?: string;
}) {
    const bg: Record<string, string> = {
        emerald: "bg-emerald-50 border-emerald-100",
        blue:    "bg-blue-50 border-blue-100",
        violet:  "bg-violet-50 border-violet-100",
        amber:   "bg-amber-50 border-amber-100",
    };
    const text: Record<string, string> = {
        emerald: "text-emerald-700",
        blue:    "text-blue-700",
        violet:  "text-violet-700",
        amber:   "text-amber-700",
    };

    return (
        <div className={`rounded-xl border p-4 ${bg[color]}`}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-lg font-bold ${text[color]}`}>{value}</p>
            {badge && (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">{badge}</span>
            )}
        </div>
    );
}
