"use client";

import { useState, useEffect, useMemo } from "react";
import { getQualifiedApplications } from "@/lib/actions/due-diligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import {
    Trophy,
    MagnifyingGlass,
    Buildings,
    ArrowRight,
    Export,
    CheckCircle,
    Star,
    MapPin,
    Briefcase,
    User
} from "@phosphor-icons/react";

type QualifiedApplication = {
    id: number;
    applicationId: number;
    businessName: string;
    applicantName: string;
    applicantEmail: string;
    county: string;
    sector: string;
    track: string;
    ddScore: number;
    ddStatus: string;
    ddCompletedAt: Date | null;
    primaryReviewerName: string | null;
    validatorName: string | null;
};

export default function QualifiedApplicationsPage() {
    const [applications, setApplications] = useState<QualifiedApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [countyFilter, setCountyFilter] = useState("all");
    const [sectorFilter, setSectorFilter] = useState("all");
    const [trackFilter, setTrackFilter] = useState("all");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const result = await getQualifiedApplications();
            if (result.success && result.data) {
                setApplications(result.data);
            } else {
                toast.error(result.message || "Failed to load qualified applications");
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Get unique values for filters
    const counties = useMemo(() => 
        [...new Set(applications.map(a => a.county).filter(Boolean))].sort(),
        [applications]
    );
    const sectors = useMemo(() => 
        [...new Set(applications.map(a => a.sector).filter(Boolean))].sort(),
        [applications]
    );
    const tracks = useMemo(() => 
        [...new Set(applications.map(a => a.track).filter(Boolean))].sort(),
        [applications]
    );

    // Filtered applications
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch = !searchQuery || 
                app.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.applicationId.toString().includes(searchQuery);
            const matchesCounty = countyFilter === "all" || app.county === countyFilter;
            const matchesSector = sectorFilter === "all" || app.sector === sectorFilter;
            const matchesTrack = trackFilter === "all" || app.track === trackFilter;
            return matchesSearch && matchesCounty && matchesSector && matchesTrack;
        });
    }, [applications, searchQuery, countyFilter, sectorFilter, trackFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: applications.length,
        avgScore: applications.length > 0 
            ? Math.round(applications.reduce((sum, a) => sum + a.ddScore, 0) / applications.length)
            : 0,
        topPerformers: applications.filter(a => a.ddScore >= 80).length,
        byTrack: {
            foundation: applications.filter(a => a.track === 'foundation').length,
            acceleration: applications.filter(a => a.track === 'acceleration').length,
        }
    }), [applications]);

    const getScoreBadgeColor = (score: number) => {
        if (score >= 80) return "bg-emerald-100 text-emerald-800 border-emerald-300";
        if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-300";
        return "bg-amber-100 text-amber-800 border-amber-300";
    };

    const exportToCSV = () => {
        const headers = ['Application ID', 'Business Name', 'Applicant', 'Email', 'County', 'Sector', 'Track', 'DD Score', 'Completed Date', 'Primary Reviewer', 'Validator'];
        const rows = filteredApplications.map(app => [
            app.applicationId,
            app.businessName,
            app.applicantName,
            app.applicantEmail,
            app.county,
            app.sector,
            app.track,
            app.ddScore,
            app.ddCompletedAt ? format(new Date(app.ddCompletedAt), 'yyyy-MM-dd') : '',
            app.primaryReviewerName || '',
            app.validatorName || ''
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qualified-applications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported to CSV");
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Trophy className="h-7 w-7 text-amber-500" weight="fill" />
                        Qualified Applications
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Applications that completed Due Diligence with ≥60% score
                    </p>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                    <Export className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-amber-500" weight="fill" />
                            <div>
                                <p className="text-3xl font-bold text-amber-700">{stats.total}</p>
                                <p className="text-sm text-amber-600">Total Qualified</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Star className="h-8 w-8 text-emerald-500" weight="fill" />
                            <div>
                                <p className="text-3xl font-bold text-emerald-700">{stats.topPerformers}</p>
                                <p className="text-sm text-emerald-600">Top Performers (≥80%)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-blue-500" weight="fill" />
                            <div>
                                <p className="text-3xl font-bold text-blue-700">{stats.avgScore}%</p>
                                <p className="text-sm text-blue-600">Average Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Buildings className="h-8 w-8 text-purple-500" weight="fill" />
                            <div>
                                <p className="text-sm text-purple-700">
                                    <span className="text-xl font-bold">{stats.byTrack.foundation}</span> Foundation
                                </p>
                                <p className="text-sm text-purple-700">
                                    <span className="text-xl font-bold">{stats.byTrack.acceleration}</span> Acceleration
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Filter Applications</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by business, applicant, or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={countyFilter} onValueChange={setCountyFilter}>
                            <SelectTrigger className="w-[180px]">
                                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="County" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Counties</SelectItem>
                                {counties.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sectorFilter} onValueChange={setSectorFilter}>
                            <SelectTrigger className="w-[180px]">
                                <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Sector" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sectors</SelectItem>
                                {sectors.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={trackFilter} onValueChange={setTrackFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Track" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tracks</SelectItem>
                                {tracks.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Qualified Applications ({filteredApplications.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredApplications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No qualified applications found</p>
                            <p className="text-sm">Applications will appear here after completing DD with ≥60%</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>County</TableHead>
                                        <TableHead>Track</TableHead>
                                        <TableHead className="text-center">DD Score</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>Reviewers</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredApplications.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell>
                                                <div className="font-medium">{app.businessName}</div>
                                                <div className="text-xs text-gray-500">#{app.applicationId}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="text-sm">{app.applicantName}</div>
                                                        <div className="text-xs text-gray-500">{app.applicantEmail}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{app.county || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {app.track}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`text-lg font-bold ${getScoreBadgeColor(app.ddScore)}`}>
                                                    {app.ddScore}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {app.ddCompletedAt ? (
                                                    <span className="text-sm text-gray-600">
                                                        {format(new Date(app.ddCompletedAt), 'MMM d, yyyy')}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs space-y-1">
                                                    {app.primaryReviewerName && (
                                                        <div className="text-gray-600">
                                                            Primary: {app.primaryReviewerName}
                                                        </div>
                                                    )}
                                                    {app.validatorName && (
                                                        <div className="text-gray-600">
                                                            Validator: {app.validatorName}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/admin/due-diligence/${app.applicationId}`}>
                                                        View
                                                        <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
