"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getDueDiligence,
    submitValidatorAction,
    type ValidatorAction
} from "@/lib/actions/due-diligence";
import { getApplicationById } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Check,
    Warning,
    Clock,
    Buildings,
    Lightning,
    ShieldCheck,
    Question
} from "@phosphor-icons/react";

type DDRecord = {
    id: number;
    applicationId: number;
    phase1Score: number | null;
    phase1Notes: string | null;
    ddStatus: string | null;
    approvalDeadline: Date | null;
    isOversightInitiated: boolean | null;
    oversightJustification: string | null;
    primaryReviewerId: string | null;
    primaryReviewedAt: Date | null;
    validatorReviewerId: string | null;
    validatorAction: string | null;
    validatorComments: string | null;
};

export default function OversightApprovalReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const applicationId = parseInt(params.id as string);

    const [ddRecord, setDDRecord] = useState<DDRecord | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comments, setComments] = useState("");

    const loadData = async () => {
        setLoading(true);

        const ddResult = await getDueDiligence(applicationId);
        if (ddResult.success && ddResult.data) {
            setDDRecord(ddResult.data as unknown as DDRecord);
        }

        const appResult = await getApplicationById(applicationId);
        if (appResult.success && appResult.data) {
            setApplication(appResult.data);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (applicationId) {
            loadData();
        }
    }, [applicationId]);

    const handleAction = async (action: ValidatorAction) => {
        if (!comments || comments.trim().length < 5) {
            toast.error("Please provide comments (minimum 5 characters)");
            return;
        }

        setSubmitting(true);
        const result = await submitValidatorAction(applicationId, action, comments);
        if (result.success) {
            toast.success(action === 'approved' ? "Assessment approved!" : "Assessment queried - sent back for revision");
            router.push("/oversight/approvals");
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const isAssignedValidator = session?.user?.id === ddRecord?.validatorReviewerId;
    const canApprove = isAssignedValidator && ddRecord?.ddStatus === 'awaiting_approval';

    // Calculate deadline urgency
    const getDeadlineStatus = () => {
        if (!ddRecord?.approvalDeadline) return null;
        const hoursLeft = (new Date(ddRecord.approvalDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursLeft < 0) return { label: "EXPIRED", color: "text-red-600 bg-red-100" };
        if (hoursLeft < 2) return { label: "URGENT", color: "text-red-600 bg-red-100" };
        if (hoursLeft < 4) return { label: "Soon", color: "text-amber-600 bg-amber-100" };
        return { label: "OK", color: "text-green-600 bg-green-100" };
    };

    const deadlineStatus = getDeadlineStatus();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] p-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    if (!isAssignedValidator) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="py-8 text-center">
                        <Warning className="h-12 w-12 mx-auto mb-4 text-amber-500" weight="duotone" />
                        <h2 className="text-lg font-medium text-gray-900">Not Assigned</h2>
                        <p className="text-gray-600 mt-2">
                            This approval is not assigned to you.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href="/oversight/approvals">Back to Approvals</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" asChild>
                        <Link href="/oversight/approvals">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Approvals
                        </Link>
                    </Button>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Buildings className="h-7 w-7 text-purple-600" weight="duotone" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {application?.business?.name || "DD Approval"}
                                </h1>
                                <p className="text-gray-500">Application #{applicationId}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {ddRecord?.isOversightInitiated && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    <Lightning className="h-4 w-4 mr-1" />
                                    Oversight
                                </Badge>
                            )}
                            {deadlineStatus && (
                                <Badge className={deadlineStatus.color}>
                                    <Clock className="h-3 w-3 mr-1" />
                                    {deadlineStatus.label}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Deadline Warning */}
                {ddRecord?.approvalDeadline && (
                    <Card className={`border-2 ${deadlineStatus?.label === 'URGENT' || deadlineStatus?.label === 'EXPIRED' ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Clock className={`h-6 w-6 ${deadlineStatus?.label === 'URGENT' || deadlineStatus?.label === 'EXPIRED' ? 'text-red-600' : 'text-amber-600'}`} weight="fill" />
                                    <div>
                                        <p className={`font-medium ${deadlineStatus?.label === 'URGENT' || deadlineStatus?.label === 'EXPIRED' ? 'text-red-800' : 'text-amber-800'}`}>
                                            Approval Deadline
                                        </p>
                                        <p className={`text-sm ${deadlineStatus?.label === 'URGENT' || deadlineStatus?.label === 'EXPIRED' ? 'text-red-600' : 'text-amber-600'}`}>
                                            {format(new Date(ddRecord.approvalDeadline), "EEEE, MMMM d 'at' h:mm a")}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-bold ${deadlineStatus?.label === 'URGENT' || deadlineStatus?.label === 'EXPIRED' ? 'text-red-700' : 'text-amber-700'}`}>
                                        {formatDistanceToNow(new Date(ddRecord.approvalDeadline), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Assessment Review */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Assessment Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                    DD Assessment to Review
                                </CardTitle>
                                <CardDescription>
                                    Review the Reviewer 1&apos;s assessment and approve or query
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Score */}
                                <div className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border">
                                    <p className="text-sm text-gray-600 mb-1">DD Score</p>
                                    <p className="text-4xl font-bold text-emerald-600">
                                        {ddRecord?.phase1Score || 0}/100
                                    </p>
                                    {ddRecord?.primaryReviewedAt && (
                                        <p className="text-sm text-gray-500 mt-2">
                                            Submitted: {format(new Date(ddRecord.primaryReviewedAt), "PPP 'at' p")}
                                        </p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <Label className="text-sm text-gray-600">Assessment Notes</Label>
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border min-h-[150px] whitespace-pre-wrap">
                                        {ddRecord?.phase1Notes || <span className="text-gray-400">No notes provided</span>}
                                    </div>
                                </div>

                                {/* Oversight Justification */}
                                {ddRecord?.isOversightInitiated && ddRecord?.oversightJustification && (
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-sm text-purple-700 font-medium mb-1">
                                            <Lightning className="h-4 w-4 inline mr-1" />
                                            Oversight Recommendation
                                        </p>
                                        <p className="text-purple-900">{ddRecord.oversightJustification}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Approval Form */}
                        {canApprove && (
                            <Card className="border-2 border-purple-200">
                                <CardHeader>
                                    <CardTitle>Your Decision</CardTitle>
                                    <CardDescription>
                                        Approve the assessment or query for revisions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Your Comments *</Label>
                                        <Textarea
                                            placeholder="Provide your feedback on this assessment..."
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            rows={4}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Required for both approval and query actions
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <Button
                                            onClick={() => handleAction('approved')}
                                            disabled={submitting}
                                            className="bg-emerald-600 hover:bg-emerald-700 py-6 text-base"
                                        >
                                            <Check className="h-5 w-5 mr-2" />
                                            {submitting ? "Approving..." : "Approve"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleAction('queried')}
                                            disabled={submitting}
                                            className="py-6 text-base"
                                        >
                                            <Question className="h-5 w-5 mr-2" />
                                            {submitting ? "Querying..." : "Query"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Application Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Application Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Business</span>
                                    <span className="font-medium">{application?.business?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Sector</span>
                                    <span className="font-medium">{application?.business?.sector || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Location</span>
                                    <span className="font-medium">{application?.business?.county || '-'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Button variant="outline" asChild className="w-full">
                            <Link href={`/admin/applications/${applicationId}`}>
                                View Full Application
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
