"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApplications } from "@/lib/actions";
import {
  getApplicationStatusStats,
} from "@/lib/actions/application-status";
import { ApplicationListItem } from "@/lib/actions/admin-applications";
import { ApplicationStatusManager } from "@/components/admin/ApplicationStatusManager";
import { EvaluatorAssignmentManager } from "@/components/admin/EvaluatorAssignmentManager";
import {
  FileText,
  Users,
  TrendUp,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Funnel,
  Gear,
  DownloadSimple,
  Spinner,
  CaretRight,
  ChartBar,
} from "@phosphor-icons/react";
import { bulkDownloadApplications } from "@/lib/actions/bulk-download";

// --- Types & Interfaces ---

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface StatusStats {
  totalApplications: number;
  submitted: number;
  under_review: number;
  shortlisted: number;
  scoring_phase: number;
  dragons_den: number;
  finalist: number;
  approved: number;
  rejected: number;
  draft: number;
}

// Map status to clean, modern badges
const getStatusStyles = (status: string) => {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500 border-transparent",
    submitted: "bg-blue-50 text-blue-600 border-transparent",
    under_review: "bg-amber-50 text-amber-600 border-transparent",
    shortlisted: "bg-purple-50 text-purple-600 border-transparent",
    scoring_phase: "bg-indigo-50 text-indigo-600 border-transparent",
    dragons_den: "bg-orange-50 text-orange-600 border-transparent",
    finalist: "bg-rose-50 text-rose-600 border-transparent",
    approved: "bg-emerald-50 text-emerald-600 border-transparent",
    rejected: "bg-red-50 text-red-600 border-transparent",
  };
  return styles[status] || "bg-gray-100 text-gray-500 border-transparent";
};

const getStatusLabel = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// --- Components ---

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-white border border-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1">
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50/80 text-gray-900 group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6 text-gray-500" weight="duotone" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        </div>
      </div>
      <div className="mt-5 flex items-baseline">
        <h3 className="text-[32px] font-bold tracking-tight text-gray-900 leading-none">
          {value.toLocaleString()}
        </h3>
        {trend && (
          <span className="ml-3 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full">
            <TrendUp className="mr-1 h-3 w-3" weight="bold" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  const [stats, setStats] = useState<StatusStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // URL State
  const currentStatus = searchParams.get("status") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const currentTab = searchParams.get("tab") || "list";

  // Data Fetching
  const loadData = useCallback(async () => {
    setIsSearching(true);
    try {
      const [appsResult, statsResult] = await Promise.all([
        getApplications({
          status: currentStatus,
          search: currentSearch,
          page: currentPage,
          limit: 10,
        }),
        getApplicationStatusStats(),
      ]);

      if (appsResult.success && appsResult.data) {
        setApplications(appsResult.data);
        setPagination(
          appsResult.pagination || { total: 0, page: 1, limit: 10, pages: 1 }
        );
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data as StatusStats);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [currentStatus, currentSearch, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`?${params.toString()}`);
  };

  const handleSearch = (term: string) => {
    updateParams({ search: term, page: "1" });
  };

  const handleStatusFilter = (status: string) => {
    updateParams({ status: status === "all" ? null : status, page: "1" });
  };

  const handleTabChange = (tab: string) => {
    updateParams({ tab });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newIds = applications.map((app) => app.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...newIds])));
    } else {
      const pageIds = applications.map((app) => app.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
    }
  };

  const handleBulkDownload = () => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        const result = await bulkDownloadApplications(selectedIds);
        if (result.success && result.data) {
          const url = URL.createObjectURL(result.data.blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = result.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Download started");
          setSelectedIds([]);
        } else {
          toast.error("Download failed");
        }
      } catch (error) {
        toast.error("An error occurred during download");
      }
    });
  };

  // Derived State
  const allPageSelected =
    applications.length > 0 &&
    applications.every((app) => selectedIds.includes(app.id));
  const somePageSelected =
    applications.some((app) => selectedIds.includes(app.id)) && !allPageSelected;

  if (isLoading && !applications.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9FAFB]">
        <Spinner className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8 font-sans">
      <div className="mx-auto max-w-[1400px] space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between px-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Applications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track YouthAdapt Challenge submissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/analytics">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-700"
              >
                <ChartBar className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/admin/export">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-700"
              >
                <DownloadSimple className="mr-2 h-4 w-4" />
                Export
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            title="Total"
            value={stats?.totalApplications || 0}
            icon={FileText}
          />
          <StatCard
            title="Submitted"
            value={stats?.submitted || 0}
            icon={CheckCircle}
          />
          <StatCard
            title="Reviewing"
            value={stats?.under_review || 0}
            icon={Clock}
          />
          <StatCard
            title="Shortlisted"
            value={stats?.shortlisted || 0}
            icon={Users}
          />
          <StatCard
            title="Scoring"
            value={stats?.scoring_phase || 0}
            icon={Gear}
          />
          <StatCard
            title="Finalists"
            value={(stats?.dragons_den || 0) + (stats?.finalist || 0)}
            icon={TrendUp}
          />
        </div>

        {/* Main Content */}
        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b border-gray-200 pb-1 px-1">
            <TabsList className="h-9 bg-transparent p-0">
              <TabsTrigger
                value="list"
                className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-gray-500 shadow-none transition-none data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 data-[state=active]:shadow-none hover:text-gray-700"
              >
                All Applications
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-gray-500 shadow-none transition-none data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 data-[state=active]:shadow-none hover:text-gray-700"
              >
                Status Pipeline
              </TabsTrigger>
              <TabsTrigger
                value="assign"
                className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-gray-500 shadow-none transition-none data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 data-[state=active]:shadow-none hover:text-gray-700"
              >
                Evaluators
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-2 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
              <div className="flex flex-1 items-center gap-2 px-3">
                <MagnifyingGlass className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search applications..."
                  defaultValue={currentSearch}
                  className="h-9 w-full border-0 bg-transparent p-0 text-sm focus-visible:ring-0 sm:w-[300px] placeholder:text-gray-400"
                  onChange={(e) => {
                    // Optional debounced search could go here
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSearch((e.target as any).value)
                  }
                />
              </div>
              <div className="flex items-center gap-2 border-t border-gray-50 p-2 sm:border-t-0 sm:p-0">
                <Select
                  value={currentStatus}
                  onValueChange={handleStatusFilter}
                >
                  <SelectTrigger className="h-8 w-[140px] border-0 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 data-[state=open]:bg-gray-100">
                    <Funnel className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="scoring_phase">Scoring Phase</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border-0 bg-blue-50/50 px-4 py-3 text-blue-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-blue-600" weight="fill" />
                  {selectedIds.length} selected
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-700 hover:bg-blue-100 hover:text-blue-900"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-blue-600 text-white hover:bg-blue-700 shadow-none border-0 rounded-lg"
                    onClick={handleBulkDownload}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Spinner className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <DownloadSimple className="mr-2 h-3.5 w-3.5" />
                    )}
                    Download CSV
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-[24px] border border-white/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/40 hover:bg-gray-50/40 border-b border-gray-100">
                    <TableHead className="w-[40px] px-4">
                      <Checkbox
                        checked={allPageSelected ? true : (somePageSelected ? "indeterminate" : false)}
                        onCheckedChange={handleSelectAll}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      Applicant
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      Business Info
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      Submission Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold uppercase tracking-wider text-gray-400 py-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSearching ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <Spinner className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : applications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-32 text-center text-gray-500"
                      >
                        No applications found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app) => (
                      <TableRow
                        key={app.id}
                        className={`group border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${selectedIds.includes(app.id) ? "bg-gray-50/80" : ""
                          }`}
                      >
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedIds.includes(app.id)}
                            onCheckedChange={(c) =>
                              handleSelectRow(app.id, c as boolean)
                            }
                            className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-600">
                          #{app.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-gray-900">
                              {app.business?.applicant?.firstName}{" "}
                              {app.business?.applicant?.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {app.applicant?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-gray-900">
                              {app.business?.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              {app.business?.country} • {app.business?.sector}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {app.submittedAt
                            ? format(new Date(app.submittedAt), "MMM d, yyyy")
                            : "Draft"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(
                              app.status
                            )}`}
                          >
                            {getStatusLabel(app.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/applications/${app.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-900"
                            >
                              <CaretRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 px-1">
              <p className="text-sm text-gray-500">
                Showing {Math.min(pagination.limit, applications.length)} of{" "}
                {pagination.total} applications
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateParams({ page: String(pagination.page - 1) })
                  }
                  disabled={pagination.page <= 1}
                  className="h-8 border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateParams({ page: String(pagination.page + 1) })
                  }
                  disabled={pagination.page >= pagination.pages}
                  className="h-8 border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status">
            <ApplicationStatusManager
              applications={applications.map(app => ({
                id: app.id,
                status: app.status as any,
                business: {
                  ...app.business,
                  applicant: {
                    ...app.business.applicant,
                    email: app.applicant.email
                  }
                },
                createdAt: app.submittedAt ? new Date(app.submittedAt) : new Date()
              }))}
            />
          </TabsContent>

          <TabsContent value="assign">
            <EvaluatorAssignmentManager
              applications={applications.map(app => ({
                id: app.id,
                status: app.status,
                business: {
                  ...app.business,
                  applicant: {
                    ...app.business.applicant,
                    email: app.applicant.email
                  }
                },
                createdAt: app.submittedAt ? new Date(app.submittedAt) : new Date()
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
