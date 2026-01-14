import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getApplications, type ApplicationListItem } from "@/lib/actions/admin-applications";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, Buildings, MapPin, CalendarBlank, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";

export default async function ReviewerApplicationsPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Only allow reviewer_1, reviewer_2, admin, and technical_reviewer
    const allowedRoles = ["reviewer_1", "reviewer_2", "admin", "technical_reviewer"];
    if (!allowedRoles.includes(user.role || "")) {
        redirect("/");
    }

    // Fetch applications
    const result = await getApplications({
        page: 1,
        limit: 100,
    });

    const applications: ApplicationListItem[] = result.success && result.data ? result.data : [];

    // Filter applications based on role
    const filteredApplications = applications.filter((app: ApplicationListItem) => {
        if (user.role === "reviewer_1") {
            // R1 sees applications needing first review
            return app.status === "submitted" || app.status === "under_review";
        } else if (user.role === "reviewer_2") {
            // R2 sees applications needing second review
            return app.status === "pending_senior_review";
        }
        // Admin and technical_reviewer see all
        return true;
    });

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

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-8">
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
                            {user.role === "reviewer_1" && "Applications awaiting your first review"}
                            {user.role === "reviewer_2" && "Applications awaiting your second review"}
                            {(user.role === "admin" || user.role === "technical_reviewer") && "All applications"}
                        </p>
                    </div>
                </div>

                {/* Applications List */}
                {filteredApplications.length === 0 ? (
                    <Card className="border-gray-100 shadow-sm">
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-500">No applications found matching your review queue.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredApplications.map((app: ApplicationListItem) => (
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
                                                    {app.submittedAt ? format(new Date(app.submittedAt), "MMM d, yyyy") : "Not submitted"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/applications/${app.id}`}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Link>
                                            </Button>
                                            <Button size="sm" asChild>
                                                <Link href={`/admin/evaluate/${app.id}`}>
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
            </div>
        </div>
    );
}
