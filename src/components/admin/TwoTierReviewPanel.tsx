"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
    lockApplication,
    getReviewStatus,
} from "@/lib/actions";
import { toast } from "sonner";
import {
    User,
    UserCheck,
    ShieldCheck,
    Lock,
    PencilSimple,
    ArrowRight,
    Spinner
} from "@phosphor-icons/react";

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

    // Lock Form
    const [lockReason, setLockReason] = useState("");
    const [locking, setLocking] = useState(false);

    // Fetch review status
    async function fetchStatus() {
        try {
            const result = await getReviewStatus(applicationId);
            if (result.success && result.data) {
                setReviewStatus(result.data);
            }
        } catch (error) {
            console.error("Error fetching review status:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStatus();
    }, [applicationId]);

    const handleLock = async () => {
        setLocking(true);
        try {
            const result = await lockApplication({
                applicationId,
                reason: lockReason,
            });

            if (result.success) {
                toast.success(result.message);
                fetchStatus();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to lock application");
        } finally {
            setLocking(false);
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

    // Determine state
    const canReview1 = currentStatus === "submitted" || currentStatus === "under_review";
    const canReview2 = currentStatus === "pending_senior_review" && isAdmin;
    const isComplete = currentStatus === "approved" || currentStatus === "rejected";
    const isLocked = reviewStatus?.isLocked ?? false;

    return (
        <Card className="border-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] bg-white rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center gap-2.5 text-gray-900 text-lg">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" weight="fill" />
                    Two-Tier Review
                </CardTitle>
                <CardDescription className="text-gray-500">
                    Workflow: Initial review → Senior review → Final decision
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {/* Locked Alert */}
                {isLocked && (
                    <Alert className="border-red-100 bg-red-50 rounded-lg">
                        <Lock className="h-4 w-4 text-red-600" weight="fill" />
                        <AlertDescription className="text-red-800 ml-2">
                            <span className="font-semibold">Application Locked.</span>
                            {reviewStatus?.lockReason && <span className="block text-sm mt-1 opacity-90">Reason: {reviewStatus.lockReason}</span>}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Review Progress Bar */}
                <div className="flex items-center gap-4 px-2">
                    {/* Step 1 */}
                    <div className={`flex items-center gap-3 ${reviewStatus?.reviewer1 ? "text-green-700" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2.5 transition-colors ${reviewStatus?.reviewer1 ? "bg-green-100" : "bg-gray-100"}`}>
                            <User className="h-4 w-4" weight={reviewStatus?.reviewer1 ? "fill" : "regular"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">Reviewer 1</span>
                            {reviewStatus?.reviewer1 && <span className="text-[10px] uppercase font-bold text-green-600 tracking-wide">Done</span>}
                        </div>
                    </div>

                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out ${reviewStatus?.reviewer1 ? "bg-green-500 w-full" : "w-0"}`} />
                    </div>

                    {/* Step 2 */}
                    <div className={`flex items-center gap-3 ${reviewStatus?.reviewer2 ? "text-green-700" : "text-gray-400"}`}>
                        <div className={`rounded-full p-2.5 transition-colors ${reviewStatus?.reviewer2 ? "bg-green-100" : "bg-gray-100"}`}>
                            <UserCheck className="h-4 w-4" weight={reviewStatus?.reviewer2 ? "fill" : "regular"} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">Reviewer 2</span>
                            {reviewStatus?.reviewer2 && <span className="text-[10px] uppercase font-bold text-green-600 tracking-wide">Done</span>}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Reviewer 1 Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2.5 text-base">
                            <div className="bg-blue-50 p-1.5 rounded-md">
                                <User className="h-4 w-4 text-blue-600" weight="fill" />
                            </div>
                            Initial Review
                        </h3>
                        {canReview1 && !isLocked && (
                            <Button
                                size="sm"
                                variant={reviewStatus?.reviewer1 ? "outline" : "default"}
                                asChild
                                className={reviewStatus?.reviewer1 ? "border-blue-200 text-blue-700 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}
                            >
                                <Link href={`/admin/evaluate/${applicationId}`}>
                                    {reviewStatus?.reviewer1 ? (
                                        <>
                                            <PencilSimple className="h-4 w-4 mr-2" />
                                            Edit Review
                                        </>
                                    ) : (
                                        <>
                                            Start Review
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Link>
                            </Button>
                        )}
                    </div>

                    {reviewStatus?.reviewer1 ? (
                        <div className="bg-blue-50/30 rounded-xl p-5 border border-blue-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-800/60 mb-0.5">Author</span>
                                    <span className="text-sm font-medium text-gray-900">{reviewStatus.reviewer1.name}</span>
                                </div>
                                <Badge className="bg-blue-100 text-blue-700 border-0 text-sm px-3 py-1">
                                    {reviewStatus.reviewer1.score}/100
                                </Badge>
                            </div>
                            <div className="bg-white/80 p-3 rounded-lg border border-blue-100 text-sm text-gray-700 leading-relaxed">
                                {reviewStatus.reviewer1.notes || "No notes provided."}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500">No initial review submitted yet.</p>
                        </div>
                    )}
                </div>

                {/* Reviewer 2 Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2.5 text-base">
                            <div className="bg-purple-50 p-1.5 rounded-md">
                                <UserCheck className="h-4 w-4 text-purple-600" weight="fill" />
                            </div>
                            Senior Review
                        </h3>
                        {canReview2 && !isLocked && (
                            <Button
                                size="sm"
                                variant={reviewStatus?.reviewer2 ? "outline" : "default"}
                                asChild
                                className={reviewStatus?.reviewer2 ? "border-purple-200 text-purple-700 hover:bg-purple-50" : "bg-purple-600 hover:bg-purple-700 text-white shadow-md"}
                            >
                                <Link href={`/admin/evaluate/${applicationId}`}>
                                    {reviewStatus?.reviewer2 ? (
                                        <>
                                            <PencilSimple className="h-4 w-4 mr-2" />
                                            Update Decision
                                        </>
                                    ) : (
                                        <>
                                            Start Final Review
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Link>
                            </Button>
                        )}
                    </div>

                    {reviewStatus?.reviewer2 ? (
                        <div className="bg-purple-50/30 rounded-xl p-5 border border-purple-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-800/60 mb-0.5">Author</span>
                                    <span className="text-sm font-medium text-gray-900">{reviewStatus.reviewer2.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-100 text-purple-700 border-0 text-sm px-3 py-1">
                                        {reviewStatus.reviewer2.score}/100
                                    </Badge>
                                    {reviewStatus.reviewer2.overrodeReviewer1 && (
                                        <Badge className="bg-amber-100 text-amber-700 border-0 px-2 py-1">
                                            Override
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white/80 p-3 rounded-lg border border-purple-100 text-sm text-gray-700 leading-relaxed">
                                {reviewStatus.reviewer2.notes || "No notes provided."}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500">
                                {reviewStatus?.reviewer1 ? "Ready for senior review." : "Pending initial review completion."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Lock Section (Admin) */}
                {isAdmin && isComplete && !isLocked && (
                    <>
                        <div className="h-px bg-gray-100" />
                        <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-red-900 flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Lock Application
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <Textarea
                                    value={lockReason}
                                    onChange={(e) => setLockReason(e.target.value)}
                                    placeholder="Reason for locking..."
                                    rows={1}
                                    className="bg-white text-sm border-red-200 focus-visible:ring-red-500"
                                />
                                <Button
                                    onClick={handleLock}
                                    disabled={locking}
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                >
                                    {locking ? <Spinner className="h-4 w-4 animate-spin" /> : "Confirm Lock"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
