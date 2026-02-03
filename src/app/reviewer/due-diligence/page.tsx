"use client";

import { useState, useEffect, useMemo } from "react";
import { getDDQueue, claimDDApplication, releaseDDApplication } from "@/lib/actions/due-diligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    ClipboardText,
    Eye,
    ArrowRight,
    ArrowLeft,
    Buildings,
    Lightning,
    MagnifyingGlass,
    X,
    UserCircle,
    HandGrabbing,
    ArrowCounterClockwise,
    CheckCircle,
    Warning,
    Play,
    Question,
    Lightbulb
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
    primaryReviewerName: string | null;
    validatorReviewerId: string | null;
    validatorReviewerName: string | null;
    approvalDeadline: Date | null;
};

// Simple, human-friendly status labels
function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: React.ReactNode }> = {
        pending: { label: "Ready to Start", variant: "outline" },
        in_progress: { label: "Work in Progress", variant: "secondary" },
        awaiting_approval: { label: "Waiting for Second Check", variant: "default" },
        approved: { label: "✓ Complete", variant: "default" },
        queried: { label: "Needs Attention", variant: "destructive" },
        auto_reassigned: { label: "Needs New Reviewer", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function ReviewerDDPage() {
    const { data: session } = useSession();
    const [queue, setQueue] = useState<DDQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [claimingId, setClaimingId] = useState<number | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const loadQueue = async () => {
        try {
            const result = await getDDQueue();
            if (result.success && result.data) {
                setQueue(result.data);
            } else {
                toast.error(result.message || "Failed to load applications");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
    }, []);

    const handleStartReview = async (applicationId: number) => {
        setClaimingId(applicationId);
        const result = await claimDDApplication(applicationId);
        if (result.success) {
            toast.success("Great! You can now start reviewing this application");
            await loadQueue();
        } else {
            toast.error(result.message);
        }
        setClaimingId(null);
    };

    const handleGiveBack = async (applicationId: number) => {
        setClaimingId(applicationId);
        const result = await releaseDDApplication(applicationId);
        if (result.success) {
            toast.success("Application returned to the queue - someone else can pick it up now");
            await loadQueue();
        } else {
            toast.error(result.message);
        }
        setClaimingId(null);
    };

    // Filter queue based on search query
    const filteredQueue = useMemo(() => {
        if (!searchQuery.trim()) return queue;
        
        const query = searchQuery.toLowerCase().trim();
        return queue.filter(item => 
            item.businessName.toLowerCase().includes(query) ||
            item.applicationId.toString().includes(query)
        );
    }, [queue, searchQuery]);

    // Categorize applications in simple terms
    const myWorkToDo = filteredQueue.filter(q =>
        q.primaryReviewerId === session?.user?.id &&
        (q.ddStatus === 'pending' || q.ddStatus === 'in_progress' || q.ddStatus === 'queried' || q.ddStatus === 'auto_reassigned')
    );
    
    const needsMySecondCheck = filteredQueue.filter(q => 
        q.ddStatus === 'awaiting_approval' && q.validatorReviewerId === session?.user?.id
    );

    const availableToPickUp = filteredQueue.filter(q => 
        (q.ddStatus === 'pending' || q.ddStatus === 'queried' || q.ddStatus === 'auto_reassigned') && 
        !q.primaryReviewerId
    );
    
    const beingDoneByOthers = filteredQueue.filter(q =>
        q.primaryReviewerId && 
        q.primaryReviewerId !== session?.user?.id &&
        (q.ddStatus === 'in_progress' || q.ddStatus === 'pending' || q.ddStatus === 'awaiting_approval')
    );
    
    const allCompleted = filteredQueue.filter(q => q.ddStatus === 'approved');

    // Calculate what needs attention
    const totalMyTasks = myWorkToDo.length + needsMySecondCheck.length;

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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ClipboardText className="h-8 w-8 text-emerald-600" weight="duotone" />
                            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                                Site Visits & Verification
                            </h1>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowHelp(!showHelp)}
                            className="gap-2"
                        >
                            <Question className="h-4 w-4" />
                            {showHelp ? "Hide Help" : "How does this work?"}
                        </Button>
                    </div>
                    <p className="text-slate-500">
                        Review applications by visiting businesses and verifying their information
                    </p>
                </div>

                {/* Help Section - Collapsible */}
                {showHelp && (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-blue-800 text-lg">
                                <Lightbulb className="h-5 w-5" weight="duotone" />
                                Quick Guide: How This Works
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-blue-900">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                                        Pick an Application
                                    </h4>
                                    <p className="text-sm text-blue-700 ml-8">
                                        Click &quot;Start This Review&quot; on any available application. This reserves it for you so no one else works on it.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                                        Do the Site Visit
                                    </h4>
                                    <p className="text-sm text-blue-700 ml-8">
                                        Visit the business, take photos, verify information, and fill in the checklist.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                                        Send for Second Check
                                    </h4>
                                    <p className="text-sm text-blue-700 ml-8">
                                        When done, choose a colleague to double-check your work. They&apos;ll review and approve.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">4</span>
                                        Second Checks for Others
                                    </h4>
                                    <p className="text-sm text-blue-700 ml-8">
                                        Sometimes colleagues will ask you to verify their work. You&apos;ll see those in &quot;Needs My Second Check&quot;.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-blue-200">
                                <p className="text-sm text-blue-600">
                                    <strong>💡 Tip:</strong> If you can&apos;t finish a review, click &quot;Give Back&quot; to return it to the queue for someone else.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Search Bar */}
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="🔍 Search by business name or application number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 py-6 text-base bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    )}
                </div>

                {/* Search Results Info */}
                {searchQuery && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
                        <p className="text-sm text-emerald-700">
                            Found <span className="font-semibold">{filteredQueue.length}</span> application{filteredQueue.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery("")}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                        >
                            Clear search
                        </Button>
                    </div>
                )}

                {/* Summary - What You Need To Do */}
                {totalMyTasks > 0 && (
                    <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 rounded-full">
                                    <Warning className="h-8 w-8 text-amber-600" weight="duotone" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-amber-800">
                                        You have {totalMyTasks} thing{totalMyTasks !== 1 ? 's' : ''} to do
                                    </h2>
                                    <p className="text-amber-700">
                                        {myWorkToDo.length > 0 && `${myWorkToDo.length} review${myWorkToDo.length !== 1 ? 's' : ''} to complete`}
                                        {myWorkToDo.length > 0 && needsMySecondCheck.length > 0 && ' • '}
                                        {needsMySecondCheck.length > 0 && `${needsMySecondCheck.length} second check${needsMySecondCheck.length !== 1 ? 's' : ''} needed`}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ====== SECTION 1: My Reviews to Complete ====== */}
                {myWorkToDo.length > 0 && (
                    <Card className="border-2 border-emerald-400 shadow-lg">
                        <CardHeader className="bg-emerald-50 border-b border-emerald-200">
                            <CardTitle className="flex items-center gap-3 text-emerald-800">
                                <div className="p-2 bg-emerald-600 rounded-lg">
                                    <Play className="h-5 w-5 text-white" weight="fill" />
                                </div>
                                <div>
                                    <span className="text-lg">My Reviews to Complete</span>
                                    <p className="text-sm font-normal text-emerald-600">
                                        These applications are assigned to you - click &quot;Continue Review&quot; to work on them
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {myWorkToDo.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-5 hover:bg-emerald-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100 rounded-full">
                                                <Buildings className="h-6 w-6 text-emerald-600" weight="duotone" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-lg">{item.businessName}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>Application #{item.applicationId}</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-medium">Score: {item.aggregateScore}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(item.ddStatus)}
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleGiveBack(item.applicationId)}
                                                disabled={claimingId === item.applicationId}
                                                className="text-gray-600 hover:text-red-600 hover:border-red-300"
                                            >
                                                <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                                                Give Back
                                            </Button>
                                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                                <Link href={`/reviewer/due-diligence/${item.applicationId}`}>
                                                    Continue Review
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ====== SECTION 2: Needs My Second Check ====== */}
                {needsMySecondCheck.length > 0 && (
                    <Card className="border-2 border-purple-400 shadow-lg">
                        <CardHeader className="bg-purple-50 border-b border-purple-200">
                            <CardTitle className="flex items-center gap-3 text-purple-800">
                                <div className="p-2 bg-purple-600 rounded-lg">
                                    <Eye className="h-5 w-5 text-white" weight="fill" />
                                </div>
                                <div>
                                    <span className="text-lg">Needs My Second Check</span>
                                    <p className="text-sm font-normal text-purple-600">
                                        A colleague finished their review and needs you to verify their work
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {needsMySecondCheck.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-5 hover:bg-purple-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-purple-100 rounded-full">
                                                <Buildings className="h-6 w-6 text-purple-600" weight="duotone" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-lg">{item.businessName}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>Application #{item.applicationId}</span>
                                                    <span>•</span>
                                                    <span className="text-purple-600 font-medium">
                                                        Reviewed by: {item.primaryReviewerName || "Unknown"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                                            <Link href={`/reviewer/due-diligence/${item.applicationId}`}>
                                                Review & Approve
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ====== SECTION 3: Available Applications ====== */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <ClipboardText className="h-5 w-5 text-gray-600" weight="duotone" />
                            </div>
                            <div>
                                <span className="text-lg">Available Applications</span>
                                <p className="text-sm font-normal text-gray-500">
                                    Click &quot;Start This Review&quot; to take an application and begin your site visit
                                </p>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-20 w-full" />
                                ))}
                            </div>
                        ) : availableToPickUp.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-300" weight="duotone" />
                                <p className="text-lg font-medium">No applications waiting</p>
                                <p className="text-sm">All applications have been picked up by the team</p>
                            </div>
                        ) : (
                            <div className="divide-y max-h-[500px] overflow-y-auto">
                                {availableToPickUp.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 rounded-full">
                                                <Buildings className="h-6 w-6 text-gray-600" weight="duotone" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">{item.businessName}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>Application #{item.applicationId}</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-medium">Score: {item.aggregateScore}%</span>
                                                    {item.isOversightInitiated && (
                                                        <>
                                                            <span>•</span>
                                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                                <Lightning className="h-3 w-3 mr-1" />
                                                                Priority
                                                            </Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(item.ddStatus)}
                                            <Button 
                                                onClick={() => handleStartReview(item.applicationId)}
                                                disabled={claimingId === item.applicationId}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {claimingId === item.applicationId ? (
                                                    "Please wait..."
                                                ) : (
                                                    <>
                                                        <HandGrabbing className="h-4 w-4 mr-2" />
                                                        Start This Review
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ====== SECTION 4: Being Done by Others ====== */}
                {beingDoneByOthers.length > 0 && (
                    <Card className="border-gray-200 bg-gray-50/50">
                        <CardHeader className="border-b border-gray-200">
                            <CardTitle className="flex items-center gap-3 text-gray-700">
                                <div className="p-2 bg-gray-200 rounded-lg">
                                    <UserCircle className="h-5 w-5 text-gray-500" weight="duotone" />
                                </div>
                                <div>
                                    <span className="text-lg">Being Done by Colleagues</span>
                                    <p className="text-sm font-normal text-gray-500">
                                        These are being worked on by other team members
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {beingDoneByOthers.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Buildings className="h-5 w-5 text-gray-400" weight="duotone" />
                                            <div>
                                                <span className="font-medium text-gray-700">{item.businessName}</span>
                                                <span className="text-sm text-gray-400 ml-2">#{item.applicationId}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-gray-500 bg-white">
                                            <UserCircle className="h-3 w-3 mr-1" />
                                            {item.primaryReviewerName || "Team member"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ====== SECTION 5: Completed ====== */}
                {allCompleted.length > 0 && (
                    <Card className="border-gray-200 opacity-75">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                                </div>
                                <div>
                                    <span className="text-lg">Completed Reviews</span>
                                    <p className="text-sm font-normal text-gray-500">
                                        {allCompleted.length} application{allCompleted.length !== 1 ? 's' : ''} fully verified
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                {allCompleted.map(item => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-center justify-between p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                                            <span className="text-gray-600">{item.businessName}</span>
                                            <span className="text-sm text-gray-400">#{item.applicationId}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/reviewer/due-diligence/${item.applicationId}`}>
                                                View
                                            </Link>
                                        </Button>
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
