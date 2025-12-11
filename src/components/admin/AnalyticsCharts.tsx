"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Globe,
  Target
} from "lucide-react";

interface AnalyticsChartsProps {
  data: {
    totalApplications: number;
    evaluatedApplications: number;
    evaluationRate: number;
    statusDistribution: Record<string, number>;
    countryDistribution: Record<string, number>;
    averageScore: number;
    maxScore: number;
  };
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Calculate additional metrics
  const topCountries = Object.entries(data.countryDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const statusOrder = ['submitted', 'under_review', 'scoring_phase', 'approved', 'rejected'];
  const orderedStatuses = statusOrder.filter(status => data.statusDistribution[status] > 0);

  return (
    <div className="space-y-6">
      {/* Application Flow Funnel */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Application Evaluation Funnel
          </CardTitle>
          <CardDescription>
            Visual representation of applications moving through evaluation stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {orderedStatuses.map((status, index) => {
              const count = data.statusDistribution[status];
              const percentage = Math.round((count / data.totalApplications) * 100);
              const width = Math.max(percentage, 5); // Minimum width for visibility
              
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${
                          status === 'approved' ? 'bg-green-100 text-green-800' :
                          status === 'rejected' ? 'bg-red-100 text-red-800' :
                          status === 'dragons_den' ? 'bg-orange-100 text-orange-800' :
                          status === 'finalist' ? 'bg-purple-100 text-purple-800' :
                          status === 'scoring_phase' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        } capitalize`}
                      >
                        {status.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium">{count} applications</span>
                    </div>
                    <span className="text-sm text-gray-500">{percentage}%</span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          status === 'approved' ? 'bg-green-500' :
                          status === 'rejected' ? 'bg-red-500' :
                          status === 'dragons_den' ? 'bg-orange-500' :
                          status === 'finalist' ? 'bg-purple-500' :
                          status === 'scoring_phase' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evaluation Progress */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Evaluation Progress
            </CardTitle>
            <CardDescription>
              Overall evaluation completion across all applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {data.evaluationRate}%
                </div>
                <p className="text-gray-600">Applications Evaluated</p>
              </div>
              
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-gray-200"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-purple-500"
                    strokeWidth="3"
                    strokeDasharray={`${data.evaluationRate}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Evaluated</span>
                  <span className="font-medium">{data.evaluatedApplications}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-medium">{data.totalApplications - data.evaluatedApplications}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{data.totalApplications}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Performance */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Score Performance
            </CardTitle>
            <CardDescription>
              Average scoring performance across all evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {data.averageScore.toFixed(1)}
                </div>
                <p className="text-gray-600">Average Score</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Performance Rating</span>
                    <span className="font-medium">
                      {Math.round((data.averageScore / data.maxScore) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(data.averageScore / data.maxScore) * 100} 
                    className="h-3"
                  />
                </div>

                {/* Score Ranges */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Excellent (80-100)</span>
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Good (60-79)</span>
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Average (40-59)</span>
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Below Average (&lt;40)</span>
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Regional Application Distribution
          </CardTitle>
          <CardDescription>
            Top performing regions by application volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCountries.map(([country, count], index) => {
              const percentage = Math.round((count / data.totalApplications) * 100);
              
              return (
                <div key={country} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium capitalize truncate">{country}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-24 bg-gray-100 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-amber-600' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                    <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg text-center p-4">
          <div className="text-2xl font-bold text-blue-600">{data.totalApplications}</div>
          <p className="text-xs text-gray-600 mt-1">Total Applications</p>
        </Card>
        <Card className="border-0 shadow-lg text-center p-4">
          <div className="text-2xl font-bold text-green-600">{data.evaluatedApplications}</div>
          <p className="text-xs text-gray-600 mt-1">Evaluated</p>
        </Card>
        <Card className="border-0 shadow-lg text-center p-4">
          <div className="text-2xl font-bold text-purple-600">{data.averageScore.toFixed(1)}</div>
          <p className="text-xs text-gray-600 mt-1">Avg Score</p>
        </Card>
        <Card className="border-0 shadow-lg text-center p-4">
          <div className="text-2xl font-bold text-orange-600">{Object.keys(data.countryDistribution).length}</div>
          <p className="text-xs text-gray-600 mt-1">Countries</p>
        </Card>
      </div>
    </div>
  );
} 