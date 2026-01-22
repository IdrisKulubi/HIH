"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    initializeReviewerQueue,
    bulkAssignApplicationsToReviewers,
    getAssignmentStats,
    toggleReviewerActive,
    redistributeAssignments,
    bulkAssignSecondReviewers,
    redistributeSecondReviewers,
} from "@/lib/actions/reviewer-assignment";
import { Spinner, Users, CheckCircle, XCircle, ArrowsClockwise, UserCirclePlus } from "@phosphor-icons/react";

interface ReviewerStat {
    reviewerId: string;
    reviewerName: string;
    role: string;
    assignmentCount: number;
    isActive: boolean;
}

export default function AssignmentManagementPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isRedistributing, setIsRedistributing] = useState(false);
    const [isAssigningR2, setIsAssigningR2] = useState(false);
    const [isRedistributingR2, setIsRedistributingR2] = useState(false);
    const [stats, setStats] = useState<{
        totalApplications: number;
        assignedToReviewer1: number;
        assignedToReviewer2: number;
        unassigned: number;
        reviewerStats: ReviewerStat[];
    } | null>(null);

    const loadStats = async () => {
        setIsLoading(true);
        const result = await getAssignmentStats();
        if (result.success && result.data) {
            setStats(result.data);
        } else {
            toast.error("Failed to load assignment stats");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleInitializeQueue = async () => {
        setIsInitializing(true);
        const result = await initializeReviewerQueue();
        if (result.success) {
            toast.success(result.message);
            loadStats();
        } else {
            toast.error(result.message);
        }
        setIsInitializing(false);
    };

    const handleBulkAssign = async () => {
        setIsAssigning(true);
        const result = await bulkAssignApplicationsToReviewers();
        if (result.success) {
            toast.success(result.message);
            loadStats();
        } else {
            toast.error(result.message);
        }
        setIsAssigning(false);
    };

    const handleRedistribute = async () => {
        if (!confirm("This will clear all current assignments and redistribute evenly among active reviewers. Are you sure?")) {
            return;
        }
        setIsRedistributing(true);
        const result = await redistributeAssignments();
        if (result.success) {
            toast.success(result.message);
            loadStats();
        } else {
            toast.error(result.message);
        }
        setIsRedistributing(false);
    };

    const handleBulkAssignR2 = async () => {
        setIsAssigningR2(true);
        const result = await bulkAssignSecondReviewers();
        if (result.success) {
            toast.success(result.message);
            loadStats();
        } else {
            toast.error(result.message);
        }
        setIsAssigningR2(false);
    };

    const handleRedistributeR2 = async () => {
        if (!confirm("This will clear all R2 assignments and redistribute evenly among active second reviewers. Are you sure?")) {
            return;
        }
        setIsRedistributingR2(true);
        const result = await redistributeSecondReviewers();
        if (result.success) {
            toast.success(result.message);
            loadStats();
        } else {
            toast.error(result.message);
        }
        setIsRedistributingR2(false);
    };

    const handleToggleReviewer = async (reviewerId: string, currentActive: boolean) => {
        const result = await toggleReviewerActive(reviewerId, !currentActive);
        if (result.success) {
            toast.success(`Reviewer ${!currentActive ? "activated" : "deactivated"}`);
            loadStats();
        } else {
            toast.error(result.message || "Failed to update reviewer");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const reviewer1Stats = stats?.reviewerStats.filter(r => r.role === "reviewer_1") || [];
    const reviewer2Stats = stats?.reviewerStats.filter(r => r.role === "reviewer_2") || [];

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Reviewer Assignment Management</h1>
                <p className="text-slate-600 mt-2">
                    Manage which reviewers receive application assignments and distribute workload evenly.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-slate-900">{stats?.totalApplications || 0}</div>
                        <div className="text-sm text-slate-600">Total Applications</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats?.assignedToReviewer1 || 0}</div>
                        <div className="text-sm text-slate-600">Assigned to R1</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats?.assignedToReviewer2 || 0}</div>
                        <div className="text-sm text-slate-600">Assigned to R2</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">{stats?.unassigned || 0}</div>
                        <div className="text-sm text-slate-600">Unassigned</div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Assignment Actions</CardTitle>
                    <CardDescription>
                        Initialize the reviewer queue or bulk assign unassigned applications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button
                        onClick={handleInitializeQueue}
                        disabled={isInitializing}
                        variant="outline"
                    >
                        {isInitializing ? (
                            <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Users className="w-4 h-4 mr-2" />
                        )}
                        Initialize Reviewer Queue
                    </Button>
                    <Button
                        onClick={handleBulkAssign}
                        disabled={isAssigning || (stats?.unassigned || 0) === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isAssigning ? (
                            <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowsClockwise className="w-4 h-4 mr-2" />
                        )}
                        Bulk Assign {stats?.unassigned || 0} Apps
                    </Button>
                    <Button
                        onClick={handleRedistribute}
                        disabled={isRedistributing || (stats?.totalApplications || 0) === 0}
                        variant="destructive"
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isRedistributing ? (
                            <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowsClockwise className="w-4 h-4 mr-2" />
                        )}
                        Redistribute R1
                    </Button>
                    <Button variant="ghost" onClick={loadStats}>
                        <ArrowsClockwise className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            {/* R2 Actions Card */}
            <Card className="mb-8 border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">R2</Badge>
                        Second Reviewer Actions
                    </CardTitle>
                    <CardDescription>
                        Assign or redistribute second reviewer assignments for applications that have completed first review.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <Button
                        onClick={handleBulkAssignR2}
                        disabled={isAssigningR2}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isAssigningR2 ? (
                            <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <UserCirclePlus className="w-4 h-4 mr-2" />
                        )}
                        Assign R2s to Reviewed Apps
                    </Button>
                    <Button
                        onClick={handleRedistributeR2}
                        disabled={isRedistributingR2 || (stats?.assignedToReviewer2 || 0) === 0}
                        variant="destructive"
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isRedistributingR2 ? (
                            <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowsClockwise className="w-4 h-4 mr-2" />
                        )}
                        Redistribute R2 Evenly
                    </Button>
                </CardContent>
            </Card>

            {/* Reviewer Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* First Reviewers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">R1</Badge>
                            First Reviewers
                        </CardTitle>
                        <CardDescription>
                            Select which reviewers should receive first-round assignments.
                            Unchecked reviewers will be excluded from auto-assignment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reviewer1Stats.length === 0 ? (
                            <p className="text-slate-500 text-sm">
                                No first reviewers found. Click &quot;Initialize Reviewer Queue&quot; to add reviewers.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {reviewer1Stats.map((reviewer) => (
                                    <div
                                        key={reviewer.reviewerId}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${reviewer.isActive ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={reviewer.isActive}
                                                onCheckedChange={() => handleToggleReviewer(reviewer.reviewerId, reviewer.isActive)}
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {reviewer.reviewerName || "Unknown"}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {reviewer.reviewerId.substring(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {reviewer.assignmentCount} assigned
                                            </Badge>
                                            {reviewer.isActive ? (
                                                <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-slate-400" weight="fill" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Second Reviewers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">R2</Badge>
                            Second Reviewers
                        </CardTitle>
                        <CardDescription>
                            Select which reviewers should receive second-round assignments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reviewer2Stats.length === 0 ? (
                            <p className="text-slate-500 text-sm">
                                No second reviewers found. Click &quot;Initialize Reviewer Queue&quot; to add reviewers.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {reviewer2Stats.map((reviewer) => (
                                    <div
                                        key={reviewer.reviewerId}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${reviewer.isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={reviewer.isActive}
                                                onCheckedChange={() => handleToggleReviewer(reviewer.reviewerId, reviewer.isActive)}
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {reviewer.reviewerName || "Unknown"}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {reviewer.reviewerId.substring(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {reviewer.assignmentCount} assigned
                                            </Badge>
                                            {reviewer.isActive ? (
                                                <CheckCircle className="w-5 h-5 text-blue-600" weight="fill" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-slate-400" weight="fill" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
