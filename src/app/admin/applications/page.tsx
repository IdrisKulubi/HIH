"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState, useCallback, useRef, Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  getApplicationsByStatus,
  getApplicationStatusStats,
} from "@/lib/actions/application-status";
import { ApplicationStatusManager } from "@/components/admin/ApplicationStatusManager";
import { EvaluatorAssignmentManager } from "@/components/admin/EvaluatorAssignmentManager";
import {
  Eye,
  FileText,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Settings,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompactEnhancedDocumentDownload } from "@/components/admin/EnhancedDocumentDownload";
import { bulkDownloadApplications } from "@/lib/actions/bulk-download";

// Map status to badge color with modern styling
const statusColors: Record<string, string> = {
  draft:
    "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300",
  submitted:
    "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300",
  under_review:
    "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300",
  approved:
    "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300",
  rejected:
    "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300",
};

interface Application {
  id: number;
  status: string;
  submittedAt: Date | string | null;
  business: {
    name: string;
    country: string;
    applicant: {
      firstName: string;
      lastName: string;
    };
  };
  eligibilityResults: Array<{
    isEligible: boolean;
    evaluatedBy?: string | null;
    evaluatedAt?: Date | string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluator?: any;
  }>;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow additional properties
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Loading component for Suspense fallback
function ApplicationsPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function ApplicationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statusStats, setStatusStats] = useState<any>(null);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const initialLoadDone = useRef(false);

  // Bulk selection state
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [isDownloading, startTransition] = useTransition();

  // URL params
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [tab, setTab] = useState(searchParams.get("tab") || "list");

  const limit = 10;

  // Update URL without reload
  const updateURL = useCallback(
    (newParams: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "1" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      const newURL = `${window.location.pathname}?${params.toString()}`;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router]
  );

  // Fetch applications data
  const fetchApplications = useCallback(
    async (
      currentStatus: string,
      currentSearch: string,
      currentPage: number
    ) => {
      setSearching(true);
      try {
        const result = await getApplications({
          status: currentStatus,
          search: currentSearch,
          page: currentPage,
          limit,
        });

        if (result.success) {
          setApplications((result.data as Application[]) || []);
          setPagination(
            result.pagination || {
              total: 0,
              page: currentPage,
              limit,
              pages: 1,
            }
          );
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setSearching(false);
      }
    },
    [limit]
  );

  // Fetch status stats
  const fetchStatusStats = useCallback(async () => {
    try {
      const result = await getApplicationStatusStats();
      if (result.success) {
        setStatusStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching status stats:", error);
    }
  }, []);

  // Fetch all applications for management tabs
  const fetchAllApplications = useCallback(async () => {
    try {
      const result = await getApplicationsByStatus(undefined, 1, 100);
      if (result.success) {
        setAllApplications((result.data?.applications as Application[]) || []);
      }
    } catch (error) {
      console.error("Error fetching all applications:", error);
    }
  }, []);

  // This effect handles all data fetching, both initial and subsequent.
  useEffect(() => {
    const loadData = async () => {
      // On the first run, fetch all data and show the main loading skeleton.
      if (!initialLoadDone.current) {
        setLoading(true);
        await Promise.all([
          fetchApplications(status, search, page),
          fetchStatusStats(),
          fetchAllApplications(),
        ]);
        setLoading(false);
        initialLoadDone.current = true;
      } else {
        // On subsequent runs (filter changes), only fetch the applications list.
        // The `searching` state inside `fetchApplications` will handle the loading indicator.
        fetchApplications(status, search, page);
      }
    };

    loadData();
  }, [
    status,
    search,
    page,
    fetchApplications,
    fetchStatusStats,
    fetchAllApplications,
  ]);

  // Handle status change
  const handleStatusChange = useCallback(
    (newStatus: string) => {
      setStatus(newStatus);
      setPage(1);
      updateURL({ status: newStatus, search, page: "1", tab });
    },
    [search, tab, updateURL]
  );

  // Handle search
  const handleSearch = useCallback(
    (newSearch: string) => {
      console.log('Search triggered, preserving selections:', selectedApplications);
      setSearch(newSearch);
      setPage(1);
      updateURL({ status, search: newSearch, page: "1", tab });
    },
    [status, tab, updateURL, selectedApplications]
  );

  // Handle page change - instant without reload
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage === page || newPage < 1 || newPage > pagination.pages) return;

      setPage(newPage);
      updateURL({ status, search, page: newPage.toString(), tab });
    },
    [page, pagination.pages, status, search, tab, updateURL]
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (newTab: string) => {
      setTab(newTab);
      updateURL({ status, search, page: page.toString(), tab: newTab });
    },
    [status, search, page, updateURL]
  );

  // Handle application selection
  const handleSelectApplication = useCallback((appId: number, selected: boolean) => {
    console.log('Selection change:', { appId, selected, currentSelections: selectedApplications });
    setSelectedApplications(prev => {
      const newSelection = selected ? [...prev, appId] : prev.filter(id => id !== appId);
      console.log('New selection state:', newSelection);
      return newSelection;
    });
  }, [selectedApplications]);

  // Handle select all for current page only
  const handleSelectAll = useCallback((selected: boolean) => {
    const currentPageIds = applications.map(app => app.id);

    if (selected) {
      // Add all current page applications to selection (avoid duplicates)
      setSelectedApplications(prev => {
        const newSelections = currentPageIds.filter(id => !prev.includes(id));
        return [...prev, ...newSelections];
      });
    } else {
      // Remove all current page applications from selection
      setSelectedApplications(prev =>
        prev.filter(id => !currentPageIds.includes(id))
      );
    }
  }, [applications]);

  // Check if all current page applications are selected
  const areAllCurrentPageSelected = applications.length > 0 &&
    applications.every(app => selectedApplications.includes(app.id));

  // Check if some current page applications are selected (for indeterminate state)
  const areSomeCurrentPageSelected = applications.some(app =>
    selectedApplications.includes(app.id)
  );

  // Handle bulk download
  const handleBulkDownload = useCallback(() => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications to download");
      return;
    }

    startTransition(async () => {
      try {
        const result = await bulkDownloadApplications(selectedApplications);

        if (!result.success || !result.data) {
          toast.error("Failed to generate downloads");
          return;
        }

        // Create download link
        const url = URL.createObjectURL(result.data.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const successMessage =
          result && "message" in result && typeof result.message === "string"
            ? result.message
            : "Applications downloaded successfully";
        toast.success(successMessage);
        setSelectedApplications([]); // Clear selection
      } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download applications");
      }
    });
  }, [selectedApplications]);

  // Debug effect to track selection changes
  useEffect(() => {
    console.log('Selection state changed:', {
      selectedCount: selectedApplications.length,
      selectedIds: selectedApplications,
      currentPageApplications: applications.map(app => app.id),
      areAllCurrentPageSelected,
      areSomeCurrentPageSelected
    });
  }, [selectedApplications, applications, areAllCurrentPageSelected, areSomeCurrentPageSelected]);

  // Don't clear selection when navigating - allow multi-selection across pages and searches
  // This enables users to select applications from different pages/searches for bulk download

  // Calculate statistics
  const stats = {
    total: statusStats?.totalApplications || pagination?.total || 0,
    submitted:
      statusStats?.submitted ||
      applications?.filter((app) => app.status === "submitted").length ||
      0,
    underReview:
      statusStats?.under_review ||
      applications?.filter((app) => app.status === "under_review").length ||
      0,
    shortlisted: statusStats?.shortlisted || 0,
    scoring_phase: statusStats?.scoring_phase || 0,
    dragons_den: statusStats?.dragons_den || 0,
    finalist: statusStats?.finalist || 0,
    approved: statusStats?.approved || 0,
    rejected: statusStats?.rejected || 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Applications Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and review In-Country YouthAdapt Challenge applications
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              asChild
              className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
            >
              <Link href="/admin/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            >
              <Link href="/admin/export">
                <FileText className="h-4 w-4 mr-2" />
                Export Data
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-blue-100">Applications</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.submitted}</div>
              <p className="text-xs text-green-100">Ready for review</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Under Review
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.underReview}</div>
              <p className="text-xs text-yellow-100">Being evaluated</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
              <Users className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.shortlisted}</div>
              <p className="text-xs text-purple-100">Selected for scoring</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scoring</CardTitle>
              <Settings className="h-4 w-4 text-indigo-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scoring_phase}</div>
              <p className="text-xs text-indigo-100">Being scored</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dragons Den</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dragons_den}</div>
              <p className="text-xs text-orange-100">Final pitch</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Application List
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Status Management
            </TabsTrigger>
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Evaluator Assignment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            {/* Filters Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Applications
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Use the filters below to find specific applications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/3">
                    <label className="text-sm font-medium mb-2 block text-gray-700">
                      Status
                    </label>
                    <Select value={status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applications</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">
                          Under Review
                        </SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="eligible">Eligible</SelectItem>
                        <SelectItem value="ineligible">Ineligible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-2/3">
                    <label className="text-sm font-medium mb-2 block text-gray-700">
                      Search
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name, business, or location"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-gray-200 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSearch(search)
                        }
                      />
                      <Button
                        onClick={() => handleSearch(search)}
                        disabled={searching}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {searching ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions Bar - Always visible when items are selected */}
            {selectedApplications.length > 0 && (
              <Card className="border-0 shadow-lg bg-blue-50 border-blue-200 sticky top-4 z-10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedApplications.length} application{selectedApplications.length > 1 ? 's' : ''} selected
                        {searching && (
                          <span className="text-xs text-blue-700 ml-2">
                            (Searching...)
                          </span>
                        )}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApplications([])}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <Button
                      onClick={handleBulkDownload}
                      disabled={isDownloading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Selected ({selectedApplications.length})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applications Table */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Applications
                      {searching && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Showing {applications?.length || 0} of{" "}
                      {pagination?.total || 0} applications
                    </CardDescription>
                  </div>
                  {applications?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={areAllCurrentPageSelected}
                        onCheckedChange={handleSelectAll}
                        id="select-all"
                      />
                      <label htmlFor="select-all" className="text-sm text-gray-900 cursor-pointer">
                        Select All on Page
                      </label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {applications && applications.length > 0 ? (
                  <>
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150">
                            <TableHead className="font-semibold text-gray-700 w-12">
                              <Checkbox
                                checked={areAllCurrentPageSelected}
                                ref={(el) => {
                                  if (el) {
                                    const input = (el as HTMLElement).querySelector('input') as HTMLInputElement | null;
                                    if (input) {
                                      input.indeterminate = areSomeCurrentPageSelected && !areAllCurrentPageSelected;
                                    }
                                  }
                                }}
                                onCheckedChange={handleSelectAll}
                                className="border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              ID
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Applicant
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Business
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Country
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Submitted
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Status
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Eligibility
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700">
                              Reviewed By
                            </TableHead>
                            <TableHead className="text-right font-semibold text-gray-700">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications?.map((app, index) => (
                            <TableRow
                              key={app.id}
                              className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                } ${selectedApplications.includes(app.id) ? "bg-blue-50 border-l-4 border-blue-500" : ""
                                }`}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedApplications.includes(app.id)}
                                  onCheckedChange={(checked) => handleSelectApplication(app.id, checked as boolean)}
                                  className="border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                              </TableCell>
                              <TableCell className="font-medium text-blue-600">
                                #{app.id}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900">
                                {`${app.business.applicant.firstName} ${app.business.applicant.lastName}`}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {app.business.name}
                              </TableCell>
                              <TableCell className="text-gray-700 capitalize">
                                {app.business.country}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {app.submittedAt
                                  ? format(new Date(app.submittedAt), "PPP")
                                  : "Not submitted"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${statusColors[app.status] || "bg-gray-200 text-gray-800"} font-medium`}
                                >
                                  {app.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {app.eligibilityResults.length > 0 ? (
                                  <Badge
                                    className={`font-medium ${app.eligibilityResults[0].isEligible
                                        ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300"
                                        : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300"
                                      }`}
                                  >
                                    {app.eligibilityResults[0].isEligible ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Eligible
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Ineligible
                                      </>
                                    )}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 font-medium">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Not evaluated
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {app.eligibilityResults.length > 0 &&
                                  app.eligibilityResults[0].evaluatedBy ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help">
                                          <UserCheck className="h-3 w-3 text-green-600" />
                                          <span className="text-xs text-gray-600">
                                            {app.eligibilityResults[0].evaluator
                                              ?.userProfile
                                              ? `${app.eligibilityResults[0].evaluator.userProfile.firstName.charAt(0)}${app.eligibilityResults[0].evaluator.userProfile.lastName.charAt(0)}`
                                              : app.eligibilityResults[0].evaluator?.name?.substring(
                                                0,
                                                2
                                              ) || "UN"}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="text-xs">
                                          <p>
                                            <strong>Reviewer:</strong>{" "}
                                            {app.eligibilityResults[0].evaluator
                                              ?.userProfile
                                              ? `${app.eligibilityResults[0].evaluator.userProfile.firstName} ${app.eligibilityResults[0].evaluator.userProfile.lastName}`
                                              : app.eligibilityResults[0]
                                                .evaluator?.name ||
                                              "Unknown Reviewer"}
                                          </p>
                                          {app.eligibilityResults[0]
                                            .evaluatedAt && (
                                              <p>
                                                <strong>Reviewed:</strong>{" "}
                                                {format(
                                                  new Date(
                                                    app.eligibilityResults[0].evaluatedAt
                                                  ),
                                                  "PPp"
                                                )}
                                              </p>
                                            )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                      Not reviewed
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <CompactEnhancedDocumentDownload
                                    applicationId={app.id}
                                    applicantName={`${app.business.applicant.firstName} ${app.business.applicant.lastName}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 transition-all duration-200"
                                  >
                                    <Link
                                      href={`/admin/applications/${app.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-1 text-blue-600" />
                                      <span className="text-sm text-gray-700">
                                        View
                                      </span>
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Instant Pagination */}
                    {(pagination?.pages || 0) > 1 && (
                      <div className="mt-8 flex justify-center">
                        <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center space-x-1">
                            {/* Previous Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(page - 1)}
                              disabled={page <= 1 || searching}
                              className={`${page <= 1
                                  ? "opacity-50 bg-gray-100 text-gray-400"
                                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent"
                                } transition-all duration-200 px-3 py-2 rounded-lg font-medium`}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>

                            {/* Page Numbers */}
                            {Array.from(
                              { length: pagination?.pages || 0 },
                              (_, i) => i + 1
                            )
                              .filter(
                                (p) =>
                                  Math.abs(p - page) < 3 ||
                                  p === 1 ||
                                  p === pagination?.pages
                              )
                              .map((p, i, arr) => {
                                // Add ellipsis
                                if (i > 0 && p > arr[i - 1] + 1) {
                                  return (
                                    <span
                                      key={`ellipsis-${p}`}
                                      className="px-3 py-2 text-gray-400 font-medium"
                                    >
                                      ...
                                    </span>
                                  );
                                }

                                return (
                                  <Button
                                    key={p}
                                    variant={page === p ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(p)}
                                    disabled={searching}
                                    className={`transition-all duration-200 px-3 py-2 rounded-lg font-medium min-w-[40px] text-center ${page === p
                                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md"
                                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300"
                                      }`}
                                  >
                                    {p}
                                  </Button>
                                );
                              })}

                            {/* Next Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(page + 1)}
                              disabled={
                                page >= (pagination?.pages || 1) || searching
                              }
                              className={`${page >= (pagination?.pages || 1)
                                  ? "opacity-50 bg-gray-100 text-gray-400"
                                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent"
                                } transition-all duration-200 px-3 py-2 rounded-lg font-medium`}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 mb-6">
                      <FileText className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      No applications found
                    </h3>
                    <p className="text-gray-500 text-center max-w-md">
                      {search || status !== "all"
                        ? "Try adjusting your filters or search terms to find applications."
                        : "Applications will appear here once they are submitted by applicants."}
                    </p>
                    {(search || status !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatus("all");
                          setSearch("");
                          setPage(1);
                          updateURL({
                            status: "all",
                            search: "",
                            page: "1",
                            tab,
                          });
                        }}
                        className="mt-4 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <ApplicationStatusManager
              //eslint-disable-next-line @typescript-eslint/no-explicit-any
              applications={(allApplications as any) || []}
            />
          </TabsContent>

          <TabsContent value="assign" className="space-y-6">
            <EvaluatorAssignmentManager
              //eslint-disable-next-line @typescript-eslint/no-explicit-any
              applications={(allApplications as any) || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Default export with Suspense boundary
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsPageLoading />}>
      <ApplicationsPageContent />
    </Suspense>
  );
}
