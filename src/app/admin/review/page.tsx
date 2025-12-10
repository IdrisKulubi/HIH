import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkReviewAccess, getApplicationsForReview, exportApplicationsToExcel } from "@/lib/actions/review.actions";
import PasscodeEntry from "@/components/review/PasscodeEntry";
import {
  FileText,
  Download,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  LogOut,
  ClipboardCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReviewApplicationsList from "@/components/review/ReviewApplicationsList";

async function DownloadButton() {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function downloadExcel(formData: FormData) {
    "use server";
    // Call the export action for its side-effects; form actions used in Next.js expect void return types.
    // If you need to return the file to the browser, implement an API route or client-side fetch to stream the file.
    await exportApplicationsToExcel();
    return;
  }

  return (
    <form action={downloadExcel}>
      <Button
        type="submit"
        variant="outline"
        className="border-green-200 hover:bg-green-50 hover:border-green-300"
      >
        <Download className="h-4 w-4 mr-2" />
        Export to Excel
      </Button>
    </form>
  );
}

export default async function ReviewDashboard() {
  // Check if user is signed in
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if user has review access
  const accessResult = await checkReviewAccess();

  if (!accessResult.hasAccess) {
    return <PasscodeEntry />;
  }

  // Fetch applications for review
  const applicationsResult = await getApplicationsForReview();

  if (!applicationsResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{applicationsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Transform data to match component expectations
  const rawApplications = applicationsResult.data || [];
  const applications = rawApplications.map(app => ({
    ...app,
    eligibilityResults: app.eligibilityResults.map(result => ({
      ...result,
      totalScore: result.totalScore ? Number(result.totalScore) : null,
      evaluatedAt: result.evaluatedAt ? new Date(result.evaluatedAt) : null,
    }))
  }));

  // Calculate statistics
  const stats = {
    total: applications.length,
    shortlisted: applications.filter(app => app.status === 'shortlisted').length,
    underReview: applications.filter(app => app.status === 'under_review').length,
    eligible: applications.filter(app => app.eligibilityResults?.[0]?.isEligible).length,
    ineligible: applications.filter(app => app.eligibilityResults?.[0] && !app.eligibilityResults[0].isEligible).length,
    notEvaluated: applications.filter(app => !app.eligibilityResults?.[0]).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold bg-[#0B5FBA] bg-clip-text text-transparent">
                Review Dashboard
              </h1>
            </div>
            <p className="text-gray-600 mt-2">
              Review and approve shortlisted applications for the In-Country YouthAdapt Challenge
            </p>
          </div>
          <div className="flex gap-3">
            <Suspense fallback={
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Loading...
              </Button>
            }>
              <DownloadButton />
            </Suspense>
            <Button
              variant="outline"
              className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              asChild
            >
              <Link href="/admin">
                <LogOut className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
          </div>
        </div>

        {/* Current User Info */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-600">Logged in as:</span>
                <span className="font-medium">{session.user.name || session.user.email}</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-0">
                Review Access Granted
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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



          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.underReview}</div>
              <p className="text-xs text-yellow-100">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eligible</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eligible}</div>
              <p className="text-xs text-green-100">Qualified</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ineligible</CardTitle>
              <XCircle className="h-4 w-4 text-red-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ineligible}</div>
              <p className="text-xs text-red-100">Not qualified</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-gray-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notEvaluated}</div>
              <p className="text-xs text-gray-100">Not evaluated</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Applications for Review
            </CardTitle>
            <CardDescription>
              Review and re-evaluate shortlisted applications. Click on any application to view details and evaluate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewApplicationsList applications={applications} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
