"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    submitReviewer1Review,
    submitReviewer2Review,
    lockApplication,
    getReviewStatus,
} from "@/lib/actions";
import { toast } from "sonner";
import {
    User,
    UserCheck,
    ShieldCheck,
    Lock,
    CheckCircle,
    XCircle,
    Clock,
    Warning,
    Spinner,
} from "@phosphor-icons/react";
import { useEffect } from "react";

interface TwoTierReviewPanelProps {
    applicationId: number;
    currentStatus: string;
    isAdmin?: boolean;
}

interface ReviewStatus {
    applicationStatus: string;
    reviewer1: {
        id: string;
        name: string | null | undefined;
        score: number | null;
        notes: string | null;
        reviewedAt: string | undefined;
    } | null;
    reviewer2: {
        id: string;
        name: string | null | undefined;
        score: number | null;
        notes: string | null;
        reviewedAt: string | undefined;
        overrodeReviewer1: boolean | null;
    } | null;
    isLocked: boolean;
    lockedBy: string | null | undefined;
    lockedAt: string | null | undefined;
    lockReason: string | null | undefined;
    finalScore: number | null;
    isEligible: boolean | null;
}

export function TwoTierReviewPanel({
    applicationId,
    currentStatus,
    isAdmin = false,
}: TwoTierReviewPanelProps) {
    const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Reviewer 1 form state
    const [r1Score, setR1Score] = useState<number>(70);
    const [r1Notes, setR1Notes] = useState("");

    // Reviewer 2 form state
    const [r2Score, setR2Score] = useState<number>(70);
    const [r2Notes, setR2Notes] = useState("");
    const [r2Decision, setR2Decision] = useState<"approved" | "rejected">("approved");

    // Lock form state
    const [lockReason, setLockReason] = useState("");

    // Fetch review status
    useEffect(() => {
        async function fetchStatus() {
            try {
                const result = await getReviewStatus(applicationId);
                if (result.success && result.data) {
                    setReviewStatus(result.data);
                    if (result.data.reviewer1?.score) {
                        setR2Score(result.data.reviewer1.score);
                    }
                }
            } catch (error) {
                console.error("Error fetching review status:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStatus();
    }, [applicationId]);

    // Handle Reviewer 1 submission
    const handleR1Submit = async () => {
        setSubmitting(true);
        try {
            const result = await submitReviewer1Review({
                applicationId,
                score: r1Score,
                notes: r1Notes,
            });

            if (result.success) {
                toast.success(result.message);
                // Refresh status
                const updated = await getReviewStatus(applicationId);
                if (updated.success && updated.data) {
                    setReviewStatus(updated.data);
                }
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Reviewer 2 submission
    const handleR2Submit = async () => {
        setSubmitting(true);
        try {
            const result = await submitReviewer2Review({
                applicationId,
                score: r2Score,
                notes: r2Notes,
                finalDecision: r2Decision,
                overrideReviewer1: r2Score !== reviewStatus?.reviewer1?.score,
            });

            if (result.success) {
                toast.success(result.message);
                // Refresh status
                const updated = await getReviewStatus(applicationId);
                if (updated.success && updated.data) {
                    setReviewStatus(updated.data);
                }
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit senior review");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Lock
    const handleLock = async () => {
        setSubmitting(true);
        try {
            const result = await lockApplication({
                applicationId,
                reason: lockReason,
            });

            if (result.success) {
                toast.success(result.message);
                // Refresh status
                const updated = await getReviewStatus(applicationId);
                if (updated.success && updated.data) {
                    setReviewStatus(updated.data);
                }
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to lock application");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] bg-white rounded-xl">
                <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
                    <Spinner className="h-6 w-6 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        );
    }

    // Determine which panel to show
    const canReview1 = currentStatus === "submitted" || currentStatus === "under_review";
    const canReview2 = currentStatus === "pending_senior_review" && isAdmin;
    const isComplete = currentStatus === "approved" || currentStatus === "rejected";
    const isLocked = reviewStatus?.isLocked ?? false;

    return (
        <Card className="border-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] bg-white rounded-xl">
            <CardHeader className="bg-white border-b border-gray-100 rounded-t-xl pb-4">
                <CardTitle className="flex items-center gap-2.5 text-gray-900">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" weight="fill" />
                    Two-Tier Review System
                </CardTitle>
                <CardDescription className="text-gray-500">
                    Initial review → Senior review → Final decision
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {/* Status Banner */}
                {isLocked && (
                    <Alert className="border-red-100 bg-red-50 rounded-lg">
                        <Lock className="h-4 w-4 text-red-600" weight="fill" />
                        <AlertDescription className="text-red-800 ml-2">
                            <span className="font-semibold">Application Locked.</span> No further modifications allowed.
                            {reviewStatus?.lockReason && (
                                <span className="block text-sm mt-1 text-red-700/80">Reason: {reviewStatus.lockReason}</span>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Review Progress */}
                <div className="flex items-center gap-4 px-2">
                    <div className={`flex items-center gap-3 ${reviewStatus?.reviewer1 ? "text-green-700" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2.5 transition-colors ${reviewStatus?.reviewer1 ? "bg-green-100" : "bg-gray-100"}`}>
                            <User className="h-4 w-4" weight={reviewStatus?.reviewer1 ? "fill" : "regular"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">Reviewer 1</span>
                            {reviewStatus?.reviewer1 && <span className="text-[10px] uppercase font-bold text-green-600 tracking-wide">Complete</span>}
                        </div>
                    </div>

                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${reviewStatus?.reviewer2 ? "bg-green-500 w-full" :
                                reviewStatus?.reviewer1 ? "bg-blue-500 w-1/2" : "w-0"
                                }`}
                        />
                    </div>

                    <div className={`flex items-center gap-3 ${reviewStatus?.reviewer2 ? "text-green-700" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2.5 transition-colors ${reviewStatus?.reviewer2 ? "bg-green-100" : "bg-gray-100"}`}>
                            <UserCheck className="h-4 w-4" weight={reviewStatus?.reviewer2 ? "fill" : "regular"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">Reviewer 2</span>
                            {reviewStatus?.reviewer2 && <span className="text-[10px] uppercase font-bold text-green-600 tracking-wide">Complete</span>}
                        </div>
                    </div>

                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${isLocked ? "bg-red-500 w-full" :
                                isComplete ? "bg-green-500 w-full" : "w-0"
                                }`}
                        />
                    </div>

                    <div className={`flex items-center gap-3 ${isLocked ? "text-red-700" : isComplete ? "text-green-700" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2.5 transition-colors ${isLocked ? "bg-red-100" : isComplete ? "bg-green-100" : "bg-gray-100"}`}>
                            <Lock className="h-4 w-4" weight={isLocked || isComplete ? "fill" : "regular"} />
                        </div>
                        <span className="text-sm font-semibold">Final</span>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Reviewer 1 Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2.5 text-base">
                        <div className="bg-blue-50 p-1.5 rounded-md">
                            <User className="h-4 w-4 text-blue-600" weight="fill" />
                        </div>
                        Reviewer 1 - Initial Review
                    </h3>

                    {reviewStatus?.reviewer1 ? (
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-800/60 block mb-1">Reviewer</span>
                                    <span className="text-sm font-medium text-gray-900">{reviewStatus.reviewer1.name}</span>
                                </div>
                                <Badge className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                                    Score: {reviewStatus.reviewer1.score}/100
                                </Badge>
                            </div>
                            {reviewStatus.reviewer1.notes && (
                                <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Notes</span>
                                    <p className="text-sm text-gray-700 leading-relaxed">{reviewStatus.reviewer1.notes}</p>
                                </div>
                            )}
                            {reviewStatus.reviewer1.reviewedAt && (
                                <p className="text-xs text-blue-800/50 pt-2 border-t border-blue-100/50 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Reviewed: {new Date(reviewStatus.reviewer1.reviewedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    ) : canReview1 && !isLocked ? (
                        <div className="space-y-6 bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Score (0-100)</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={r1Score}
                                        onChange={(e) => setR1Score(parseInt(e.target.value) || 0)}
                                        className="w-32 bg-white"
                                    />
                                    <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-md">Pass mark: 70</span>
                                </div>

                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Review Notes</Label>
                                <Textarea
                                    value={r1Notes}
                                    onChange={(e) => setR1Notes(e.target.value)}
                                    placeholder="Enter your comprehensive review notes..."
                                    rows={4}
                                    className="resize-none bg-white"
                                />
                            </div>
                            <Button
                                onClick={handleR1Submit}
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            >
                                {submitting ? (
                                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" weight="fill" />
                                )}
                                Submit Initial Review
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 rounded-xl p-8 text-center border dashed border-gray-200">
                            <Clock className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500 font-medium">Awaiting initial review</p>
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Reviewer 2 Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2.5 text-base">
                        <div className="bg-purple-50 p-1.5 rounded-md">
                            <UserCheck className="h-4 w-4 text-purple-600" weight="fill" />
                        </div>
                        Reviewer 2 - Senior Review
                    </h3>

                    {reviewStatus?.reviewer2 ? (
                        <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-800/60 block mb-1">Reviewer</span>
                                    <span className="text-sm font-medium text-gray-900">{reviewStatus.reviewer2.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-purple-100 text-purple-700 border-0 px-3 py-1">
                                        Score: {reviewStatus.reviewer2.score}/100
                                    </Badge>
                                    {reviewStatus.reviewer2.overrodeReviewer1 && (
                                        <Badge className="bg-amber-100 text-amber-700 border-0 px-2.5 py-1">
                                            <Warning className="h-3.5 w-3.5 mr-1.5" weight="fill" />
                                            R1 Override
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            {reviewStatus.reviewer2.notes && (
                                <div className="bg-white/60 p-3 rounded-lg border border-purple-100/50">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Notes</span>
                                    <p className="text-sm text-gray-700 leading-relaxed">{reviewStatus.reviewer2.notes}</p>
                                </div>
                            )}
                            {reviewStatus.reviewer2.reviewedAt && (
                                <p className="text-xs text-purple-800/50 pt-2 border-t border-purple-100/50 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Reviewed: {new Date(reviewStatus.reviewer2.reviewedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    ) : canReview2 && !isLocked ? (
                        <div className="space-y-6 bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Score (0-100)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={r2Score}
                                    onChange={(e) => setR2Score(parseInt(e.target.value) || 0)}
                                    className="w-32 bg-white"
                                />
                                {reviewStatus?.reviewer1?.score !== r2Score && (
                                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                                        <Warning className="h-3.5 w-3.5" weight="fill" />
                                        Score differs from Reviewer 1 ({reviewStatus?.reviewer1?.score})
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Final Decision</Label>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant={r2Decision === "approved" ? "default" : "outline"}
                                        onClick={() => setR2Decision("approved")}
                                        className={`flex-1 ${r2Decision === "approved"
                                            ? "bg-green-600 hover:bg-green-700 text-white shadow-sm ring-0"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" weight={r2Decision === "approved" ? "fill" : "regular"} />
                                        Approve
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={r2Decision === "rejected" ? "default" : "outline"}
                                        onClick={() => setR2Decision("rejected")}
                                        className={`flex-1 ${r2Decision === "rejected"
                                            ? "bg-red-600 hover:bg-red-700 text-white shadow-sm ring-0"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" weight={r2Decision === "rejected" ? "fill" : "regular"} />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Senior Review Notes</Label>
                                <Textarea
                                    value={r2Notes}
                                    onChange={(e) => setR2Notes(e.target.value)}
                                    placeholder="Enter your final review notes..."
                                    rows={4}
                                    className="resize-none bg-white"
                                />
                            </div>
                            <Button
                                onClick={handleR2Submit}
                                disabled={submitting}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-11"
                            >
                                {submitting ? (
                                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4 mr-2" weight="fill" />
                                )}
                                Submit Senior Review & Finalize
                            </Button>
                        </div>
                    ) : !reviewStatus?.reviewer1 ? (
                        <div className="bg-gray-50/50 rounded-xl p-8 text-center border dashed border-gray-200">
                            <Clock className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500 font-medium">Awaiting initial review first</p>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 rounded-xl p-8 text-center border dashed border-gray-200">
                            <ShieldCheck className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500 font-medium">Senior review required (Admin only)</p>
                        </div>
                    )}
                </div>

                {/* Lock Section */}
                {isAdmin && isComplete && !isLocked && (
                    <>
                        <div className="h-px bg-gray-100" />
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2.5 text-base">
                                <div className="bg-red-50 p-1.5 rounded-md">
                                    <Lock className="h-4 w-4 text-red-600" weight="fill" />
                                </div>
                                Lock Application
                            </h3>
                            <div className="bg-red-50/50 rounded-xl p-6 border border-red-100 space-y-4">
                                <p className="text-sm text-red-700 font-medium">
                                    Locking prevents any further modifications to this application.
                                </p>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">Lock Reason (optional)</Label>
                                    <Textarea
                                        value={lockReason}
                                        onChange={(e) => setLockReason(e.target.value)}
                                        placeholder="Enter reason for locking..."
                                        rows={2}
                                        className="bg-white border-red-200 focus-visible:ring-red-500"
                                    />
                                </div>
                                <Button
                                    onClick={handleLock}
                                    disabled={submitting}
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700 shadow-sm"
                                >
                                    {submitting ? (
                                        <Spinner className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Lock className="h-4 w-4 mr-2" weight="fill" />
                                    )}
                                    Lock Application
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Final Result */}
                {isComplete && (
                    <div className={`rounded-xl p-6 border ${currentStatus === "approved"
                        ? "bg-green-50/50 border-green-200"
                        : "bg-red-50/50 border-red-200"
                        }`}>
                        <div className="flex items-center gap-4">
                            {currentStatus === "approved" ? (
                                <div className="bg-green-100 p-3 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-600" weight="fill" />
                                </div>
                            ) : (
                                <div className="bg-red-100 p-3 rounded-full">
                                    <XCircle className="h-8 w-8 text-red-600" weight="fill" />
                                </div>
                            )}
                            <div>
                                <h4 className={`text-lg font-bold mb-1 ${currentStatus === "approved" ? "text-green-800" : "text-red-800"
                                    }`}>
                                    Application {currentStatus === "approved" ? "Approved" : "Rejected"}
                                </h4>
                                <p className="text-sm text-gray-600 font-medium">
                                    Final Score: {reviewStatus?.finalScore}/100
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
