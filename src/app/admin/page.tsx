import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationStats } from "@/lib/actions";
import {
  Users,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  Download,
  TrendingUp,
  Activity,
  Eye,
  Settings,
  MessageSquare,
  Shield,
  Mail
} from "lucide-react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {

  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    redirect("/");
  }
  // Fetch real stats from the database
  const statsResult = await getApplicationStats();

  // Set default stats if fetch fails
  const stats = statsResult.success ? statsResult.data : {
    totalApplications: 0,
    eligibleApplications: 0,
    pendingReview: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Manage and monitor In-Country YouthAdapt Challenge applications
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 "
              asChild
            >
              <Link href="/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              asChild
            >
              <Link href="/admin/applications">
                <Eye className="h-4 w-4 mr-2" />
                View All Applications
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600"></div>
            <div className="relative bg-white/90 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Total Applications
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      All submitted applications
                    </CardDescription>
                  </div>
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats?.totalApplications}</div>
                <div className="flex items-center mt-2 text-xs text-gray-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Total submissions</span>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600"></div>
            <div className="relative bg-white/90 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Eligible Applications
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Meeting all mandatory criteria
                    </CardDescription>
                  </div>
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats?.eligibleApplications}</div>
                <div className="flex items-center mt-2 text-xs text-gray-600">
                  <Activity className="h-3 w-3 mr-1" />
                  <span>
                    {stats?.totalApplications && stats.totalApplications > 0
                      ? `${Math.round((stats.eligibleApplications / stats.totalApplications) * 100)}% eligible`
                      : 'No data yet'
                    }
                  </span>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500"></div>
            <div className="relative bg-white/90 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-700">
                      Pending Review
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Applications awaiting evaluation
                    </CardDescription>
                  </div>
                  <div className="bg-gradient-to-br from-amber-100 to-orange-200 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats?.pendingReview}</div>
                <div className="flex items-center mt-2 text-xs text-gray-600">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Awaiting review</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-purple-200 p-2 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>
                    Common administrative tasks
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Button
                variant="outline"
                className="w-full justify-start h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/applications">
                  <FileText className="h-5 w-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Review Applications</div>
                    <div className="text-xs text-gray-500">Evaluate and manage submissions</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/applications?status=eligible">
                  <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">View Eligible Candidates</div>
                    <div className="text-xs text-gray-500">Browse qualified applications</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/scoring">
                  <Settings className="h-5 w-5 mr-3 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Manage Scoring Criteria</div>
                    <div className="text-xs text-gray-500">Configure evaluation metrics</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/support">
                  <MessageSquare className="h-5 w-5 mr-3 text-cyan-600" />
                  <div className="text-left">
                    <div className="font-medium">Support Tickets</div>
                    <div className="text-xs text-gray-500">View and respond to user queries</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/review">
                  <Shield className="h-5 w-5 mr-3 text-indigo-600" />
                  <div className="text-left">
                    <div className="font-medium">Review Section</div>
                    <div className="text-xs text-gray-500">Senior review for shortlisted apps</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/analytics">
                  <BarChart3 className="h-5 w-5 mr-3 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Analytics Dashboard</div>
                    <div className="text-xs text-gray-500">View comprehensive reports</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/export">
                  <Download className="h-5 w-5 mr-3 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium">Export Data</div>
                    <div className="text-xs text-gray-500">Download application data</div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                asChild
              >
                <Link href="/admin/feedback">
                  <Mail className="h-5 w-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Feedback Emails</div>
                    <div className="text-xs text-gray-500">Send feedback requests to applicants</div>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Program Statistics Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-100 to-pink-200 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Program Statistics</CardTitle>
                  <CardDescription>
                    Overview of application distribution
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {stats?.totalApplications && stats.totalApplications > 0 ? (
                <div className="space-y-6">
                  {/* Eligible Applications Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Eligible Applications
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {stats?.eligibleApplications != null && stats?.totalApplications ? Math.round((stats.eligibleApplications / stats.totalApplications) * 100) : 0}%
                        </span>
                        <div className="text-xs text-gray-500">
                          {stats?.eligibleApplications} of {stats?.totalApplications}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${stats?.eligibleApplications != null && stats?.totalApplications ? (stats.eligibleApplications / stats.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Pending Review Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Pending Review
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {stats?.pendingReview != null && stats?.totalApplications ? Math.round((stats.pendingReview / stats.totalApplications) * 100) : 0}%
                        </span>
                        <div className="text-xs text-gray-500">
                          {stats?.pendingReview} of {stats?.totalApplications}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${stats?.pendingReview != null && stats?.totalApplications ? (stats.pendingReview / stats.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="text-lg font-bold text-blue-900">{stats?.totalApplications}</div>
                      <div className="text-xs text-blue-600">Total Received</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="text-lg font-bold text-green-900">{stats?.eligibleApplications}</div>
                      <div className="text-xs text-green-600">Qualified</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 mb-4">
                    <BarChart3 className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Statistics will be displayed here once applications are received and processed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 