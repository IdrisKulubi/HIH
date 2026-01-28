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
import { recommendForDueDiligence, calculateScoreDisparity } from "@/lib/actions/due-diligence";
import { getCurrentUserProfile } from "@/lib/actions/user.actions";
import { toast } from "sonner";
import {
    User,
    UserCheck,
    ShieldCheck,
    Lock,
    PencilSimple,
    ArrowRight,
    Spinner,
    Lightning,
    Warning
} from "@phosphor-icons/react";

interface TwoTierReviewPanelProps {
    applicationId: number;
    currentStatus: string;
    isAdmin?: boolean;
    userRole?: string; // User's role: admin, reviewer_1, reviewer_2, etc.
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
    userRole: initialUserRole = "admin",
}: TwoTierReviewPanelProps) {
    const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(initialUserRole);

    // Lock Form
    const [lockReason, setLockReason] = useState("");
    const [locking, setLocking] = useState(false);

    // DD Recommendation (Oversight)
    const [ddJustification, setDdJustification] = useState("");
    const [recommending, setRecommending] = useState(false);
    const [scoreDisparity, setScoreDisparity] = useState<number | null>(null);

    // Fetch review status and user role
    async function fetchStatus() {
        try {
            const [result, profile] = await Promise.all([
                getReviewStatus(applicationId),
                getCurrentUserProfile()
            ]);

            if (result.success && result.data) {
                setReviewStatus(result.data);

                // Calculate disparity if both reviews complete
                if (result.data.reviewer1 && result.data.reviewer2 &&
                    result.data.reviewer1.score !== null && result.data.reviewer2.score !== null) {
                    const disparityResult = await calculateScoreDisparity(applicationId);
                    if (disparityResult.success && disparityResult.disparity !== undefined) {
                        setScoreDisparity(disparityResult.disparity);
                    }
                }
            }

            // Set user role from profile
            if (profile?.role) {
                setUserRole(profile.role);
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

    // Oversight: Recommend for Due Diligence
    const handleRecommendDD = async () => {
        if (!ddJustification || ddJustification.trim().length < 20) {
            toast.error("Please provide justification (at least 20 characters)");
            return;
        }

        setRecommending(true);
        try {
            const result = await recommendForDueDiligence(applicationId, ddJustification);
            if (result.success) {
                toast.success(result.message);
                setDdJustification("");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to recommend for DD");
        } finally {
            setRecommending(false);
        }
    };

    // Check if user has oversight privileges
    const isOversight = userRole === "oversight" || userRole === "admin";

    if (loading) {
        return (
            <Card className="border-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] bg-white rounded-xl">
                <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
                    <Spinner className="h-6 w-6 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        );
    }

    // Determine state based on user role
    // Reviewer 1 can only do the first review, Reviewer 2 can only do the second
    const isReviewer1Role = userRole === "reviewer_1";
    const isReviewer2Role = userRole === "reviewer_2";
    const hasFullAccess = userRole === "admin" || userRole === "technical_reviewer";

    // Determine the correct evaluate URL based on user role
    const getEvaluateUrl = () => {
        if (userRole === "admin" || userRole === "technical_reviewer") {
            return `/admin/evaluate/${applicationId}`;
        }
        // Reviewers use the reviewer route
        return `/reviewer/evaluate/${applicationId}`;
    };

    const canReview1 =
        (currentStatus === "submitted" || currentStatus === "under_review") &&
        (hasFullAccess || isReviewer1Role);

    const canReview2 =
        currentStatus === "pending_senior_review" &&
        (hasFullAccess || isReviewer2Role);

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
                    Workflow: Reviewer 1 → Reviewer 2 → Average Score
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {/* Final Score Summary - Show when both reviews complete */}
                {reviewStatus?.reviewer1 && reviewStatus?.reviewer2 && (
                    <div className="grid grid-cols-2 gap-4">
                        {/* Reviewer Average Score */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">Final Score</p>
                            <p className="text-3xl font-bold text-green-600">
                                {reviewStatus.finalScore?.toFixed(1) || ((Number(reviewStatus.reviewer1.score) + Number(reviewStatus.reviewer2.score)) / 2).toFixed(1)}
                            </p>
                            <p className="text-[10px] text-green-600/70 mt-1">(R1 + R2) ÷ 2</p>
                        </div>
                        {/* Score Breakdown */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Reviewer 1</span>
                                <span className="font-semibold text-blue-600">{reviewStatus.reviewer1.score}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Reviewer 2</span>
                                <span className="font-semibold text-purple-600">{reviewStatus.reviewer2.score}</span>
                            </div>
                            <div className="h-px bg-gray-200 my-1" />
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-gray-700">Average</span>
                                <span className="text-green-600 font-bold">
                                    {reviewStatus.finalScore?.toFixed(1) || ((Number(reviewStatus.reviewer1.score) + Number(reviewStatus.reviewer2.score)) / 2).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

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
                                <Link href={getEvaluateUrl()}>
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
                            Second Review
                        </h3>
                        {canReview2 && !isLocked && (
                            <Button
                                size="sm"
                                variant={reviewStatus?.reviewer2 ? "outline" : "default"}
                                asChild
                                className={reviewStatus?.reviewer2 ? "border-purple-200 text-purple-700 hover:bg-purple-50" : "bg-purple-600 hover:bg-purple-700 text-white shadow-md"}
                            >
                                <Link href={getEvaluateUrl()}>
                                    {reviewStatus?.reviewer2 ? (
                                        <>
                                            <PencilSimple className="h-4 w-4 mr-2" />
                                            Update Decision
                                        </>
                                    ) : (
                                        <>
                                            Start Second Review
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
                                </div>
                            </div>
                            <div className="bg-white/80 p-3 rounded-lg border border-purple-100 text-sm text-gray-700 leading-relaxed">
                                {reviewStatus.reviewer2.notes || "No notes provided."}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500">
                                {reviewStatus?.reviewer1 ? "Ready for second reviewer." : "Pending first reviewer."}
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
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                >
                                    {locking ? <Spinner className="h-4 w-4 animate-spin" /> : "Confirm Lock"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Score Disparity Warning */}
                {scoreDisparity !== null && scoreDisparity > 10 && (
                    <Alert className="border-amber-200 bg-amber-50">
                        <Warning className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                            <strong>Score Disparity Detected:</strong> There is a {scoreDisparity} point
                            difference between Reviewer 1 and Reviewer 2 scores. This may indicate
                            the need for further investigation or due diligence.
                        </AlertDescription>
                    </Alert>
                )}

                {/* DD Recommendation Section (Oversight) */}
                {isOversight && reviewStatus?.reviewer1 && reviewStatus?.reviewer2 && (
                    <>
                        <div className="h-px bg-gray-100" />
                        <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-purple-900 flex items-center gap-2">
                                    <Lightning className="h-4 w-4" weight="fill" />
                                    Recommend for Due Diligence
                                </h3>
                            </div>
                            <p className="text-sm text-purple-700 mb-3">
                                Flag this application for on-site verification visit.
                            </p>
                            <div className="space-y-3">
                                <Textarea
                                    value={ddJustification}
                                    onChange={(e) => setDdJustification(e.target.value)}
                                    placeholder="Justification for DD recommendation (min. 20 characters)..."
                                    rows={2}
                                    className="bg-white text-sm border-purple-200 focus-visible:ring-purple-500"
                                />
                                <Button
                                    onClick={handleRecommendDD}
                                    disabled={recommending || ddJustification.length < 20}
                                    size="sm"
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                                >
                                    {recommending ? <Spinner className="h-4 w-4 animate-spin" /> : (
                                        <>
                                            <Lightning className="h-4 w-4 mr-2" />
                                            Recommend for DD
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
