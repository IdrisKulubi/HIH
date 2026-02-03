"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    getDueDiligence,
    submitPrimaryDDReview,
    selectValidatorReviewer,
    submitValidatorAction,
    getAvailableValidators,
    adminOverrideDDScore,
    type ValidatorAction
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
import { format, formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Check,
    Warning,
    Clock,
    UserCheck,
    Buildings,
    Lightning,
    Question,
    PaperPlaneTilt,
    ShieldCheck,
    PencilSimple,
    Faders
} from "@phosphor-icons/react";

type DDRecord = {
    id: number;
    applicationId: number;
    phase1Score: number | null;
    phase1Status: string | null;
    phase1Notes: string | null;
    phase2Score: number | null;
    phase2Status: string | null;
    phase2Notes: string | null;
    primaryReviewerId: string | null;
    primaryReviewedAt: Date | null;
    validatorReviewerId: string | null;
    validatorAction: string | null;
    validatorComments: string | null;
    validatorActionAt: Date | null;
    ddStatus: string | null;
    approvalDeadline: Date | null;
    isOversightInitiated: boolean | null;
    oversightJustification: string | null;
    finalVerdict: string | null;
    finalReason: string | null;
    adminOverrideScore: number | null;
    originalScore: number | null;
    adminOverrideReason: string | null;
    adminOverrideById: string | null;
    adminOverrideAt: Date | null;
    items: Array<{
        id: number;
        phase: string;
        category: string;
        criterion: string;
        score: number | null;
        comments: string | null;
    }>;
};

type Validator = {
    id: string;
    name: string;
    email: string;
};

export default function DDReviewPage() {
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
    const [validatorComments, setValidatorComments] = useState("");
    
    // Admin override state
    const [showOverride, setShowOverride] = useState(false);
    const [overrideScore, setOverrideScore] = useState<number>(0);
    const [overrideReason, setOverrideReason] = useState("");

    const loadData = async () => {
        setLoading(true);

        // Load DD record
        const ddResult = await getDueDiligence(applicationId);
        if (ddResult.success && ddResult.data) {
            setDDRecord(ddResult.data as unknown as DDRecord);
            setScore(ddResult.data.phase1Score || 0);
            setNotes(ddResult.data.phase1Notes || "");
            setOverrideScore(ddResult.data.phase1Score || 0);
        }

        // Load application details
        const appResult = await getApplicationById(applicationId);
        if (appResult.success && appResult.data) {
            setApplication(appResult.data);
        }

        // Load available validators
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

    const handleSubmitPrimaryReview = async () => {
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

    const handleSelectValidator = async () => {
        if (!selectedValidator) {
            toast.error("Please select a validator");
            return;
        }

        setSubmitting(true);
        const result = await selectValidatorReviewer(applicationId, selectedValidator);
        if (result.success) {
            toast.success(result.message);
            loadData();
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const handleValidatorAction = async (action: ValidatorAction) => {
        if (!validatorComments || validatorComments.trim().length < 5) {
            toast.error("Please provide comments");
            return;
        }

        setSubmitting(true);
        const result = await submitValidatorAction(applicationId, action, validatorComments);
        if (result.success) {
            toast.success(result.message);
            loadData();
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const handleOverrideScore = async () => {
        if (overrideScore < 0 || overrideScore > 100) {
            toast.error("Score must be between 0 and 100");
            return;
        }
        if (!overrideReason || overrideReason.trim().length < 10) {
            toast.error("Please provide a justification (at least 10 characters)");
            return;
        }

        setSubmitting(true);
        const result = await adminOverrideDDScore(applicationId, overrideScore, overrideReason);
        if (result.success) {
            toast.success(result.message);
            setShowOverride(false);
            setOverrideReason("");
            loadData();
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const isValidator = session?.user?.id === ddRecord?.validatorReviewerId;
    const isPrimaryReviewer = session?.user?.id === ddRecord?.primaryReviewerId;
    const canReview = ddRecord?.ddStatus === 'pending' || ddRecord?.ddStatus === 'queried' || ddRecord?.ddStatus === 'auto_reassigned';
    const canApprove = isValidator && ddRecord?.ddStatus === 'awaiting_approval';

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/admin/due-diligence">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Queue
                    </Link>
                </Button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Buildings className="h-7 w-7 text-emerald-600" weight="duotone" />
                            {application?.business?.name || "Application DD Review"}
                        </h1>
                        <p className="text-gray-600">Application #{applicationId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {ddRecord?.isOversightInitiated && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                <Lightning className="h-4 w-4 mr-1" />
                                Oversight Initiated
                            </Badge>
                        )}
                        <Badge
                            variant={ddRecord?.ddStatus === 'approved' ? 'default' : 'secondary'}
                            className={
                                ddRecord?.ddStatus === 'approved' ? 'bg-emerald-600' :
                                    ddRecord?.ddStatus === 'queried' ? 'bg-red-100 text-red-700' :
                                        ddRecord?.ddStatus === 'awaiting_approval' ? 'bg-blue-100 text-blue-700' : ''
                            }
                        >
                            {ddRecord?.ddStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Review Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Oversight Justification */}
                    {ddRecord?.isOversightInitiated && ddRecord?.oversightJustification && (
                        <Card className="border-purple-200 bg-purple-50">
                            <CardHeader>
                                <CardTitle className="text-purple-800 flex items-center gap-2">
                                    <Lightning className="h-5 w-5" />
                                    Oversight Justification
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-purple-900">{ddRecord.oversightJustification}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Primary Review Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                Primary DD Assessment
                            </CardTitle>
                            <CardDescription>
                                Conduct due diligence verification and assign a score
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
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Assessment Notes</Label>
                                <Textarea
                                    placeholder="Provide detailed assessment notes from the DD visit..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={5}
                                    disabled={!canReview}
                                />
                            </div>

                            {canReview && (
                                <Button
                                    onClick={handleSubmitPrimaryReview}
                                    disabled={submitting}
                                    className="w-full"
                                >
                                    <PaperPlaneTilt className="h-4 w-4 mr-2" />
                                    {submitting ? "Submitting..." : "Submit Primary Review"}
                                </Button>
                            )}

                            {ddRecord?.primaryReviewedAt && (
                                <p className="text-sm text-gray-500">
                                    Submitted: {format(new Date(ddRecord.primaryReviewedAt), "PPP 'at' p")}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Validator Selection */}
                    {ddRecord?.ddStatus === 'awaiting_approval' && isPrimaryReviewer && !ddRecord?.validatorReviewerId && (
                        <Card className="border-blue-200">
                            <CardHeader>
                                <CardTitle className="text-blue-800 flex items-center gap-2">
                                    <UserCheck className="h-5 w-5" />
                                    Select Validator
                                </CardTitle>
                                <CardDescription>
                                    Choose a second reviewer to validate your assessment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a validator..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validators.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.name} ({v.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleSelectValidator} disabled={submitting}>
                                    {submitting ? "Selecting..." : "Assign Validator"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Validator Approval Panel */}
                    {canApprove && (
                        <Card className="border-emerald-200 bg-emerald-50">
                            <CardHeader>
                                <CardTitle className="text-emerald-800 flex items-center gap-2">
                                    <Check className="h-5 w-5" />
                                    Validator Approval
                                </CardTitle>
                                <CardDescription>
                                    Review the primary assessment and approve or query
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-white rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-1">Primary Score</p>
                                    <p className="text-2xl font-bold text-emerald-600">{ddRecord?.phase1Score}/100</p>
                                    <p className="text-sm text-gray-600 mt-2">{ddRecord?.phase1Notes}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Your Comments</Label>
                                    <Textarea
                                        placeholder="Add your validation comments..."
                                        value={validatorComments}
                                        onChange={(e) => setValidatorComments(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleValidatorAction('approved')}
                                        disabled={submitting}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleValidatorAction('queried')}
                                        disabled={submitting}
                                        className="flex-1"
                                    >
                                        <Question className="h-4 w-4 mr-2" />
                                        Query
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Admin Score Override */}
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                            <CardTitle className="text-orange-800 flex items-center gap-2">
                                <Faders className="h-5 w-5" />
                                Admin Score Override
                            </CardTitle>
                            <CardDescription>
                                Adjust the final DD score if needed (admin only)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-white rounded-lg border">
                                <p className="text-sm text-gray-500 mb-1">Current DD Score</p>
                                <p className="text-3xl font-bold text-emerald-600">{ddRecord?.phase1Score ?? 0}/100</p>
                                {ddRecord?.adminOverrideScore !== null && ddRecord?.adminOverrideScore !== undefined && (
                                    <div className="mt-2 p-2 bg-orange-100 rounded text-sm">
                                        <p className="text-orange-700 font-medium">Admin Override Applied</p>
                                        <p className="text-orange-600">Previous: {ddRecord?.originalScore ?? ddRecord?.phase1Score}/100</p>
                                    </div>
                                )}
                            </div>

                            {!showOverride ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowOverride(true)}
                                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                                >
                                    <PencilSimple className="h-4 w-4 mr-2" />
                                    Override Final Score
                                </Button>
                            ) : (
                                <div className="space-y-4 p-4 bg-white rounded-lg border border-orange-200">
                                    <div className="space-y-2">
                                        <Label>New DD Score (0-100)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={overrideScore}
                                            onChange={(e) => setOverrideScore(parseInt(e.target.value) || 0)}
                                            placeholder="Enter new score"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Justification (Required)</Label>
                                        <Textarea
                                            placeholder="Explain why you are overriding the score..."
                                            value={overrideReason}
                                            onChange={(e) => setOverrideReason(e.target.value)}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleOverrideScore}
                                            disabled={submitting}
                                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                                        >
                                            {submitting ? "Saving..." : "Apply Override"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowOverride(false);
                                                setOverrideScore(ddRecord?.phase1Score || 0);
                                                setOverrideReason("");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {ddRecord?.adminOverrideReason && (
                                <div className="p-3 bg-white rounded border border-orange-200">
                                    <p className="text-xs text-orange-600 font-medium mb-1">Override Justification:</p>
                                    <p className="text-sm text-gray-700">{ddRecord.adminOverrideReason}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Deadline Card */}
                    {ddRecord?.approvalDeadline && (
                        <Card className="border-amber-200 bg-amber-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-amber-800 text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Approval Deadline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-semibold text-amber-900">
                                    {format(new Date(ddRecord.approvalDeadline), "MMM d, h:mm a")}
                                </p>
                                <p className="text-sm text-amber-700">
                                    {formatDistanceToNow(new Date(ddRecord.approvalDeadline), { addSuffix: true })}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Workflow Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Workflow Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Primary Reviewer</span>
                                {ddRecord?.primaryReviewerId ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        <Check className="h-3 w-3 mr-1" /> Assigned
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">Pending</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Validator</span>
                                {ddRecord?.validatorReviewerId ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        <Check className="h-3 w-3 mr-1" /> Assigned
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">Pending</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Approval</span>
                                {ddRecord?.validatorAction === 'approved' ? (
                                    <Badge className="bg-emerald-600">Approved</Badge>
                                ) : ddRecord?.validatorAction === 'queried' ? (
                                    <Badge variant="destructive">Queried</Badge>
                                ) : (
                                    <Badge variant="outline">Pending</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Validator Comments */}
                    {ddRecord?.validatorComments && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    {ddRecord.validatorAction === 'queried' ? (
                                        <Warning className="h-4 w-4 text-red-500" />
                                    ) : (
                                        <Check className="h-4 w-4 text-emerald-500" />
                                    )}
                                    Validator Feedback
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700">{ddRecord.validatorComments}</p>
                                {ddRecord.validatorActionAt && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        {format(new Date(ddRecord.validatorActionAt), "PPP 'at' p")}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* View Application */}
                    <Button variant="outline" asChild className="w-full">
                        <Link href={`/admin/applications/${applicationId}`}>
                            View Full Application
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
