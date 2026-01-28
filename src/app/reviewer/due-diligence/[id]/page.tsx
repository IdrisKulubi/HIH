"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    getDueDiligence,
    submitPrimaryDDReview,
    getAvailableValidators
} from "@/lib/actions/due-diligence";
import { getApplicationById } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Check,
    Clock,
    Buildings,
    Lightning,
    PaperPlaneTilt,
    ShieldCheck,
    UserCheck
} from "@phosphor-icons/react";
import { selectValidatorReviewer } from "@/lib/actions/due-diligence";

type DDRecord = {
    id: number;
    applicationId: number;
    phase1Score: number | null;
    phase1Status: string | null;
    phase1Notes: string | null;
    ddStatus: string | null;
    approvalDeadline: Date | null;
    isOversightInitiated: boolean | null;
    oversightJustification: string | null;
    validatorReviewerId: string | null;
    validatorAction: string | null;
    validatorComments: string | null;
    primaryReviewedAt: Date | null;
};

type Validator = {
    id: string;
    name: string;
    email: string;
};

export default function ReviewerDDReviewPage() {
    const params = useParams();
    const { data: session } = useSession();
    const applicationId = parseInt(params.id as string);

    const [ddRecord, setDDRecord] = useState<DDRecord | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [application, setApplication] = useState<any>(null);
    const [validators, setValidators] = useState<Validator[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [score, setScore] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [selectedValidator, setSelectedValidator] = useState("");

    const loadData = async () => {
        setLoading(true);

        const ddResult = await getDueDiligence(applicationId);
        if (ddResult.success && ddResult.data) {
            setDDRecord(ddResult.data as unknown as DDRecord);
            setScore(ddResult.data.phase1Score || 0);
            setNotes(ddResult.data.phase1Notes || "");
        }

        const appResult = await getApplicationById(applicationId);
        if (appResult.success && appResult.data) {
            setApplication(appResult.data);
        }

        const validatorResult = await getAvailableValidators(applicationId);
        if (validatorResult.success && validatorResult.data) {
            setValidators(validatorResult.data);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (applicationId) {
            loadData();
        }
    }, [applicationId]);

    const handleSubmitReview = async () => {
        if (score < 0 || score > 100) {
            toast.error("Score must be between 0 and 100");
            return;
        }
        if (!notes || notes.trim().length < 10) {
            toast.error("Please provide detailed notes (at least 10 characters)");
            return;
        }

        setSubmitting(true);
        const result = await submitPrimaryDDReview(applicationId, score, notes);
        if (result.success) {
            toast.success(result.message);
            loadData();
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const handleSendForApproval = async () => {
        if (!selectedValidator) {
            toast.error("Please select an approver");
            return;
        }

        setSubmitting(true);
        const result = await selectValidatorReviewer(applicationId, selectedValidator);
        if (result.success) {
            toast.success("Sent for final approval!");
            loadData();
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const canReview = ddRecord?.ddStatus === 'pending' || ddRecord?.ddStatus === 'queried' || ddRecord?.ddStatus === 'auto_reassigned';
    const canSendForApproval = ddRecord?.ddStatus === 'awaiting_approval' && !ddRecord?.validatorReviewerId;
    const isAwaitingApproval = ddRecord?.ddStatus === 'awaiting_approval' && ddRecord?.validatorReviewerId;

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

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" asChild>
                        <Link href="/reviewer/due-diligence">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to DD Queue
                        </Link>
                    </Button>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Buildings className="h-7 w-7 text-emerald-600" weight="duotone" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {application?.business?.name || "DD Review"}
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
                            <Badge variant={ddRecord?.ddStatus === 'approved' ? 'default' : 'secondary'}>
                                {ddRecord?.ddStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Oversight Justification */}
                {ddRecord?.isOversightInitiated && ddRecord?.oversightJustification && (
                    <Card className="border-purple-200 bg-purple-50">
                        <CardHeader>
                            <CardTitle className="text-purple-800 flex items-center gap-2">
                                <Lightning className="h-5 w-5" />
                                Oversight Recommendation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-purple-900">{ddRecord.oversightJustification}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Queried Message */}
                {ddRecord?.ddStatus === 'queried' && ddRecord?.validatorComments && (
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-800">Query from Approver</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-900">{ddRecord.validatorComments}</p>
                            <p className="text-sm text-red-600 mt-2">Please address the concerns and resubmit.</p>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* DD Review Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                    Due Diligence Assessment
                                </CardTitle>
                                <CardDescription>
                                    Conduct the on-site/phone verification and provide your assessment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>DD Score (0-100)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={score}
                                        onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                                        disabled={!canReview}
                                        className="max-w-[200px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Assessment Notes</Label>
                                    <Textarea
                                        placeholder="Document your findings from the DD visit...
- Business location verification
- Revenue/financial documentation review
- Team interviews
- Customer validation
- Risks identified"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={8}
                                        disabled={!canReview}
                                    />
                                </div>

                                {canReview && (
                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={submitting}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <PaperPlaneTilt className="h-4 w-4 mr-2" />
                                        {submitting ? "Saving..." : "Save Assessment"}
                                    </Button>
                                )}

                                {ddRecord?.primaryReviewedAt && (
                                    <p className="text-sm text-gray-500">
                                        Last saved: {format(new Date(ddRecord.primaryReviewedAt), "PPP 'at' p")}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Send for Approval */}
                        {canSendForApproval && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardHeader>
                                    <CardTitle className="text-blue-800 flex items-center gap-2">
                                        <UserCheck className="h-5 w-5" />
                                        Send for Final Approval
                                    </CardTitle>
                                    <CardDescription>
                                        Select an oversight approver to review and approve your assessment
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an approver..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {validators.map(v => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.name} ({v.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        onClick={handleSendForApproval}
                                        disabled={submitting || !selectedValidator}
                                        className="w-full"
                                    >
                                        <PaperPlaneTilt className="h-4 w-4 mr-2" />
                                        {submitting ? "Sending..." : "Send for Approval"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Awaiting Approval Status */}
                        {isAwaitingApproval && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="py-8 text-center">
                                    <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500" weight="duotone" />
                                    <h3 className="text-lg font-medium text-blue-800">Awaiting Final Approval</h3>
                                    <p className="text-blue-600 mt-2">
                                        Your assessment has been sent for approval.
                                        You&apos;ll be notified once it&apos;s reviewed.
                                    </p>
                                    {ddRecord.approvalDeadline && (
                                        <p className="text-sm text-blue-500 mt-4">
                                            Deadline: {format(new Date(ddRecord.approvalDeadline), "MMM d 'at' h:mm a")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Status Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Review Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Assessment</span>
                                    {ddRecord?.primaryReviewedAt ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            <Check className="h-3 w-3 mr-1" /> Complete
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Pending</Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Sent for Approval</span>
                                    {ddRecord?.validatorReviewerId ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            <Check className="h-3 w-3 mr-1" /> Yes
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">No</Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Approved</span>
                                    {ddRecord?.validatorAction === 'approved' ? (
                                        <Badge className="bg-emerald-600">Yes</Badge>
                                    ) : (
                                        <Badge variant="outline">Pending</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* View Application Link */}
                        <Button variant="outline" asChild className="w-full">
                            <Link href={`/reviewer/applications/${applicationId}`}>
                                View Full Application
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
