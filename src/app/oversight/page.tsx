import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, ClipboardText, Lightning } from "@phosphor-icons/react/dist/ssr";

export default async function OversightDashboard() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Only allow oversight and admin
    if (user.role !== "oversight" && user.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                            Welcome, {user.firstName || "Oversight"}
                        </h1>
                        <Badge className="bg-purple-100 text-purple-700">
                            <ShieldCheck className="h-3 w-3 mr-1" weight="fill" />
                            Final Approver
                        </Badge>
                    </div>
                    <p className="text-slate-500">
                        Review and approve Due Diligence assessments submitted by Reviewer 1s
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Pending Approvals Card */}
                    <Card className="border-purple-200 shadow-sm hover:shadow-md transition-shadow bg-purple-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardText className="h-5 w-5 text-purple-600" weight="duotone" />
                                Pending Approvals
                            </CardTitle>
                            <CardDescription>
                                DD assessments awaiting your review and approval
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 shadow-sm transition-all py-6 text-base font-medium">
                                <Link href="/oversight/approvals">
                                    View Pending Approvals
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Role Info Card */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightning className="h-5 w-5 text-amber-600" weight="duotone" />
                                Your Responsibilities
                            </CardTitle>
                            <CardDescription>
                                Understanding your approval role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-gray-600">
                            <p>✓ Review DD assessments from <strong>Reviewer 1s</strong></p>
                            <p>✓ <strong>Approve</strong> or <strong>Query</strong> assessments within 12 hours</p>
                            <p>✓ Provide feedback when querying for revisions</p>
                            <p>✓ Recommend applications for Due Diligence</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Deadline Warning */}
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-full">
                                <Lightning className="h-5 w-5 text-amber-600" weight="fill" />
                            </div>
                            <div>
                                <p className="font-medium text-amber-800">12-Hour Approval Window</p>
                                <p className="text-sm text-amber-600">
                                    Assessments are auto-reassigned if not reviewed within 12 hours
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Link to Admin Panel (if admin) */}
                {user.role === "admin" && (
                    <Card className="border-gray-200">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-gray-600" />
                                    <span className="text-gray-600">You also have admin access</span>
                                </div>
                                <Button variant="outline" asChild>
                                    <Link href="/admin">Go to Admin Panel</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
