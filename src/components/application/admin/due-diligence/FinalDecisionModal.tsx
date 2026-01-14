"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Info } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface FinalDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (verdict: 'pass' | 'fail', reason: string) => Promise<void>;
    isSaving: boolean;
    existingVerdict?: 'pass' | 'fail' | null;
    existingReason?: string | null;
}

export function FinalDecisionModal({
    isOpen,
    onClose,
    onConfirm,
    isSaving,
    existingVerdict,
    existingReason
}: FinalDecisionModalProps) {
    const [verdict, setVerdict] = useState<'pass' | 'fail'>(existingVerdict || 'pass');
    const [reason, setReason] = useState(existingReason || "");

    // Reset state when modal opens with new existing data
    React.useEffect(() => {
        if (isOpen) {
            setVerdict(existingVerdict || 'pass');
            setReason(existingReason || "");
        }
    }, [isOpen, existingVerdict, existingReason]);

    const handleConfirm = async () => {
        if (!reason || reason.trim().length < 10) return;
        await onConfirm(verdict, reason);
    };

    const isReasonValid = reason.trim().length >= 10;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl rounded-3xl p-0 overflow-hidden">
                <div className={cn(
                    "h-2 w-full",
                    verdict === 'pass' ? "bg-emerald-500" : "bg-red-500"
                )} />

                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                            Final Due Diligence Verdict
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Provide your final decision and justification for this application's due diligence review.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8">
                        {/* Verdict Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setVerdict('pass')}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
                                    verdict === 'pass'
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                <CheckCircle weight={verdict === 'pass' ? "fill" : "regular"} className="w-10 h-10" />
                                <span className="font-bold text-lg">PASS</span>
                            </button>

                            <button
                                onClick={() => setVerdict('fail')}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
                                    verdict === 'fail'
                                        ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                <XCircle weight={verdict === 'fail' ? "fill" : "regular"} className="w-10 h-10" />
                                <span className="font-bold text-lg">FAIL</span>
                            </button>
                        </div>

                        {/* Reason Textarea */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Justification Reason
                                </label>
                                <span className={cn(
                                    "text-xs px-2 py-1 rounded-md font-bold",
                                    isReasonValid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                )}>
                                    {reason.length} / 10 min chars
                                </span>
                            </div>
                            <Textarea
                                placeholder="Explain the reasons for this verdict (e.g., findings during physical visit, documentation issues, etc.)"
                                className="min-h-[150px] bg-slate-50 border-slate-200 rounded-2xl p-4 text-slate-900 focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                            {!isReasonValid && reason.length > 0 && (
                                <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                                    <Info className="w-3.5 h-3.5" />
                                    Reason is too short for a final decision.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-10 sm:justify-end gap-3 px-0 pb-0">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl h-12 px-6 font-semibold text-slate-500 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!isReasonValid || isSaving}
                            className={cn(
                                "rounded-xl h-12 px-8 font-bold shadow-lg transition-all",
                                verdict === 'pass'
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                                    : "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                            )}
                        >
                            {isSaving ? "Saving Decision..." : "Confirm Decision"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
