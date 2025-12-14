"use client";

import { useEffect, useState } from "react";
import { getObservationApplications, ObservationApplication } from "@/lib/actions/observation";
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
import { Spinner, Eye, DownloadSimple, Binoculars, Buildings, MapPin, CurrencyCircleDollar } from "@phosphor-icons/react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function ObservationPage() {
    const [applications, setApplications] = useState<ObservationApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const result = await getObservationApplications();
                if (result.success && result.data) {
                    setApplications(result.data);
                } else {
                    toast.error(result.error || "Failed to load observation applications");
                }
            } catch {
                toast.error("Failed to load data");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    const formatRevenue = (amount: string | null) => {
        if (!amount) return "N/A";
        const num = parseFloat(amount);
        if (isNaN(num)) return amount;
        return `KES ${num.toLocaleString()}`;
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
                    {applications.length} Applications
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Observation</CardDescription>
                        <CardTitle className="text-3xl">{applications.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Average Revenue</CardDescription>
                        <CardTitle className="text-3xl">
                            {applications.length > 0
                                ? formatRevenue(
                                    String(
                                        applications.reduce((sum, app) => sum + (parseFloat(app.business.revenueLastYear || "0")), 0) / applications.length
                                    )
                                )
                                : "N/A"}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Unique Sectors</CardDescription>
                        <CardTitle className="text-3xl">
                            {new Set(applications.map(a => a.business.sector).filter(Boolean)).size}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Applications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Observation Applications</CardTitle>
                    <CardDescription>
                        These applicants are tracked for data collection purposes. They are not eligible for scoring or review.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Binoculars className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No observation applications yet</p>
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
                                                    <div className="font-medium">{app.business.name}</div>
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
                                            <Link href={`/admin/applications/${app.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    View
                                                </Button>
                                            </Link>
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
