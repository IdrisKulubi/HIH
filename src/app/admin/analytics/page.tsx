import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAnalyticsDashboardData,
  getScoringAnalytics,
  getEvaluatorPerformance,
} from "@/lib/actions/analytics";
import { EnhancedAnalyticsCharts } from "@/components/admin/EnhancedAnalyticsCharts";
import {
  Users,
  Target,
  Award,
  FileText,
  Activity,
  Star,
  CheckCircle,
  Clock,
  UserCheck,
} from "lucide-react";

// Define type locally since it's inferred in actions
interface Evaluator {
  evaluatorId: string;
  name: string;
  email: string;
  role: string;
  totalEvaluations: number;
  averageScore: number;
}

// Loading component
function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto py-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main analytics dashboard component
async function AnalyticsDashboard() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch analytics data
  const [dashboardResult, scoringResult, evaluatorResult] = await Promise.all([
    getAnalyticsDashboardData(),
    getScoringAnalytics(),
    getEvaluatorPerformance(),
  ]);

  // Handle errors gracefully
  const dashboardData = dashboardResult.success ? dashboardResult.data : null;
  const scoringData = scoringResult.success ? scoringResult.data : null;
  const evaluatorData = evaluatorResult.success ? evaluatorResult.data : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Simple and clear insights into your application evaluation system
          </p>
        </div>

        {/* Key Metrics Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Applications
                </CardTitle>
                <FileText className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardData.totalApplications}
                </div>
                <p className="text-xs opacity-80 mt-1">
                  +{dashboardData.newThisWeek} this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Evaluation Progress
                </CardTitle>
                <Activity className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardData.evaluationRate}%
                </div>
                <p className="text-xs opacity-80 mt-1">
                  {dashboardData.evaluatedApplications} of{" "}
                  {dashboardData.totalApplications} evaluated
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Average Score
                </CardTitle>
                <Star className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardData.averageScore}
                </div>
                <p className="text-xs opacity-80 mt-1">Points per evaluation</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Active Evaluators
                </CardTitle>
                <UserCheck className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardData.activeEvaluators}
                </div>
                <p className="text-xs opacity-80 mt-1">
                  of {dashboardData.totalEvaluators} total evaluators
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3  text-gray-600">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="scoring"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Scoring
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {dashboardData && (
              <EnhancedAnalyticsCharts
                data={{
                  totalApplications: dashboardData.totalApplications || 0,
                  evaluatedApplications:
                    dashboardData.evaluatedApplications || 0,
                  evaluationRate: dashboardData.evaluationRate || 0,
                  statusDistribution: dashboardData.statusDistribution || {},
                  countyDistribution: dashboardData.countyDistribution || {},
                  genderDistribution: dashboardData.genderDistribution || {},
                  sectorDistribution: dashboardData.sectorDistribution || {},
                  averageScore: dashboardData.averageScore || 0,
                  //eslint-disable-next-line @typescript-eslint/no-explicit-any
                  maxScore: (dashboardData as any).maxScore || 100,
                }}
              />
            )}
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scoring Criteria Performance */}
              {scoringData?.criteriaAnalytics && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Scoring Criteria Performance
                    </CardTitle>
                    <CardDescription>
                      Average performance across scoring criteria
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scoringData.criteriaAnalytics
                      .slice(0, 8)
                      .map((criteria) => (
                        <div key={criteria.criteriaId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-sm font-medium truncate max-w-[200px]"
                              title={criteria.name}
                            >
                              {criteria.name}
                            </span>
                            <span className="text-sm text-gray-600">
                              {criteria.averageScore.toFixed(1)}/
                              {criteria.maxPoints}
                            </span>
                          </div>
                          <Progress
                            value={criteria.utilizationRate}
                            className="h-2"
                          />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Top Applications */}
              {scoringData?.topApplications && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-600" />
                      Top Performing Applications
                    </CardTitle>
                    <CardDescription>
                      Highest scoring applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scoringData.topApplications
                      .slice(0, 5)
                      .map((app, index) => (
                        <div
                          key={app.applicationId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                            >
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">
                                {app.businessName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {app.applicantName}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-bold">
                            {app.totalScore} pts
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Evaluators Tab */}
          <TabsContent value="evaluators" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evaluator Summary */}
              {evaluatorData?.summary && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Evaluator Summary
                    </CardTitle>
                    <CardDescription>
                      Overall evaluator performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {evaluatorData.summary.totalEvaluators}
                        </div>
                        <p className="text-sm text-gray-600">
                          Total Evaluators
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {evaluatorData.summary.totalEvaluations}
                        </div>
                        <p className="text-sm text-gray-600">
                          Total Evaluations
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {evaluatorData.summary.averageScore}
                      </div>
                      <p className="text-sm text-gray-600">
                        Average Score Given
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Evaluators */}
              {evaluatorData?.evaluators && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Most Active Evaluators
                    </CardTitle>
                    <CardDescription>
                      Evaluators by number of evaluations completed
                    </CardDescription>
                  </CardHeader>


                  <CardContent className="space-y-3">
                    {(evaluatorData.evaluators as Evaluator[])
                      .filter((evaluator) => evaluator.totalEvaluations > 0)
                      .slice(0, 5)
                      .map((evaluator, index) => (
                        <div
                          key={evaluator.evaluatorId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                            >
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">
                                {evaluator.name}
                              </p>
                              <p className="text-xs text-gray-600 capitalize">
                                {evaluator.role.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="font-bold">
                              {evaluator.totalEvaluations}
                            </Badge>
                            <p className="text-xs text-gray-600 mt-1">
                              Avg: {evaluator.averageScore.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Error States */}
        {(!dashboardData || !scoringData || !evaluatorData) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                <p>
                  Some analytics data is currently unavailable. Please try
                  refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Main page component with loading
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
