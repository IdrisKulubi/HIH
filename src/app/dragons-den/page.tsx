import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  getDragonsDenApplications,
  getDragonsDenStats 
} from "@/lib/actions/dragons-den-scoring";
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Award,
  TrendingUp,
  Users,
  Calendar,
  Trophy,
  Flame,
  Star,
  Presentation
} from "lucide-react";
import Link from "next/link";

async function DragonsDenDashboard() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch Dragon's Den applications and stats
  const [applicationsResult, statsResult] = await Promise.all([
    getDragonsDenApplications(),
    getDragonsDenStats()
  ]);

  if (!applicationsResult.success) {
    redirect("/"); // Redirect if not a Dragon's Den judge
  }

  const applications = applicationsResult.data || [];
  const stats = statsResult.success ? statsResult.data : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Dragon&apos;s Den
              </h1>
            </div>
            <p className="text-gray-600 mt-2">
              Welcome, {session.user.name}. Evaluate finalist presentations and select winners.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/dragons-den/guidelines">
                <FileText className="h-4 w-4 mr-2" />
                Judging Guidelines
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dragons-den/leaderboard">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finalists</CardTitle>
                <Target className="h-4 w-4 text-orange-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalFinalists}</div>
                <p className="text-xs text-orange-100">Ready for presentation</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evaluated</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.evaluated}</div>
                <p className="text-xs text-green-100">Presentations scored</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Star className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
                <p className="text-xs text-blue-100">Out of {stats.maxScore}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Score</CardTitle>
                <Trophy className="h-4 w-4 text-purple-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.topScore}</div>
                <p className="text-xs text-purple-100">Highest presentation</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Presentation Schedule */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Presentation className="h-5 w-5 text-orange-600" />
              Presentation Schedule
            </CardTitle>
            <CardDescription>
              Finalist presentations for Dragon&apos;s Den evaluation. Click to score presentations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Presentations Scheduled</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No applications have reached the Dragon&apos;s Den phase yet. 
                  Check back when finalists are ready for presentation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {applications.map((presentation: any, index: number) => (
                  <div
                    key={presentation.application.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-all duration-200 bg-white relative overflow-hidden"
                  >
                    {/* Ranking Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge 
                        className={`${
                          index === 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          index === 1 ? 'bg-gray-100 text-gray-800 border-gray-300' :
                          index === 2 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-blue-100 text-blue-800 border-blue-300'
                        } font-semibold`}
                      >
                        #{index + 1}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-16">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {presentation.application.business.name}
                          </h3>
                          <Badge 
                            className={`${
                              presentation.isEvaluated
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            } border-0`}
                          >
                            {presentation.isEvaluated ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Evaluated
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          Presenter: {presentation.application.business.applicant.firstName} {presentation.application.business.applicant.lastName}
                        </p>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {presentation.application.business.description}
                        </p>

                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Presentation Time: {presentation.presentationTime || "TBD"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Previous Score: {presentation.previousScore}/{presentation.maxPreviousScore}
                          </span>
                        </div>

                        {/* Current Dragon's Den Score */}
                        {presentation.isEvaluated && (
                          <div className="flex items-center gap-4 mb-3">
                            <div className="text-sm">
                              <span className="text-gray-600">Dragon&apos;s Den Score: </span>
                              <span className="font-semibold text-orange-600">
                                {presentation.dragonsDenScore}/{presentation.maxDragonsDenScore}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Final Score: </span>
                              <span className="font-bold text-purple-600">
                                {presentation.finalScore}/{presentation.maxFinalScore}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar for Evaluation */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Evaluation Progress</span>
                            <span className="font-medium">
                              {presentation.isEvaluated ? '100%' : '0%'}
                            </span>
                          </div>
                          <Progress 
                            value={presentation.isEvaluated ? 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col gap-2">
                        <Button 
                          asChild 
                          className={`${
                            presentation.isEvaluated 
                              ? 'bg-orange-600 hover:bg-orange-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          <Link href={`/dragons-den/evaluate/${presentation.application.id}`}>
                            {presentation.isEvaluated ? 'Review Score' : 'Start Evaluation'}
                          </Link>
                        </Button>
                        <Button variant="outline" asChild size="sm">
                          <Link href={`/dragons-den/presentation/${presentation.application.id}`}>
                            View Presentation
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-fit mb-2">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Final Rankings</CardTitle>
              <CardDescription>View comprehensive leaderboard and final rankings</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full">
                <Link href="/dragons-den/leaderboard">View Rankings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full w-fit mb-2">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Detailed scoring analytics and insights</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full">
                <Link href="/dragons-den/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full w-fit mb-2">
                <Award className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Winner Selection</CardTitle>
              <CardDescription>Finalize winners and prepare announcements</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full">
                <Link href="/dragons-den/winners">Select Winners</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DragonsDenDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dragon&apos;s Den dashboard...</p>
        </div>
      </div>
    }>
      <DragonsDenDashboard />
    </Suspense>
  );
} 