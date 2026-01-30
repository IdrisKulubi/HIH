"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getApplications,
  ApplicationListItem,
  getApplicationStats,
} from "@/lib/actions/admin-applications";
import { reconcileRejectedApplications } from "@/lib/actions/reconcile-applications";
import { getObservationStats } from "@/lib/actions/observation";
import { DashboardStats } from "@/components/application/admin/DashboardStats";
import { FeedbackDisplay } from "@/components/application/admin/FeedbackDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Spinner,
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  ChartBar,
  CaretRight,
  Briefcase,
  MapPin,
  Buildings,
  Binoculars,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Loading fallback for Suspense
function ApplicationsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

// Main page wrapper with Suspense
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsLoading />}>
      <ApplicationsContent />
    </Suspense>
  );
}

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [observationStats, setObservationStats] = useState<{ totalObservation: number } | null>(null);
  const [totalApplications, setTotalApplications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);

  // Filters state
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentStatus = searchParams.get("status") || "all";
  const currentScoreRange = searchParams.get("scoreRange") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentTab = searchParams.get("tab") || "all";

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (currentSearch) setIsSearching(true);

      const [data, statsData] = await Promise.all([
        getApplications({
          status: currentStatus,
          scoreRange: currentScoreRange as 'all' | 'passing' | 'borderline' | 'below' | 'not_scored',
          search: currentSearch,
          track: currentTab !== "all" ? (currentTab as any) : undefined,
          page: currentPage,
          limit: 10,
        }),
        getApplicationStats(),
      ]);

      // Fetch observation stats
      const obsStats = await getObservationStats();
      if (obsStats.success && obsStats.data) {
        setObservationStats(obsStats.data);
      }

      if (data.success && data.data) {
        setApplications(data.data);
        setTotalApplications(data.pagination.total);
      } else {
        toast.error("Failed to load applications");
      }

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("An error occurred while loading data");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setIsStatsLoading(false);
    }
  }, [currentStatus, currentScoreRange, currentSearch, currentTab, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`?${params.toString()}`);
  };

  const handleSearch = (term: string) => {
    updateParams({ search: term || null, page: "1" });
  };

  const handleStatusFilter = (status: string) => {
    updateParams({ status: status === "all" ? null : status, page: "1" });
  };

  const handleScoreFilter = (range: string) => {
    updateParams({ scoreRange: range === "all" ? null : range, page: "1" });
  };

  const handleTabChange = (tab: string) => {
    updateParams({ tab: tab === "all" ? null : tab, page: "1" });
  };

  const handleReconcile = async () => {
    if (!confirm("This will find all 'Rejected' applications with a score >= 60% and move them to 'Approved' or 'Scoring Phase'. Continue?")) {
      return;
    }

    setIsReconciling(true);
    try {
      const result = await reconcileRejectedApplications();
      if (result.success) {
        toast.success(result.message);
        loadData(); // Refresh list and stats
      } else {
        toast.error(result.error || "Reconciliation failed");
      }
    } catch (error) {
      console.error("Reconciliation error:", error);
      toast.error("An unexpected error occurred during reconciliation");
    } finally {
      setIsReconciling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-blue-50 text-blue-600 border-blue-200";
      case "under_review": return "bg-purple-50 text-purple-600 border-purple-200";
      case "scoring_phase": return "bg-orange-50 text-orange-600 border-orange-200";
      case "approved": return "bg-green-50 text-green-600 border-green-200";
      case "rejected": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-gray-50 text-gray-500 border-gray-100";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Applications
          </h1>
          <p className="text-sm text-gray-500">
            Monitor and manage incoming applications.
          </p>
        </div>

        {/* Apple-style Stats Cards */}
        <DashboardStats stats={stats} />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex flex-col gap-5">

        {/* Intelligent Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
          {/* Search */}
          <div className="relative w-full sm:w-[320px]">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applicant, business, or ID..."
              className="pl-9 h-10 bg-gray-50/50 border-transparent focus:bg-white focus:border-blue-500 transition-all rounded-xl"
              defaultValue={currentSearch}
              onKeyDown={(e) => e.key === "Enter" && handleSearch((e.currentTarget as HTMLInputElement).value)}
            />
          </div>

          {/* Track Tabs (Pills) */}
          <div className="flex p-1 bg-gray-100/50 rounded-xl">
            {['all', 'foundation', 'acceleration'].map((tab) => {
              // Get count for this tab from stats
              const getTabCount = () => {
                if (!stats) return null;
                if (tab === 'all') return stats.totalApplications || 0;
                if (tab === 'foundation') return stats.foundationTrack || 0;
                if (tab === 'acceleration') return stats.accelerationTrack || 0;
                return null;
              };
              const count = getTabCount();

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    (currentTab === tab || (tab === 'all' && !currentTab))
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {tab === 'all' ? 'All Tracks' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {count !== null && (
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      (currentTab === tab || (tab === 'all' && !currentTab))
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Observation Button */}
            <Link href="/admin/observation">
              <button
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                )}
              >
                <Binoculars className="h-3.5 w-3.5" weight="duotone" />
                Observation
                {observationStats?.totalObservation !== undefined && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {observationStats.totalObservation}
                  </span>
                )}
              </button>
            </Link>
          </div>


        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={currentScoreRange} onValueChange={handleScoreFilter}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl border-gray-200 bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500">
              <ChartBar className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="System Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="passing">Passing (60%+)</SelectItem>
              <SelectItem value="borderline">Borderline (40-59%)</SelectItem>
              <SelectItem value="below">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentStatus} onValueChange={handleStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl border-gray-200 bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500">
              <Funnel className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Application Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['submitted', 'under_review', 'scoring_phase', 'approved', 'rejected'].map(s => (
                <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReconcile}
            disabled={isReconciling}
            className="h-9 rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium"
          >
            {isReconciling ? <Spinner className="mr-2 h-3 w-3 animate-spin" /> : <ArrowsCounterClockwise className="mr-2 h-3 w-3" />}
            Fix Pass Marks
          </Button>
        </div>

        {/* 3. Rich Table */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead className="w-[80px] text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">ID</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Applicant</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Business Profile</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">System Check</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Spinner className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-sm font-medium">Loading applications...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1 text-gray-500">
                      <MagnifyingGlass className="h-8 w-8 text-gray-300" />
                      <span className="text-sm font-medium">No results found</span>
                      <span className="text-xs text-gray-400">Try adjusting your filters</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow
                    key={app.id}
                    className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/applications/${app.id}`)}
                  >
                    {/* ID */}
                    <TableCell className="font-mono text-xs text-gray-400">
                      #{app.id.toString().padStart(4, '0')}
                    </TableCell>

                    {/* Applicant */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-gray-100">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${app.applicant?.firstName || 'U'}+${app.applicant?.lastName || ''}&background=random`} />
                          <AvatarFallback>{(app.applicant?.firstName?.[0] || 'N') + (app.applicant?.lastName?.[0] || 'A')}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {app.applicant?.firstName} {app.applicant?.lastName}
                          </span>
                          <span className="text-xs text-gray-500">{app.applicant?.email || 'No email'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Business */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">{app.business?.name || 'Unnamed Business'}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {app.track && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                              app.track === 'foundation' ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {app.track === 'foundation' ? 'FND' : 'ACC'}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Briefcase className="mr-1 h-3 w-3" />
                            {app.business?.sector || 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {app.business?.county || app.business?.city || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* System Check / Score */}
                    <TableCell>
                      <FeedbackDisplay
                        totalScore={app.eligibilityResults[0]?.totalScore ?? null}
                        isEligible={app.eligibilityResults[0]?.isEligible ?? false}
                        eligibilityFlags={app.eligibilityResults[0] ? {
                          ageEligible: app.eligibilityResults[0].ageEligible,
                          registrationEligible: app.eligibilityResults[0].registrationEligible,
                          revenueEligible: app.eligibilityResults[0].revenueEligible,
                          businessPlanEligible: app.eligibilityResults[0].businessPlanEligible,
                          impactEligible: app.eligibilityResults[0].impactEligible,
                        } : undefined}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        getStatusColor(app.status)
                      )}>
                        {getStatusLabel(app.status)}
                      </div>
                    </TableCell>

                    {/* Arrow */}
                    <TableCell>
                      <CaretRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="border-t border-gray-100 p-4 bg-gray-50/30">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) updateParams({ page: (currentPage - 1).toString() });
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {/* Simple pagination logic for now */}
                <PaginationItem>
                  <PaginationLink isActive>{currentPage}</PaginationLink>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (applications.length === 10) updateParams({ page: (currentPage + 1).toString() });
                    }}
                    className={applications.length < 10 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}
