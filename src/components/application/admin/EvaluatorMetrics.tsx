"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Activity, 
  Clock, 
  Target, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Timer,
  Award
} from "lucide-react";

interface EvaluatorMetricsProps {
  data: {
    evaluators: Array<{
      evaluatorId: string;
      name: string;
      email: string;
      role: string;
      totalAssignments: number;
      completedEvaluations: number;
      completionRate: number;
      averageScore: number;
      averageDaysToComplete: number;
      consistency: { variance: number; stdDev: number };
      isActive: boolean;
      lastActivity: Date | null;
    }>;
    summary: {
      totalEvaluators: number;
      averageCompletionRate: number;
      activeEvaluators: number;
    };
  };
}

export function EvaluatorMetrics({ data }: EvaluatorMetricsProps) {
  // Sort evaluators by completion rate
  const sortedEvaluators = [...data.evaluators].sort((a, b) => b.completionRate - a.completionRate);
  
  // Get role distribution
  const roleDistribution = data.evaluators.reduce((acc, evaluator) => {
    acc[evaluator.role] = (acc[evaluator.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate performance tiers
  const topPerformers = sortedEvaluators.filter(e => e.completionRate >= 80);
  const averagePerformers = sortedEvaluators.filter(e => e.completionRate >= 50 && e.completionRate < 80);
  const lowPerformers = sortedEvaluators.filter(e => e.completionRate < 50);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluators</CardTitle>
            <Users className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalEvaluators}</div>
            <p className="text-xs text-blue-100">
              {data.summary.activeEvaluators} active this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.averageCompletionRate}%</div>
            <p className="text-xs text-green-100">
              Across all evaluators
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Activity className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((data.summary.activeEvaluators / data.summary.totalEvaluators) * 100)}%
            </div>
            <p className="text-xs text-purple-100">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Evaluator Distribution by Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(roleDistribution).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <p className="text-sm text-gray-600 capitalize">
                  {role.replace('_', ' ')}
                </p>
                <div className="mt-2">
                  <Progress 
                    value={(count / data.summary.totalEvaluators) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Completion rate ≥ 80%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((evaluator, index) => (
                <div key={evaluator.evaluatorId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{evaluator.name}</p>
                      <p className="text-xs text-gray-500">{evaluator.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {evaluator.completionRate}%
                  </Badge>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No evaluators with 80%+ completion rate
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <TrendingUp className="h-5 w-5" />
              Average Performers
            </CardTitle>
            <CardDescription>
              Completion rate 50-79%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {averagePerformers.slice(0, 5).map((evaluator, index) => (
                <div key={evaluator.evaluatorId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{evaluator.name}</p>
                      <p className="text-xs text-gray-500">{evaluator.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {evaluator.completionRate}%
                  </Badge>
                </div>
              ))}
              {averagePerformers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No evaluators in this range
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Needs Attention
            </CardTitle>
            <CardDescription>
              Completion rate &lt; 50%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
              {lowPerformers.slice(0, 5).map((evaluator, index) => (
                <div key={evaluator.evaluatorId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                      !
                    </div>
                    <div>
                      <p className="font-medium text-sm">{evaluator.name}</p>
                      <p className="text-xs text-gray-500">{evaluator.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {evaluator.completionRate}%
                  </Badge>
                </div>
              ))}
              {lowPerformers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  All evaluators performing well!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Evaluator Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Detailed Performance Metrics
          </CardTitle>
          <CardDescription>
            Comprehensive view of all evaluator performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-gray-600">Evaluator</th>
                  <th className="pb-3 font-medium text-gray-600">Role</th>
                  <th className="pb-3 font-medium text-gray-600">Assignments</th>
                  <th className="pb-3 font-medium text-gray-600">Completed</th>
                  <th className="pb-3 font-medium text-gray-600">Rate</th>
                  <th className="pb-3 font-medium text-gray-600">Avg Score</th>
                  <th className="pb-3 font-medium text-gray-600">Speed</th>
                  <th className="pb-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvaluators.map((evaluator) => (
                  <tr key={evaluator.evaluatorId} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-sm">{evaluator.name}</p>
                        <p className="text-xs text-gray-500">{evaluator.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {evaluator.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm">{evaluator.totalAssignments}</td>
                    <td className="py-3 text-sm">{evaluator.completedEvaluations}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={evaluator.completionRate} 
                          className="w-16 h-2"
                        />
                        <span className="text-xs font-medium">{evaluator.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm">{evaluator.averageScore.toFixed(1)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Timer className="h-3 w-3 text-gray-400" />
                        {evaluator.averageDaysToComplete.toFixed(1)}d
                      </div>
                    </td>
                    <td className="py-3">
                      {evaluator.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 