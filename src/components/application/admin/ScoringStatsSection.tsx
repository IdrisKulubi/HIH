"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Layers, Zap, ChevronRight, RefreshCw } from "lucide-react";
import { getScoringProgressStats, exportScoringReport, ScoringProgressStats } from "@/lib/actions/analytics";
import { toast } from "sonner";

interface TrackCardProps {
    title: string;
    stats: {
        total: number;
        scored: number;
        firstReview: number;
        secondReview: number;
    };
    color: "teal" | "blue";
}

function TrackStatsCard({ title, stats, color }: TrackCardProps) {
    const colorClasses = {
        teal: {
            bg: "bg-teal-50",
            border: "border-teal-200",
            badge: "bg-teal-100 text-teal-700",
            progress: "bg-teal-200",
            text: "text-teal-700",
            icon: "text-teal-600",
        },
        blue: {
            bg: "bg-blue-50",
            border: "border-blue-200",
            badge: "bg-blue-100 text-blue-700",
            progress: "bg-blue-200",
            text: "text-blue-700",
            icon: "text-blue-600",
        },
    };

    const colors = colorClasses[color];
    const scoredPercent = stats.total > 0 ? Math.round((stats.scored / stats.total) * 100) : 0;
    const firstReviewPercent = stats.scored > 0 ? Math.round((stats.firstReview / stats.scored) * 100) : 0;
    const secondReviewPercent = stats.scored > 0 ? Math.round((stats.secondReview / stats.scored) * 100) : 0;

    return (
        <Card className={`shadow-lg border-0 ${colors.bg} ${colors.border}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {color === "teal" ? (
                            <Layers className={`h-5 w-5 ${colors.icon}`} />
                        ) : (
                            <Zap className={`h-5 w-5 ${colors.icon}`} />
                        )}
                        {title}
                    </CardTitle>
                    <Badge className={colors.badge}>{stats.total} Total</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Scoring Flow */}
                <div className="space-y-3">
                    {/* Total -> Scored */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700"> System Scored</span>
                            <span className={`font-semibold ${colors.text}`}>
                                {stats.scored} / {stats.total} ({scoredPercent}%)
                            </span>
                        </div>
                        <Progress value={scoredPercent} className="h-2" />
                    </div>

                    {/* Scored -> 1st Review */}
                    <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-1">
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Of scored applications:
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">1st Review</span>
                                <span className={`font-semibold ${colors.text}`}>
                                    {stats.firstReview} / {stats.scored} ({firstReviewPercent}%)
                                </span>
                            </div>
                            <Progress value={firstReviewPercent} className="h-2" />
                        </div>
                    </div>

                    {/* 1st Review -> 2nd Review */}
                    <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-1">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">2nd Review</span>
                                <span className={`font-semibold ${colors.text}`}>
                                    {stats.secondReview} / {stats.scored} ({secondReviewPercent}%)
                                </span>
                            </div>
                            <Progress value={secondReviewPercent} className="h-2" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function ScoringStatsSection() {
    const [stats, setStats] = useState<ScoringProgressStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [trackFilter, setTrackFilter] = useState<"all" | "foundation" | "acceleration">("all");

    const fetchStats = async () => {
        setLoading(true);
        try {
            const result = await getScoringProgressStats({
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                track: trackFilter,
            });
            if (result.success && result.data) {
                setStats(result.data);
            } else {
                toast.error("Failed to load scoring stats");
            }
        } catch {
            toast.error("Error fetching stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplyFilters = () => {
        fetchStats();
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const result = await exportScoringReport({
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                track: trackFilter,
            });

            if (result.success && result.data) {
                // Download the file
                const blob = new Blob([atob(result.data.base64)], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = result.data.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Report exported successfully!");
            } else {
                toast.error("Failed to export report");
            }
        } catch {
            toast.error("Error exporting report");
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setTrackFilter("all");
        // Re-fetch with cleared filters
        setTimeout(() => fetchStats(), 100);
    };

    if (loading && !stats) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Section */}
            <Card className="shadow-lg border-0">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5 text-gray-600" />
                        Filters & Export
                    </CardTitle>
                    <CardDescription>
                        Filter scoring statistics by date range and track
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[140px]">
                            <Label htmlFor="dateFrom" className="text-sm text-gray-600">From Date</Label>
                            <Input
                                id="dateFrom"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <Label htmlFor="dateTo" className="text-sm text-gray-600">To Date</Label>
                            <Input
                                id="dateTo"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <Label htmlFor="track" className="text-sm text-gray-600">Track</Label>
                            <Select value={trackFilter} onValueChange={(v) => setTrackFilter(v as any)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select track" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tracks</SelectItem>
                                    <SelectItem value="foundation">Foundation</SelectItem>
                                    <SelectItem value="acceleration">Acceleration</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleApplyFilters} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Apply
                        </Button>
                        <Button variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={exporting}
                            className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {exporting ? "Exporting..." : "Export Report"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {(trackFilter === "all" || trackFilter === "foundation") && (
                        <TrackStatsCard
                            title="Foundation Track"
                            stats={stats.foundation}
                            color="teal"
                        />
                    )}
                    {(trackFilter === "all" || trackFilter === "acceleration") && (
                        <TrackStatsCard
                            title="Acceleration Track"
                            stats={stats.acceleration}
                            color="blue"
                        />
                    )}
                </div>
            )}

            {/* Summary Card */}
            {stats && trackFilter === "all" && (
                <Card className="shadow-lg border-0 bg-gradient-to-r from-gray-50 to-gray-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Combined Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-gray-800">
                                    {stats.foundation.total + stats.acceleration.total}
                                </div>
                                <p className="text-sm text-gray-600">Total Applications</p>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.foundation.scored + stats.acceleration.scored}
                                </div>
                                <p className="text-sm text-gray-600">Total Scored by System</p>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.foundation.firstReview + stats.acceleration.firstReview}
                                </div>
                                <p className="text-sm text-gray-600">1st Reviews Done</p>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.foundation.secondReview + stats.acceleration.secondReview}
                                </div>
                                <p className="text-sm text-gray-600">2nd Reviews Done</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
