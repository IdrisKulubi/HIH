"use client";

import { useEffect, useState } from "react";
import { getReviewDiagnosticStats, ReviewerDiagnostic, PendingApplicationSnippet } from "@/lib/actions/diagnostics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Clock, User, Mail, ShieldAlert } from "lucide-react";

export default function ReviwerInspectorPage() {
    const [data, setData] = useState<{
        reviewers: ReviewerDiagnostic[];
        pendingApplications: PendingApplicationSnippet[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            const result = await getReviewDiagnosticStats();
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || "Failed to load diagnostic data");
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600 font-medium">Analyzing assignment database...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                    <ShieldAlert className="h-6 w-6 text-red-600 mt-0.5" />
                    <div>
                        <h3 className="text-red-900 font-bold mb-1">Diagnostic Error</h3>
                        <p className="text-red-700">{error || "Data not available"}</p>
                        <p className="text-sm text-red-500 mt-2">Make sure you are logged in as an administrator.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 min-h-screen">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Inspector</h1>
                <p className="text-gray-500">Live reconciliation of reviewer assignments vs. completion data</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Cards */}
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-blue-900 text-sm font-bold uppercase tracking-wider">Total Reviewers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-700">{data.reviewers.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-900 text-sm font-bold uppercase tracking-wider">Total Pending Evaluations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-700">{data.pendingApplications.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-900 text-sm font-bold uppercase tracking-wider">System Integrity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-700">Healthy</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Reviewer Performance Table */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-400" />
                            Reviewer Performance Audit
                        </CardTitle>
                        <CardDescription>Real-time completion tracking for assigned reviewers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[250px]">Reviewer</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-center font-bold text-gray-400">R1 Assigned</TableHead>
                                    <TableHead className="text-center font-bold text-green-600">R1 Completed</TableHead>
                                    <TableHead className="text-center font-bold text-amber-600">R1 Pending</TableHead>
                                    <TableHead className="text-center font-bold text-gray-400">R2 Assigned</TableHead>
                                    <TableHead className="text-center font-bold text-green-600">R2 Completed</TableHead>
                                    <TableHead className="text-center font-bold text-amber-600">R2 Pending</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.reviewers.map((r) => (
                                    <TableRow key={r.id} className="hover:bg-gray-50/50">
                                        <TableCell>
                                            <div className="flex flex-col font-medium">
                                                <span>{r.name}</span>
                                                <span className="text-[10px] text-gray-400 font-normal flex items-center gap-1">
                                                    <Mail className="h-2 w-2" />
                                                    {r.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-[10px]">{r.role.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-gray-500 font-mono">{r.r1.assigned}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold font-mono">{r.r1.completed}</TableCell>
                                        <TableCell className={`text-center font-black font-mono ${r.r1.pending > 0 ? "text-amber-600" : "text-gray-200"}`}>
                                            {r.r1.pending}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-500 font-mono">{r.r2.assigned}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold font-mono">{r.r2.completed}</TableCell>
                                        <TableCell className={`text-center font-black font-mono ${r.r2.pending > 0 ? "text-amber-600" : "text-gray-200"}`}>
                                            {r.r2.pending}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pending Applications List */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Detailed Pending Applications
                        </CardTitle>
                        <CardDescription>Individual applications awaiting reviewer action</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.pendingApplications.length === 0 ? (
                            <div className="text-center py-20 flex flex-col items-center">
                                <div className="bg-green-50 p-4 rounded-full mb-4">
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Zero Pending!</h3>
                                <p className="text-gray-500">Every single assigned application has been scored.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[100px]">App ID</TableHead>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Current Status</TableHead>
                                        <TableHead>Reviewer 1 Action</TableHead>
                                        <TableHead>Reviewer 2 Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.pendingApplications.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-mono text-xs text-blue-600 font-bold">#{app.id}</TableCell>
                                            <TableCell className="font-semibold text-gray-700">{app.businessName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] uppercase font-bold text-gray-500">
                                                    {app.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {app.assignedR1Id ? (
                                                    app.r1Score ? (
                                                        <Badge className="bg-green-100 text-green-800 border-green-200 shadow-none">✅ Scored: {app.r1Score}</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-none">⏳ Pending Assignment</Badge>
                                                    )
                                                ) : (
                                                    <span className="text-gray-300 text-[10px] italic">Not assigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {app.assignedR2Id ? (
                                                    app.r2Score ? (
                                                        <Badge className="bg-green-100 text-green-800 border-green-200 shadow-none">✅ Scored: {app.r2Score}</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-none">⏳ Pending Assignment</Badge>
                                                    )
                                                ) : (
                                                    <span className="text-gray-300 text-[10px] italic">Not assigned</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
