"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Eye,
    Buildings,
    MapPin,
    CalendarBlank,
    ArrowRight,
    MagnifyingGlass,
    Funnel,
    Spinner,
    CaretLeft,
    CaretRight,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    getApplications,
    type ApplicationListItem,
} from "@/lib/actions/admin-applications";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getAssignedApplications } from "@/lib/actions/reviewer-assignment";

const ITEMS_PER_PAGE = 20;

// Loading fallback for Suspense
function ReviewerApplicationsLoading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Spinner className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );
}

export default function ReviewerApplicationsPage() {
    return (
        <Suspense fallback={<ReviewerApplicationsLoading />}>
            <ReviewerApplicationsContent />
        </Suspense>
    );
}

function ReviewerApplicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [applications, setApplications] = useState<ApplicationListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    // Filters and pagination from URL
    const currentSearch = searchParams.get("search") || "";
    const currentTrack = searchParams.get("track") || "all";
    const currentPage = Number(searchParams.get("page")) || 1;

    // Load user and applications
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get current user
            const user = await getCurrentUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }

            const allowedRoles = ["reviewer_1", "reviewer_2", "admin", "technical_reviewer"];
            if (!allowedRoles.includes(user.role || "")) {
                router.push("/");
                return;
            }

            setUserRole(user.role || null);

            // For reviewers, use assignment-based filtering
            if (user.role === "reviewer_1" || user.role === "reviewer_2") {
                // First, get the list of assigned application IDs
                const assignedResult = await getAssignedApplications({
                    page: 1,
                    limit: 1000, // Get all assigned IDs
                    track: currentTrack !== "all" ? (currentTrack as "foundation" | "acceleration") : undefined,
                });

                if (assignedResult.success && assignedResult.data) {
                    const assignedIds = assignedResult.data.applications.map(a => a.applicationId);

                    if (assignedIds.length === 0) {
                        // No applications assigned yet
                        setApplications([]);
                        setTotalCount(0);
                    } else {
                        // Fetch all applications and filter by assigned IDs
                        const result = await getApplications({
                            page: currentPage,
                            limit: ITEMS_PER_PAGE,
                            track: currentTrack !== "all" ? (currentTrack as "foundation" | "acceleration") : undefined,
                        });

                        if (result.success && result.data) {
                            // Filter to only show assigned applications
                            const filteredApps = result.data.filter(app => assignedIds.includes(app.id));
                            setApplications(filteredApps);
                            setTotalCount(assignedResult.data.total);
                        } else {
                            toast.error("Failed to load applications");
                        }
                    }
                } else {
                    toast.error("Failed to load assigned applications");
                }
            } else {
                // Admin/technical reviewers see all applications
                const result = await getApplications({
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    track: currentTrack !== "all" ? (currentTrack as "foundation" | "acceleration") : undefined,
                    search: currentSearch || undefined,
                });

                if (result.success && result.data) {
                    setApplications(result.data);
                    setTotalCount(result.pagination.total);
                } else {
                    toast.error("Failed to load applications");
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("An error occurred while loading data");
        } finally {
            setIsLoading(false);
        }
    }, [router, currentSearch, currentTrack, currentPage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Update URL params
    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "all") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.push(`?${params.toString()}`);
    };

    const handleSearch = (term: string) => {
        updateParams({ search: term || null, page: "1" }); // Reset to page 1 on search
    };

    const handleTrackFilter = (track: string) => {
        updateParams({ track: track === "all" ? null : track, page: "1" }); // Reset to page 1
    };

    const handlePageChange = (page: number) => {
        updateParams({ page: page.toString() });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
            under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-700" },
            pending_senior_review: { label: "Awaiting R2", color: "bg-purple-100 text-purple-700" },
            scoring_phase: { label: "Scoring", color: "bg-indigo-100 text-indigo-700" },
            finalist: { label: "Finalist", color: "bg-emerald-100 text-emerald-700" },
            approved: { label: "Approved", color: "bg-green-100 text-green-700" },
            rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
        };
        const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700" };
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    const getRoleDescription = () => {
        if (userRole === "reviewer_1") return "Applications awaiting your first review";
        if (userRole === "reviewer_2") return "Applications awaiting your second review";
        return "All applications pending review";
    };

    // Pagination calculations
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10"
                        asChild
                    >
                        <Link href="/reviewer">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                            Applications
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {getRoleDescription()}
                        </p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    {/* Search */}
                    <div className="relative w-full sm:w-[320px]">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search business name..."
                            className="pl-9 h-10 bg-gray-50/50 border-transparent focus:bg-white focus:border-blue-500 transition-all rounded-xl"
                            defaultValue={currentSearch}
                            onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleSearch((e.currentTarget as HTMLInputElement).value)
                            }
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Track Filter */}
                        <Select value={currentTrack} onValueChange={handleTrackFilter}>
                            <SelectTrigger className="h-9 w-[140px] rounded-xl border-gray-200 bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500">
                                <Funnel className="mr-2 h-4 w-4 text-gray-500" />
                                <SelectValue placeholder="Track" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tracks</SelectItem>
                                <SelectItem value="foundation">Foundation</SelectItem>
                                <SelectItem value="acceleration">Acceleration</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-500">
                    {totalCount > 0 ? (
                        <>Showing <span className="font-semibold text-gray-900">{startItem}-{endItem}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> applications</>
                    ) : (
                        <>Showing <span className="font-semibold text-gray-900">{applications.length}</span> applications</>
                    )}
                </div>

                {/* Applications List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Spinner className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : applications.length === 0 ? (
                    <Card className="border-gray-100 shadow-sm">
                        <CardContent className="py-12 text-center">
                            <MagnifyingGlass className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No applications found</p>
                            <p className="text-gray-400 text-sm">Try adjusting your filters or search term</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app: ApplicationListItem) => (
                            <Card key={app.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Buildings className="h-5 w-5 text-blue-600" weight="duotone" />
                                                <h3 className="font-semibold text-lg text-gray-900">
                                                    {app.business?.name || "Unnamed Business"}
                                                </h3>
                                                {getStatusBadge(app.status)}
                                                {app.track && (
                                                    <Badge variant="outline" className="capitalize">
                                                        {app.track}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {app.business?.county?.replace(/_/g, " ") || "N/A"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CalendarBlank className="h-4 w-4" />
                                                    {app.submittedAt
                                                        ? format(new Date(app.submittedAt), "MMM d, yyyy")
                                                        : "Not submitted"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/reviewer/applications/${app.id}`}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                                                asChild
                                            >
                                                <Link href={`/reviewer/applications/${app.id}`}>
                                                    Review
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="h-9 px-3"
                        >
                            <CaretLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        <div className="flex items-center gap-1">
                            {/* First page */}
                            {currentPage > 3 && (
                                <>
                                    <Button
                                        variant={currentPage === 1 ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(1)}
                                        className="h-9 w-9 p-0"
                                    >
                                        1
                                    </Button>
                                    {currentPage > 4 && <span className="px-2 text-gray-400">...</span>}
                                </>
                            )}

                            {/* Page numbers around current */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                                .map(page => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(page)}
                                        className="h-9 w-9 p-0"
                                    >
                                        {page}
                                    </Button>
                                ))}

                            {/* Last page */}
                            {currentPage < totalPages - 2 && (
                                <>
                                    {currentPage < totalPages - 3 && <span className="px-2 text-gray-400">...</span>}
                                    <Button
                                        variant={currentPage === totalPages ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(totalPages)}
                                        className="h-9 w-9 p-0"
                                    >
                                        {totalPages}
                                    </Button>
                                </>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="h-9 px-3"
                        >
                            Next
                            <CaretRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
