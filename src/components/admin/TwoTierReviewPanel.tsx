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
    UserIcon,
    UserCheckIcon,
    ShieldIcon,
    LockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    WarningIcon,
    SpinnerGapIcon,
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
            <Card className="border-0 shadow-lg">
                <CardContent className="p-8 flex items-center justify-center">
                    <SpinnerGapIcon className="h-8 w-8 animate-spin text-blue-600" />
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
        <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                    <ShieldIcon className="h-5 w-5" />
                    Two-Tier Review System
                </CardTitle>
                <CardDescription className="text-indigo-100">
                    Initial review → Senior review → Final decision
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Status Banner */}
                {isLocked && (
                    <Alert className="border-red-200 bg-red-50">
                        <LockIcon className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            This application is locked. No further modifications allowed.
                            {reviewStatus?.lockReason && (
                                <span className="block text-sm mt-1">Reason: {reviewStatus.lockReason}</span>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Review Progress */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${reviewStatus?.reviewer1 ? "text-green-600" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2 ${reviewStatus?.reviewer1 ? "bg-green-100" : "bg-gray-100"}`}>
                            <UserIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Reviewer 1</span>
                        {reviewStatus?.reviewer1 && <CheckCircleIcon className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 h-1 bg-gray-200 rounded">
                        <div
                            className={`h-full rounded transition-all ${reviewStatus?.reviewer2 ? "bg-green-500 w-full" :
                                reviewStatus?.reviewer1 ? "bg-blue-500 w-1/2" : "w-0"
                                }`}
                        />
                    </div>

                    <div className={`flex items-center gap-2 ${reviewStatus?.reviewer2 ? "text-green-600" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2 ${reviewStatus?.reviewer2 ? "bg-green-100" : "bg-gray-100"}`}>
                            <UserCheckIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Reviewer 2</span>
                        {reviewStatus?.reviewer2 && <CheckCircleIcon className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 h-1 bg-gray-200 rounded">
                        <div
                            className={`h-full rounded transition-all ${isLocked ? "bg-red-500 w-full" :
                                isComplete ? "bg-green-500 w-full" : "w-0"
                                }`}
                        />
                    </div>

                    <div className={`flex items-center gap-2 ${isLocked ? "text-red-600" : isComplete ? "text-green-600" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2 ${isLocked ? "bg-red-100" : isComplete ? "bg-green-100" : "bg-gray-100"}`}>
                            <LockIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Final</span>
                    </div>
                </div>

                <Separator />

                {/* Reviewer 1 Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                        Reviewer 1 - Initial Review
                    </h3>

                    {reviewStatus?.reviewer1 ? (
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Reviewer: {reviewStatus.reviewer1.name}</span>
                                <Badge className="bg-blue-100 text-blue-800">
                                    Score: {reviewStatus.reviewer1.score}/100
                                </Badge>
                            </div>
                            {reviewStatus.reviewer1.notes && (
                                <p className="text-sm text-gray-700">{reviewStatus.reviewer1.notes}</p>
                            )}
                            {reviewStatus.reviewer1.reviewedAt && (
                                <p className="text-xs text-gray-500">
                                    Reviewed: {new Date(reviewStatus.reviewer1.reviewedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    ) : canReview1 && !isLocked ? (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                            <div className="space-y-2">
                                <Label>Score (0-100)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={r1Score}
                                    onChange={(e) => setR1Score(parseInt(e.target.value) || 0)}
                                    className="w-32"
                                />
                                <p className="text-xs text-gray-500">Pass mark: 70</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Review Notes</Label>
                                <Textarea
                                    value={r1Notes}
                                    onChange={(e) => setR1Notes(e.target.value)}
                                    placeholder="Enter your review notes..."
                                    rows={3}
                                />
                            </div>
                            <Button
                                onClick={handleR1Submit}
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {submitting ? (
                                    <SpinnerGapIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                )}
                                Submit Initial Review
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                            <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Awaiting initial review</p>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Reviewer 2 Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <UserCheckIcon className="h-5 w-5 text-purple-600" />
                        Reviewer 2 - Senior Review
                    </h3>

                    {reviewStatus?.reviewer2 ? (
                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Reviewer: {reviewStatus.reviewer2.name}</span>
                                <div className="flex gap-2">
                                    <Badge className="bg-purple-100 text-purple-800">
                                        Score: {reviewStatus.reviewer2.score}/100
                                    </Badge>
                                    {reviewStatus.reviewer2.overrodeReviewer1 && (
                                        <Badge className="bg-amber-100 text-amber-800">
                                            <WarningIcon className="h-3 w-3 mr-1" />
                                            R1 Override
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            {reviewStatus.reviewer2.notes && (
                                <p className="text-sm text-gray-700">{reviewStatus.reviewer2.notes}</p>
                            )}
                            {reviewStatus.reviewer2.reviewedAt && (
                                <p className="text-xs text-gray-500">
                                    Reviewed: {new Date(reviewStatus.reviewer2.reviewedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    ) : canReview2 && !isLocked ? (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                            <div className="space-y-2">
                                <Label>Score (0-100)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={r2Score}
                                    onChange={(e) => setR2Score(parseInt(e.target.value) || 0)}
                                    className="w-32"
                                />
                                {reviewStatus?.reviewer1?.score !== r2Score && (
                                    <p className="text-xs text-amber-600">
                                        ⚠️ This differs from Reviewer 1&apos;s score ({reviewStatus?.reviewer1?.score})
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Final Decision</Label>
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant={r2Decision === "approved" ? "default" : "outline"}
                                        onClick={() => setR2Decision("approved")}
                                        className={r2Decision === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={r2Decision === "rejected" ? "default" : "outline"}
                                        onClick={() => setR2Decision("rejected")}
                                        className={r2Decision === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                                    >
                                        <XCircleIcon className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Senior Review Notes</Label>
                                <Textarea
                                    value={r2Notes}
                                    onChange={(e) => setR2Notes(e.target.value)}
                                    placeholder="Enter your review notes..."
                                    rows={3}
                                />
                            </div>
                            <Button
                                onClick={handleR2Submit}
                                disabled={submitting}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {submitting ? (
                                    <SpinnerGapIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <ShieldIcon className="h-4 w-4 mr-2" />
                                )}
                                Submit Senior Review & Finalize
                            </Button>
                        </div>
                    ) : !reviewStatus?.reviewer1 ? (
                        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                            <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Awaiting initial review first</p>
                        </div>
                    ) : (
                        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                            <ShieldIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Senior review required (Admin only)</p>
                        </div>
                    )}
                </div>

                {/* Lock Section */}
                {isAdmin && isComplete && !isLocked && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <LockIcon className="h-5 w-5 text-red-600" />
                                Lock Application
                            </h3>
                            <div className="bg-red-50 rounded-lg p-4 space-y-4">
                                <p className="text-sm text-red-700">
                                    Locking prevents any further modifications to this application.
                                </p>
                                <div className="space-y-2">
                                    <Label>Lock Reason (optional)</Label>
                                    <Textarea
                                        value={lockReason}
                                        onChange={(e) => setLockReason(e.target.value)}
                                        placeholder="Enter reason for locking..."
                                        rows={2}
                                    />
                                </div>
                                <Button
                                    onClick={handleLock}
                                    disabled={submitting}
                                    variant="destructive"
                                >
                                    {submitting ? (
                                        <SpinnerGapIcon className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <LockIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Lock Application
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Final Result */}
                {isComplete && (
                    <div className={`rounded-lg p-4 ${currentStatus === "approved"
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                        }`}>
                        <div className="flex items-center gap-3">
                            {currentStatus === "approved" ? (
                                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                            ) : (
                                <XCircleIcon className="h-8 w-8 text-red-600" />
                            )}
                            <div>
                                <h4 className={`font-semibold ${currentStatus === "approved" ? "text-green-800" : "text-red-800"
                                    }`}>
                                    Application {currentStatus === "approved" ? "Approved" : "Rejected"}
                                </h4>
                                <p className="text-sm text-gray-600">
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
