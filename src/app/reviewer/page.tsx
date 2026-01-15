import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Files, ArrowRight, User, UserCheck } from "@phosphor-icons/react/dist/ssr";

export default async function ReviewerDashboard() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Only allow reviewer_1, reviewer_2, admin, and technical_reviewer
    const allowedRoles = ["reviewer_1", "reviewer_2", "admin", "technical_reviewer"];
    if (!allowedRoles.includes(user.role || "")) {
        redirect("/");
    }

    // Determine role display
    const getRoleDisplay = () => {
        switch (user.role) {
            case "reviewer_1":
                return { label: "Reviewer 1", color: "bg-cyan-100 text-cyan-700", icon: User };
            case "reviewer_2":
                return { label: "Reviewer 2", color: "bg-amber-100 text-amber-700", icon: UserCheck };
            case "admin":
                return { label: "Admin", color: "bg-blue-100 text-blue-700", icon: User };
            case "technical_reviewer":
                return { label: "Technical Reviewer", color: "bg-purple-100 text-purple-700", icon: User };
            default:
                return { label: "Reviewer", color: "bg-gray-100 text-gray-700", icon: User };
        }
    };

    const roleInfo = getRoleDisplay();
    const RoleIcon = roleInfo.icon;

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                            Welcome, {user.firstName || "Reviewer"}
                        </h1>
                        <Badge className={roleInfo.color}>
                            <RoleIcon className="h-3 w-3 mr-1" weight="fill" />
                            {roleInfo.label}
                        </Badge>
                    </div>
                    <p className="text-slate-500">
                        {user.role === "reviewer_1" && "You are assigned to perform initial reviews on applications."}
                        {user.role === "reviewer_2" && "You are assigned to perform second reviews after Reviewer 1 completes their assessment."}
                        {(user.role === "admin" || user.role === "technical_reviewer") && "You have full access to review applications."}
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Applications Card */}
                    <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Files className="h-5 w-5 text-blue-600" weight="duotone" />
                                Applications
                            </CardTitle>
                            <CardDescription>
                                View and review submitted applications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm transition-all py-6 text-base font-medium">
                                <Link href="/reviewer/applications">
                                    View Applications
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Role Info Card */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RoleIcon className="h-5 w-5 text-purple-600" weight="duotone" />
                                Your Role
                            </CardTitle>
                            <CardDescription>
                                Understanding your review responsibilities
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-gray-600">
                            {user.role === "reviewer_1" && (
                                <>
                                    <p>✓ You can perform the <strong>first review</strong> on applications</p>
                                    <p>✓ Score applications based on scoring criteria</p>
                                    <p>✗ You cannot perform the second review</p>
                                </>
                            )}
                            {user.role === "reviewer_2" && (
                                <>
                                    <p>✓ You can perform the <strong>second review</strong> after Reviewer 1</p>
                                    <p>✓ Your review is blind - you won&apos;t see Reviewer 1&apos;s scores</p>
                                    <p>✓ Final score is the average of both reviews</p>
                                    <p>✗ You cannot perform the first review</p>
                                </>
                            )}
                            {(user.role === "admin" || user.role === "technical_reviewer") && (
                                <>
                                    <p>✓ You can perform both first and second reviews</p>
                                    <p>✓ Full access to all application features</p>
                                    <p>✓ Access to admin dashboard</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
