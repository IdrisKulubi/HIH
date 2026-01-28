"use client";

import { useState, useEffect } from "react";
import { getDDQueue, submitValidatorAction, checkApprovalDeadlines, type ValidatorAction } from "@/lib/actions/due-diligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import {
    ClipboardText,
    ArrowLeft,
    ArrowRight,
    Clock,
    Warning,
    Check,
    Buildings,
    Question
} from "@phosphor-icons/react";

type DDQueueItem = {
    id: number;
    applicationId: number;
    businessName: string;
    aggregateScore: number;
    isOversightInitiated: boolean;
    ddStatus: string;
    scoreDisparity: number | null;
    primaryReviewerId: string | null;
    validatorReviewerId: string | null;
    approvalDeadline: Date | null;
};

export default function OversightApprovalsPage() {
    const { data: session } = useSession();
    const [queue, setQueue] = useState<DDQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    const loadQueue = async () => {
        setLoading(true);
        const result = await getDDQueue();
        if (result.success && result.data) {
            // Filter to show only items assigned to this user for approval
            const assigned = result.data.filter(q =>
                q.ddStatus === 'awaiting_approval' &&
                q.validatorReviewerId === session?.user?.id
            );
            setQueue(assigned);
        } else {
            toast.error(result.message || "Failed to load approvals");
        }
        setLoading(false);
    };

    const handleCheckDeadlines = async () => {
        setChecking(true);
        const result = await checkApprovalDeadlines();
        if (result.success) {
            toast.success(result.message);
            loadQueue();
        } else {
            toast.error(result.message);
        }
        setChecking(false);
    };

    useEffect(() => {
        if (session?.user?.id) {
            loadQueue();
        }
    }, [session?.user?.id]);

    const urgentApprovals = queue.filter(q => {
        if (!q.approvalDeadline) return false;
        const hoursLeft = (new Date(q.approvalDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursLeft < 4;
    });

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" asChild className="mb-2">
                        <Link href="/oversight">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ClipboardText className="h-8 w-8 text-purple-600" weight="duotone" />
                            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                                Pending Approvals
                            </h1>
                        </div>
                        <Button variant="outline" onClick={handleCheckDeadlines} disabled={checking}>
                            <Clock className="h-4 w-4 mr-2" />
                            {checking ? "Checking..." : "Check Deadlines"}
                        </Button>
                    </div>
                    <p className="text-slate-500">
                        Review and approve Due Diligence assessments within the 12-hour window
                    </p>
                </div>

                {/* Urgent Warning */}
                {urgentApprovals.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <Warning className="h-6 w-6 text-red-600" weight="fill" />
                                <div>
                                    <p className="font-medium text-red-800">
                                        {urgentApprovals.length} approval(s) expiring soon!
                                    </p>
                                    <p className="text-sm text-red-600">
                                        Review these urgently to avoid auto-reassignment
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="text-4xl font-bold text-purple-600">{queue.length}</p>
                            <p className="text-sm text-purple-700">Awaiting Your Approval</p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="text-4xl font-bold text-amber-600">{urgentApprovals.length}</p>
                            <p className="text-sm text-amber-700">Expiring Soon (&lt;4 hours)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Approval Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Assigned Approvals</CardTitle>
                        <CardDescription>
                            Click on an assessment to review and approve or query
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        ) : queue.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Check className="h-12 w-12 mx-auto mb-4 text-emerald-400" weight="duotone" />
                                <p className="text-lg font-medium text-gray-700">All caught up!</p>
                                <p className="text-sm">No pending approvals assigned to you</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {queue.map(item => {
                                    const isUrgent = item.approvalDeadline &&
                                        (new Date(item.approvalDeadline).getTime() - Date.now()) / (1000 * 60 * 60) < 4;

                                    return (
                                        <div
                                            key={item.applicationId}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${isUrgent ? 'border-red-200 bg-red-50' : 'bg-white'
                                                } hover:shadow-md transition-shadow`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-purple-100'}`}>
                                                    <Buildings className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-purple-600'}`} weight="duotone" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{item.businessName}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span>App #{item.applicationId}</span>
                                                        <span>•</span>
                                                        <span className="text-emerald-600 font-medium">{item.aggregateScore}%</span>
                                                    </div>
                                                    {item.approvalDeadline && (
                                                        <div className={`text-sm mt-1 ${isUrgent ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                                                            <Clock className="h-3 w-3 inline mr-1" />
                                                            Expires {formatDistanceToNow(new Date(item.approvalDeadline), { addSuffix: true })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button asChild className={isUrgent ? 'bg-red-600 hover:bg-red-700' : ''}>
                                                <Link href={`/oversight/approvals/${item.applicationId}`}>
                                                    Review
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Link>
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
