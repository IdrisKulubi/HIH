"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Spinner, Gavel } from "@phosphor-icons/react";
import { toast } from "sonner";

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    initialScore?: number | null;
    initialNotes?: string | null;
    initialDecision?: "approved" | "rejected" | null; // For final reviewer
    isFinalReviewer?: boolean; // If true, shows approve/reject buttons
    onSubmit: (data: { score: number; notes: string; decision?: "approved" | "rejected" }) => Promise<void>;
}

export function EvaluationModal({
    isOpen,
    onClose,
    title,
    description,
    initialScore,
    initialNotes,
    initialDecision,
    isFinalReviewer = false,
    onSubmit,
}: EvaluationModalProps) {
    const [score, setScore] = useState<number>(initialScore || 70);
    const [notes, setNotes] = useState<string>(initialNotes || "");
    const [decision, setDecision] = useState<"approved" | "rejected">(initialDecision || "approved");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setScore(initialScore || 70);
            setNotes(initialNotes || "");
            setDecision(initialDecision || "approved");
        }
    }, [isOpen, initialScore, initialNotes, initialDecision]);

    const handleSubmit = async () => {
        if (!notes.trim()) {
            toast.error("Please provide evaluation notes");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                score,
                notes,
                decision: isFinalReviewer ? decision : undefined
            });
            onClose();
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getScoreColor = (s: number) => {
        if (s >= 70) return "text-green-600";
        if (s >= 50) return "text-amber-600";
        return "text-red-600";
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-gray-200/50 shadow-2xl rounded-2xl p-0 gap-0 overflow-hidden">

                {/* Header with Glass Effect */}
                <div className="bg-gray-50/50 p-6 border-b border-gray-100">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Gavel size={20} weight="fill" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
                                {description && <DialogDescription className="text-gray-500 mt-1">{description}</DialogDescription>}
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Score Input Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">Total Score</Label>
                            <span className={`text-2xl font-bold font-mono ${getScoreColor(score)}`}>
                                {score}<span className="text-base text-gray-400 font-normal">/100</span>
                            </span>
                        </div>

                        <div className="pt-2">
                            <Slider
                                defaultValue={[score]}
                                value={[score]}
                                max={100}
                                step={1}
                                onValueChange={(vals) => setScore(vals[0])}
                                className="py-4 cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>0</span>
                                <span>50</span>
                                <span>100</span>
                            </div>
                        </div>
                    </div>

                    {/* Final Decision Section (Only for R2) */}
                    {isFinalReviewer && (
                        <div className="space-y-3 pt-2">
                            <Label className="text-sm font-medium text-gray-700">Final Decision</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDecision("approved")}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${decision === "approved"
                                            ? "bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <CheckCircle size={20} weight={decision === "approved" ? "fill" : "regular"} />
                                    <span className="font-medium">Approve</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDecision("rejected")}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${decision === "rejected"
                                            ? "bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <XCircle size={20} weight={decision === "rejected" ? "fill" : "regular"} />
                                    <span className="font-medium">Reject</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Evaluation Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter detailed feedback and justification for the score..."
                            className="min-h-[120px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-gray-50/50 text-gray-800"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl border-gray-200 hover:bg-gray-100 hover:text-gray-900">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-xl bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/10 min-w-[100px]"
                    >
                        {isSubmitting ? (
                            <Spinner className="animate-spin h-4 w-4" />
                        ) : (
                            "Submit Review"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
