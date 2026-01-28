"use client";

import { useState, useEffect } from "react";
import { getDDQueue } from "@/lib/actions/due-diligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import {
    ClipboardText,
    Eye,
    ArrowRight,
    ArrowLeft,
    Buildings,
    Lightning
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

function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        pending: { label: "Pending Review", variant: "outline" },
        in_progress: { label: "In Progress", variant: "secondary" },
        awaiting_approval: { label: "Sent for Approval", variant: "default" },
        approved: { label: "Approved", variant: "default" },
        queried: { label: "Returned - Query", variant: "destructive" },
        auto_reassigned: { label: "Reassigned", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function ReviewerDDPage() {
    const [queue, setQueue] = useState<DDQueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadQueue = async () => {
        setLoading(true);
        const result = await getDDQueue();
        if (result.success && result.data) {
            setQueue(result.data);
        } else {
            toast.error(result.message || "Failed to load DD queue");
        }
        setLoading(false);
    };

    useEffect(() => {
        loadQueue();
    }, []);

    // Filter to show pending or queried items that Reviewer 1 should work on
    const pendingForReview = queue.filter(q =>
        q.ddStatus === 'pending' || q.ddStatus === 'queried' || q.ddStatus === 'auto_reassigned'
    );
    const awaitingApproval = queue.filter(q => q.ddStatus === 'awaiting_approval');
    const completed = queue.filter(q => q.ddStatus === 'approved');

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" asChild className="mb-2">
                        <Link href="/reviewer">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <ClipboardText className="h-8 w-8 text-emerald-600" weight="duotone" />
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                            Due Diligence Queue
                        </h1>
                    </div>
                    <p className="text-slate-500">
                        Conduct on-site verification visits for applications that scored ≥60%
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-amber-600">{pendingForReview.length}</p>
                            <p className="text-sm text-amber-700">Awaiting Your Review</p>
                        </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-blue-600">{awaitingApproval.length}</p>
                            <p className="text-sm text-blue-700">Sent for Approval</p>
                        </CardContent>
                    </Card>
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-emerald-600">{completed.length}</p>
                            <p className="text-sm text-emerald-700">Completed</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Reviews */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-amber-600" weight="duotone" />
                            Applications Needing Your Review
                        </CardTitle>
                        <CardDescription>
                            Conduct DD assessment and send for final approval
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-20 w-full" />
                                ))}
                            </div>
                        ) : pendingForReview.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <ClipboardText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No applications pending your review</p>
                                <p className="text-sm">New qualified applications will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {pendingForReview.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100 rounded-full">
                                                <Buildings className="h-6 w-6 text-emerald-600" weight="duotone" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">{item.businessName}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>App #{item.applicationId}</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-medium">{item.aggregateScore}%</span>
                                                    {item.isOversightInitiated && (
                                                        <>
                                                            <span>•</span>
                                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                                <Lightning className="h-3 w-3 mr-1" />
                                                                Oversight
                                                            </Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(item.ddStatus)}
                                            <Button asChild>
                                                <Link href={`/reviewer/due-diligence/${item.applicationId}`}>
                                                    Review
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sent for Approval */}
                {awaitingApproval.length > 0 && (
                    <Card className="border-blue-200">
                        <CardHeader>
                            <CardTitle className="text-blue-800">Awaiting Final Approval</CardTitle>
                            <CardDescription>
                                Your reviews that are pending approval from oversight
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {awaitingApproval.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
                                    >
                                        <div>
                                            <span className="font-medium">{item.businessName}</span>
                                            <span className="text-sm text-gray-500 ml-2">#{item.applicationId}</span>
                                        </div>
                                        <Badge variant="secondary">Pending Approval</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
