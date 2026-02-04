"use client";

import { useState, useEffect, useMemo } from "react";
import { getDDQueue, checkApprovalDeadlines } from "@/lib/actions/due-diligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
    ClipboardText,
    Eye,
    Warning,
    Clock,
    UserCheck,
    ArrowRight,
    Lightning,
    ShieldCheck,
    MagnifyingGlass,
    X
} from "@phosphor-icons/react";

type DDQueueItem = {
    id: number;
    applicationId: number;
    businessName: string;
    aggregateScore: number;
    ddScore: number | null;
    displayScore: number;
    isOversightInitiated: boolean;
    ddStatus: string;
    scoreDisparity: number | null;
    primaryReviewerId: string | null;
    validatorReviewerId: string | null;
    approvalDeadline: Date | null;
};

function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        pending: { label: "Pending", variant: "outline" },
        in_progress: { label: "In Progress", variant: "secondary" },
        awaiting_approval: { label: "Awaiting Approval", variant: "default" },
        approved: { label: "Approved", variant: "default" },
        queried: { label: "Queried", variant: "destructive" },
        auto_reassigned: { label: "Auto-Reassigned", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function DueDiligencePage() {
    const [queue, setQueue] = useState<DDQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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

    const handleCheckDeadlines = async () => {
        setChecking(true);
        const result = await checkApprovalDeadlines();
        if (result.success) {
            toast.success(result.message);
            loadQueue(); // Refresh queue
        } else {
            toast.error(result.message);
        }
        setChecking(false);
    };

    useEffect(() => {
        loadQueue();
    }, []);

    // Filtered queue based on search and status filter
    const filteredQueue = useMemo(() => {
        return queue.filter(item => {
            const matchesSearch = !searchQuery || 
                item.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.applicationId.toString().includes(searchQuery);
            const matchesStatus = statusFilter === "all" || item.ddStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [queue, searchQuery, statusFilter]);

    const pendingCount = queue.filter(q => q.ddStatus === 'pending').length;
    const awaitingCount = queue.filter(q => q.ddStatus === 'awaiting_approval').length;
    const completedCount = queue.filter(q => q.ddStatus === 'approved').length;
    const oversightCount = queue.filter(q => q.isOversightInitiated).length;

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <ClipboardText className="h-8 w-8 text-emerald-600" weight="duotone" />
                    Due Diligence Queue
                </h1>
                <p className="text-gray-600">
                    Manage on-site verification visits for qualified applications (≥60% score)
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500">Pending</p>
                                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                            </div>
                            <Clock className="h-8 w-8 text-amber-400" weight="duotone" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500">Awaiting Approval</p>
                                <p className="text-2xl font-bold text-blue-600">{awaitingCount}</p>
                            </div>
                            <UserCheck className="h-8 w-8 text-blue-400" weight="duotone" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500">Completed</p>
                                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                            </div>
                            <ShieldCheck className="h-8 w-8 text-emerald-400" weight="duotone" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500">Oversight Initiated</p>
                                <p className="text-2xl font-bold text-purple-600">{oversightCount}</p>
                            </div>
                            <Lightning className="h-8 w-8 text-purple-400" weight="duotone" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by business name or App ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="queried">Queried</SelectItem>
                        <SelectItem value="auto_reassigned">Auto-Reassigned</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    onClick={handleCheckDeadlines}
                    disabled={checking}
                >
                    <Clock className="h-4 w-4 mr-2" />
                    {checking ? "Checking..." : "Check Deadlines"}
                </Button>
                <Button variant="outline" onClick={loadQueue}>
                    Refresh Queue
                </Button>
            </div>

            {/* Results count */}
            {(searchQuery || statusFilter !== "all") && (
                <div className="mb-4 text-sm text-gray-600">
                    Showing {filteredQueue.length} of {queue.length} applications
                    {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
                </div>
            )}

            {/* Queue Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Applications Queue</CardTitle>
                    <CardDescription>
                        Applications qualified for due diligence verification
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : filteredQueue.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ClipboardText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            {queue.length === 0 ? (
                                <>
                                    <p>No applications in the DD queue</p>
                                    <p className="text-sm">Applications with ≥60% aggregate score will appear here</p>
                                </>
                            ) : (
                                <>
                                    <p>No applications match your search</p>
                                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                                    <Button
                                        variant="link"
                                        onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                        className="mt-2"
                                    >
                                        Clear filters
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left p-3 font-medium text-gray-600">Business</th>
                                        <th className="text-left p-3 font-medium text-gray-600">Score</th>
                                        <th className="text-left p-3 font-medium text-gray-600">Status</th>
                                        <th className="text-left p-3 font-medium text-gray-600">Flags</th>
                                        <th className="text-left p-3 font-medium text-gray-600">Deadline</th>
                                        <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQueue.map(item => (
                                        <tr key={item.applicationId} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium text-gray-900">{item.businessName}</div>
                                                <div className="text-sm text-gray-500">App #{item.applicationId}</div>
                                            </td>
                                            <td className="p-3">
                                                <div>
                                                    <span className={`text-lg font-semibold ${item.ddScore !== null ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                        {item.displayScore}%
                                                    </span>
                                                    <p className="text-xs text-gray-500">
                                                        {item.ddScore !== null ? 'DD Score' : 'Review Avg'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {getStatusBadge(item.ddStatus)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    {item.isOversightInitiated && (
                                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                            <Lightning className="h-3 w-3 mr-1" />
                                                            Oversight
                                                        </Badge>
                                                    )}
                                                    {item.scoreDisparity && item.scoreDisparity > 10 && (
                                                        <Badge variant="destructive" className="bg-red-100 text-red-700">
                                                            <Warning className="h-3 w-3 mr-1" />
                                                            Disparity: {item.scoreDisparity}pts
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {item.approvalDeadline ? (
                                                    <div className="text-sm">
                                                        <div className="text-gray-600">
                                                            {format(new Date(item.approvalDeadline), "MMM d, h:mm a")}
                                                        </div>
                                                        <div className="text-xs text-amber-600">
                                                            {formatDistanceToNow(new Date(item.approvalDeadline), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button size="sm" asChild>
                                                    <Link href={`/admin/due-diligence/${item.applicationId}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Review
                                                        <ArrowRight className="h-4 w-4 ml-2" />
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
