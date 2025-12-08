/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  getMyAssignedApplications 
} from "@/lib/actions/evaluator-scoring";
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Award,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

async function EvaluatorDashboard() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch assigned applications
  const applicationsResult = await getMyAssignedApplications();

  if (!applicationsResult.success) {
    redirect("/"); // Redirect if not an evaluator
  }

  const applications = applicationsResult.data || [];

  // Calculate stats from applications
  const stats = {
    totalAssigned: applications.length,
    completed: applications.filter((app: any) => app.completionPercentage === 100).length,
    inProgress: applications.filter((app: any) => app.completionPercentage > 0 && app.completionPercentage < 100).length,
    notStarted: applications.filter((app: any) => app.completionPercentage === 0).length,
    totalCriteria: applications.reduce((sum: number, app: any) => sum + app.scores.length, 0),
    completedCriteria: applications.reduce((sum: number, app: any) => sum + app.scores.filter((s: any) => s.score > 0).length, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Evaluator Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {session.user.name}. Review and score your assigned applications.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/evaluator/guidelines">
                <FileText className="h-4 w-4 mr-2" />
                Scoring Guidelines
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Target className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssigned}</div>
              <p className="text-xs text-blue-100">Applications assigned to you</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-green-100">Fully evaluated</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-orange-100">Partially scored</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCriteria > 0 ? Math.round((stats.completedCriteria / stats.totalCriteria) * 100) : 0}%
              </div>
              <p className="text-xs text-purple-100">
                {stats.completedCriteria}/{stats.totalCriteria} criteria
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Award className="h-5 w-5 text-blue-600" />
              My Assigned Applications
            </CardTitle>
            <CardDescription>
              Applications assigned for your evaluation. Click to start or continue scoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Assigned</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  You don&apos;t have any applications assigned for evaluation yet. 
                  Check back later or contact the administrator.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((assignment: any) => (
                  <div
                    key={assignment.application.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.application.business.name}
                          </h3>
                          <Badge 
                            className={`${
                              assignment.completionPercentage === 100 
                                ? 'bg-green-100 text-green-800' 
                                : assignment.completionPercentage > 0 
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            } border-0`}
                          >
                            {assignment.completionPercentage === 100 ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </>
                            ) : assignment.completionPercentage > 0 ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Started
                              </>
                            )}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {assignment.application.business.applicant.firstName} {assignment.application.business.applicant.lastName}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Submitted: {new Date(assignment.application.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {assignment.scores.length} criteria to evaluate
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Evaluation Progress</span>
                            <span className="font-medium">{assignment.completionPercentage}%</span>
                          </div>
                          <Progress 
                            value={assignment.completionPercentage} 
                            className="h-2"
                          />
                        </div>

                        {/* Score Summary */}
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Current Score: <span className="font-medium">{assignment.totalScore}/{assignment.maxTotalScore}</span>
                          </span>
                          {assignment.completionPercentage === 100 && (
                            <span className="text-green-600 font-medium">
                              {Math.round((assignment.totalScore / assignment.maxTotalScore) * 100)}% Overall
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col gap-2">
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                          <Link href={`/evaluator/score/${assignment.application.id}`}>
                            {assignment.completionPercentage === 100 ? 'Review Scores' : 'Start Evaluation'}
                          </Link>
                        </Button>
                        <Button variant="outline" asChild size="sm">
                          <Link href={`/evaluator/application/${assignment.application.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EvaluatorDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    }>
      <EvaluatorDashboard />
    </Suspense>
  );
} 