"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    getObservationApplications,
    getObservationStats,
    markForRevisit,
    unmarkForRevisit,
    ObservationApplication,
    ObservationStats,
} from "@/lib/actions/observation";
import { exportData } from "@/lib/actions/export";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Spinner,
    Eye,
    Binoculars,
    Buildings,
    MapPin,
    CurrencyCircleDollar,
    ArrowClockwise,
    Check,
    ArrowLeft,
    FileXls,
    CircleNotch
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function ObservationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "all";

    const [applications, setApplications] = useState<ObservationApplication[]>([]);
    const [stats, setStats] = useState<ObservationStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [appsResult, statsResult] = await Promise.all([
                getObservationApplications(currentTab as "all" | "revisit"),
                getObservationStats(),
            ]);

            if (appsResult.success && appsResult.data) {
                setApplications(appsResult.data);
            } else {
                toast.error(appsResult.error || "Failed to load observation applications");
            }

            if (statsResult.success && statsResult.data) {
                setStats(statsResult.data);
            }
        } catch {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [currentTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "all") {
            params.delete("tab");
        } else {
            params.set("tab", tab);
        }
        router.push(`?${params.toString()}`);
    };

    const handleMarkRevisit = async (appId: number, isCurrentlyMarked: boolean) => {
        setActionLoading(appId);
        try {
            const result = isCurrentlyMarked
                ? await unmarkForRevisit(appId)
                : await markForRevisit(appId);

            if (result.success) {
                toast.success(isCurrentlyMarked ? "Removed from revisit" : "Marked for revisit");
                loadData(); // Refresh data
            } else {
                toast.error(result.error || "Action failed");
            }
        } catch {
            toast.error("Action failed");
        } finally {
            setActionLoading(null);
        }
    };

    const formatRevenue = (amount: string | null) => {
        if (!amount) return "N/A";
        const num = parseFloat(amount);
        if (isNaN(num)) return amount;
        return `KES ${num.toLocaleString()}`;
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await exportData({
                type: "observation_applications",
                format: "xlsx",
                filters: {
                    status: currentTab === "revisit" ? ["revisit"] : [],
                },
            });

            if (!result.success) {
                toast.error(result.error || "Failed to export data");
                return;
            }

            if (!result.data || !result.fileName) {
                toast.error("Failed to export data");
                return;
            }

            let blobData: BlobPart;
            const contentType = result.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            if (result.isBase64) {
                const binaryString = atob(result.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blobData = bytes;
            } else {
                blobData = result.data;
            }

            const blob = new Blob([blobData], { type: contentType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Export complete: ${result.fileName}`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export data");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        asChild
                    >
                        <Link href="/admin/applications">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="p-3 bg-amber-100 rounded-xl">
                        <Binoculars className="w-6 h-6 text-amber-700" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Observation Applications</h1>
                        <p className="text-gray-500">
                            Kenya-registered applicants with revenue below KES 500,000 (data collection only)
                        </p>
                    </div>
                </div>
                <Badge variant="secondary" className="px-4 py-2 text-lg">
                    {stats?.totalObservation || 0} Applications
                </Badge>
                <Button
                    onClick={handleExport}
                    disabled={isExporting || isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {isExporting ? (
                        <CircleNotch className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                        <FileXls className="h-5 w-5 mr-2" />
                    )}
                    {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card
                    className={`cursor-pointer transition-all ${currentTab === "all" ? "ring-2 ring-amber-500" : "hover:shadow-md"}`}
                    onClick={() => handleTabChange("all")}
                >
                    <CardHeader className="pb-2">
                        <CardDescription>Total Observation</CardDescription>
                        <CardTitle className="text-3xl">{stats?.totalObservation || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${currentTab === "revisit" ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => handleTabChange("revisit")}
                >
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <ArrowClockwise className="w-4 h-4" />
                            Marked for Revisit
                        </CardDescription>
                        <CardTitle className="text-3xl text-blue-600">{stats?.totalRevisit || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Average Revenue</CardDescription>
                        <CardTitle className="text-3xl">
                            {stats ? formatRevenue(String(Math.round(stats.averageRevenue))) : "N/A"}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Unique Sectors</CardDescription>
                        <CardTitle className="text-3xl">{stats?.uniqueSectors || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={currentTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="all">All Observation ({stats?.totalObservation || 0})</TabsTrigger>
                    <TabsTrigger value="revisit">
                        <ArrowClockwise className="w-4 h-4 mr-1" />
                        Revisit ({stats?.totalRevisit || 0})
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Applications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {currentTab === "revisit" ? "Applications Marked for Revisit" : "All Observation Applications"}
                    </CardTitle>
                    <CardDescription>
                        {currentTab === "revisit"
                            ? "These applications have been flagged for future review and follow-up."
                            : "These applicants are tracked for data collection purposes. They are not eligible for scoring or review."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {currentTab === "revisit" ? (
                                <>
                                    <ArrowClockwise className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No applications marked for revisit yet</p>
                                    <p className="text-sm mt-2">Click the &quot;Mark for Revisit&quot; button on any observation application</p>
                                </>
                            ) : (
                                <>
                                    <Binoculars className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No observation applications yet</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Business</TableHead>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead>Employees</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Buildings className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        {app.business.name}
                                                        {app.markedForRevisit && (
                                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                                <ArrowClockwise className="w-3 h-3 mr-1" />
                                                                Revisit
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {app.business.sector?.replace(/_/g, " ") || "N/A"}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {app.applicant.firstName} {app.applicant.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">{app.applicant.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{app.business.city}, {app.business.county?.replace(/_/g, " ")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <CurrencyCircleDollar className="w-4 h-4 text-amber-500" />
                                                <span className="text-amber-700 font-medium">
                                                    {formatRevenue(app.business.revenueLastYear)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {app.business.fullTimeEmployeesTotal ?? "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            {app.submittedAt
                                                ? format(new Date(app.submittedAt), "MMM d, yyyy")
                                                : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/admin/applications/${app.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant={app.markedForRevisit ? "outline" : "default"}
                                                    size="sm"
                                                    onClick={() => handleMarkRevisit(app.id, app.markedForRevisit)}
                                                    disabled={actionLoading === app.id}
                                                    className={app.markedForRevisit ? "text-gray-600" : "bg-blue-600 hover:bg-blue-700"}
                                                >
                                                    {actionLoading === app.id ? (
                                                        <Spinner className="w-4 h-4 animate-spin" />
                                                    ) : app.markedForRevisit ? (
                                                        <>
                                                            <Check className="w-4 h-4 mr-1" />
                                                            Marked
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowClockwise className="w-4 h-4 mr-1" />
                                                            Revisit
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
