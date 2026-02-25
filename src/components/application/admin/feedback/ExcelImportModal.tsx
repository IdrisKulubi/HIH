"use client";

import React, { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2,
    XCircle,
    Upload,
    FileSpreadsheet,
    Loader2,
    ArrowRight,
    ArrowLeft,
    Users,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { checkEmailsAgainstDb } from "@/lib/actions/feedback-emails";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckResult {
    email: string;
    inDb: boolean;
    userId?: string;
    name?: string;
}

interface ImportedRecipient {
    userId?: string;   // undefined for emails not in the DB
    email: string;
    name: string;
}

export interface ExcelImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRecipientsImported: (recipients: ImportedRecipient[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a workbook/CSV binary and return unique, valid email addresses. */
function extractEmailsFromFile(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                const emails = new Set<string>();

                workbook.SheetNames.forEach((sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
                        sheet,
                        { defval: "" }
                    );

                    if (rows.length === 0) return;

                    // Detect email columns (header contains "email")
                    const headers = Object.keys(rows[0] || {});
                    const emailCols = headers.filter((h) =>
                        h.toLowerCase().includes("email")
                    );

                    // Fall back to scanning every cell if no email header found
                    rows.forEach((row) => {
                        const colsToCheck =
                            emailCols.length > 0 ? emailCols : Object.keys(row);
                        colsToCheck.forEach((col) => {
                            const cellVal = String(row[col] ?? "").trim().toLowerCase();
                            if (EMAIL_REGEX.test(cellVal)) {
                                emails.add(cellVal);
                            }
                        });
                    });
                });

                resolve(Array.from(emails));
            } catch {
                reject(new Error("Failed to parse file. Please use .xlsx, .xls, or .csv."));
            }
        };

        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsArrayBuffer(file);
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "upload" | "review" | "confirm";

export function ExcelImportModal({
    open,
    onOpenChange,
    onRecipientsImported,
}: ExcelImportModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [results, setResults] = useState<CheckResult[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Reset on close ──────────────────────────────────────────────────────────
    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setStep("upload");
            setFileName("");
            setResults([]);
            setSelectedEmails(new Set());
        }
        onOpenChange(v);
    };

    // ── Process file ────────────────────────────────────────────────────────────
    const processFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setFileName(file.name);
        try {
            const emails = await extractEmailsFromFile(file);
            if (emails.length === 0) {
                toast.error("No valid email addresses found in this file.");
                setIsProcessing(false);
                return;
            }

            const res = await checkEmailsAgainstDb(emails);
            if (!res.success || !res.results) {
                toast.error(res.error || "Failed to check emails against database.");
                setIsProcessing(false);
                return;
            }

            setResults(res.results);
            // Pre-select ALL emails (found and not-found)
            const preSelected = new Set(res.results.map((r) => r.email));
            setSelectedEmails(preSelected);
            setStep("review");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // ── Drag & drop handlers ────────────────────────────────────────────────────
    const onDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = "";
    };

    // ── Toggle selection ────────────────────────────────────────────────────────
    const toggleEmail = (email: string) => {
        setSelectedEmails((prev) => {
            const next = new Set(prev);
            next.has(email) ? next.delete(email) : next.add(email);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedEmails.size === results.length) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(results.map((r) => r.email)));
        }
    };

    // ── Confirm import ──────────────────────────────────────────────────────────
    const handleConfirm = () => {
        const recipients: ImportedRecipient[] = results
            .filter((r) => selectedEmails.has(r.email))
            .map((r) => ({
                userId: r.userId,          // may be undefined for not-in-DB
                email: r.email,
                name: r.name ?? r.email,   // fall back to email as display name
            }));

        onRecipientsImported(recipients);
        toast.success(`${recipients.length} recipients added to campaign.`);
        handleOpenChange(false);
    };

    // ── Derived counts ──────────────────────────────────────────────────────────
    const foundCount = results.filter((r) => r.inDb).length;
    const notFoundCount = results.filter((r) => !r.inDb).length;
    const notFoundSelected = results.filter((r) => !r.inDb && selectedEmails.has(r.email)).length;

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-[#0B5FBA]/10 to-[#00D0AB]/10 p-2 rounded-lg">
                            <FileSpreadsheet className="h-5 w-5 text-[#0B5FBA]" />
                        </div>
                        <div>
                            <DialogTitle>Import Recipients from Excel</DialogTitle>
                            <DialogDescription>
                                Upload a spreadsheet to bulk-add email recipients
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mt-3">
                        {(["upload", "review", "confirm"] as Step[]).map((s, i) => (
                            <React.Fragment key={s}>
                                <div
                                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${step === s
                                        ? "bg-[#0B5FBA] text-white"
                                        : i < ["upload", "review", "confirm"].indexOf(step)
                                            ? "bg-[#00D0AB]/20 text-[#00D0AB]"
                                            : "bg-gray-100 text-gray-400"
                                        }`}
                                >
                                    <span>{i + 1}.</span>
                                    <span className="capitalize">{s}</span>
                                </div>
                                {i < 2 && <div className="h-px flex-1 bg-gray-200" />}
                            </React.Fragment>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col mt-2">
                    {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
                    {step === "upload" && (
                        <div className="flex flex-col items-center justify-center gap-4 py-6">
                            <div
                                onDrop={onDrop}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => inputRef.current?.click()}
                                className={`w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
                                    ? "border-[#0B5FBA] bg-[#0B5FBA]/5 scale-[1.01]"
                                    : "border-gray-200 hover:border-[#0B5FBA]/50 hover:bg-gray-50"
                                    }`}
                            >
                                {isProcessing ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-10 w-10 animate-spin text-[#0B5FBA]" />
                                        <p className="text-sm text-gray-600">
                                            Parsing file & checking database…
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Upload className="h-10 w-10 text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-700">
                                                Drop your file here or{" "}
                                                <span className="text-[#0B5FBA] underline">browse</span>
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Accepts .xlsx, .xls, .csv — any column containing
                                                &quot;email&quot; will be scanned
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={onInputChange}
                            />
                        </div>
                    )}

                    {/* ── STEP 2: Review ─────────────────────────────────────────────── */}
                    {step === "review" && (
                        <div className="flex flex-col gap-3" style={{ minHeight: 0 }}>
                            {/* Summary bar */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg flex-wrap shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                        {fileName}
                                    </span>
                                </div>
                                <Separator orientation="vertical" className="h-4" />
                                <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {foundCount} found in DB
                                </Badge>
                                {notFoundCount > 0 && (
                                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {notFoundCount} not in DB (can still select)
                                    </Badge>
                                )}
                            </div>

                            {/* Select All / Deselect All */}
                            <div className="flex items-center justify-between shrink-0">
                                <span className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-900">
                                        {selectedEmails.size}
                                    </span>{" "}
                                    of {results.length} selected
                                    {notFoundSelected > 0 && (
                                        <span className="text-amber-600 ml-1">
                                            ({notFoundSelected} not in DB)
                                        </span>
                                    )}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleAll}
                                >
                                    {selectedEmails.size === results.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </Button>
                            </div>

                            {/* Scrollable table — takes remaining height */}
                            <div className="overflow-auto rounded-md border" style={{ maxHeight: "340px" }}>
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white border-b z-10">
                                        <tr>
                                            <th className="w-10 px-4 py-2" />
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">
                                                Email
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">
                                                Name
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, i) => (
                                            <tr
                                                key={i}
                                                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => toggleEmail(r.email)}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <Checkbox
                                                        checked={selectedEmails.has(r.email)}
                                                        onCheckedChange={() => toggleEmail(r.email)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className={`px-4 py-2.5 font-mono text-xs ${r.inDb ? "text-gray-700" : "text-amber-700"
                                                    }`}>
                                                    {r.email}
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-700">
                                                    {r.name ?? <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {r.inDb ? (
                                                        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Found
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            Not in DB
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Navigation — always pinned below the scroll area */}
                            <div className="flex gap-2 pt-1 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => setStep("upload")}
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </Button>
                                <Button
                                    type="button"
                                    disabled={selectedEmails.size === 0}
                                    className="flex-1 bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] hover:from-[#0B5FBA]/90 hover:to-[#00D0AB]/90 gap-1"
                                    onClick={() => setStep("confirm")}
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Confirm ────────────────────────────────────────────── */}
                    {step === "confirm" && (
                        <div className="flex flex-col gap-6 py-4">
                            <div className="rounded-xl border bg-gradient-to-br from-[#0B5FBA]/5 to-[#00D0AB]/5 p-6 text-center">
                                <Users className="h-12 w-12 mx-auto text-[#0B5FBA] mb-3" />
                                <div className="text-4xl font-bold text-gray-900 mb-1">
                                    {selectedEmails.size}
                                </div>
                                <div className="text-gray-600">
                                    recipient{selectedEmails.size !== 1 ? "s" : ""} ready to add
                                </div>
                                <p className="text-xs text-gray-400 mt-3 max-w-sm mx-auto">
                                    These will be merged with any recipients you already have
                                    selected in the campaign composer. Duplicates are skipped
                                    automatically.
                                </p>
                            </div>

                            {notFoundSelected > 0 && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                        <strong>{notFoundSelected}</strong> selected email
                                        {notFoundSelected !== 1 ? "s" : ""} were not found in the
                                        applicant database — they will be added as external recipients.
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => setStep("review")}
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1 bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] hover:from-[#0B5FBA]/90 hover:to-[#00D0AB]/90 gap-1"
                                    onClick={handleConfirm}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Add {selectedEmails.size} Recipient
                                    {selectedEmails.size !== 1 ? "s" : ""} to Campaign
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
