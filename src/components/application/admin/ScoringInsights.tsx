"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  BarChart3, 
  TrendingUp, 
  Star,
  Award,
  Shield,
  DollarSign,
  Leaf,
  Zap
} from "lucide-react";

interface ScoringInsightsProps {
  data: {
    criteriaAnalytics: Array<{
      criterionId: string;
      title: string;
      category: string;
      phase: string;
      maxPoints: number;
      averageScore: number;
      totalScores: number;
      minScore: number;
      maxScoreActual: number;
      utilizationRate: number;
    }>;
    scoreDistribution: Array<{
      phase: string;
      scoreRange: string;
      count: number;
    }>;
    topApplications: Array<{
      applicationId: string;
      businessName: string;
      applicantName: string;
      totalScore: number;
      maxPossibleScore: number;
      percentage: number;
      scoreCount: number;
    }>;
  };
}

export function ScoringInsights({ data }: ScoringInsightsProps) {
  // Group criteria by phase
  const criteriaByPhase = data.criteriaAnalytics.reduce((acc, criterion) => {
    if (!acc[criterion.phase]) {
      acc[criterion.phase] = [];
    }
    acc[criterion.phase].push(criterion);
    return acc;
  }, {} as Record<string, typeof data.criteriaAnalytics>);

  // Group score distribution by phase
  const distributionByPhase = data.scoreDistribution.reduce((acc, item) => {
    if (!acc[item.phase]) {
      acc[item.phase] = [];
    }
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, typeof data.scoreDistribution>);

  // Calculate phase averages
  const phaseAverages = Object.entries(criteriaByPhase).map(([phase, criteria]) => {
    const avgScore = criteria.reduce((sum, c) => sum + c.averageScore, 0) / criteria.length;
    const avgUtilization = criteria.reduce((sum, c) => sum + c.utilizationRate, 0) / criteria.length;
    const totalEvaluations = criteria.reduce((sum, c) => sum + c.totalScores, 0);
    
    return {
      phase,
      averageScore: avgScore,
      averageUtilization: avgUtilization,
      totalEvaluations,
      criteriaCount: criteria.length
    };
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'business': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'impact': return <Leaf className="h-4 w-4 text-purple-600" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'technical': return 'blue';
      case 'jury': return 'purple';
      case 'dragons_den': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Phase Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {phaseAverages.map((phase) => {
          const color = getPhaseColor(phase.phase);
          return (
            <Card key={phase.phase} className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className={`p-2 rounded-lg bg-${color}-100`}>
                    {phase.phase === 'technical' ? <Shield className={`h-4 w-4 text-${color}-600`} /> :
                     phase.phase === 'jury' ? <Award className={`h-4 w-4 text-${color}-600`} /> :
                     <Star className={`h-4 w-4 text-${color}-600`} />}
                  </div>
                  {phase.phase.replace('_', ' ').toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {phase.averageScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-600">Average Score</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Utilization</span>
                    <span className="font-medium">{phase.averageUtilization.toFixed(0)}%</span>
                  </div>
                  <Progress value={phase.averageUtilization} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-medium">{phase.totalEvaluations}</div>
                    <div className="text-gray-600">Evaluations</div>
                  </div>
                  <div>
                    <div className="font-medium">{phase.criteriaCount}</div>
                    <div className="text-gray-600">Criteria</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Criteria Performance Analysis */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Criteria Performance Analysis
          </CardTitle>
          <CardDescription>
            Detailed breakdown of scoring performance by individual criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(criteriaByPhase).map(([phase, criteria]) => (
              <div key={phase} className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`bg-${getPhaseColor(phase)}-100 text-${getPhaseColor(phase)}-800 capitalize`}>
                    {phase.replace('_', ' ')} Phase
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {criteria.length} criteria
                  </span>
                </div>
                
                <div className="grid gap-4">
                  {criteria.map((criterion) => (
                    <div key={criterion.criterionId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(criterion.category)}
                          <div>
                            <h4 className="font-medium text-gray-900">{criterion.title}</h4>
                            <p className="text-sm text-gray-600 capitalize">
                              {criterion.category} • Max {criterion.maxPoints} points
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {criterion.averageScore.toFixed(1)}
                          </div>
                          <p className="text-xs text-gray-600">
                            {criterion.totalScores} evaluations
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Utilization Rate</span>
                            <span className="font-medium">{criterion.utilizationRate}%</span>
                          </div>
                          <Progress value={criterion.utilizationRate} className="h-2" />
                        </div>
                        
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Range:</span>
                            <span className="font-medium">
                              {criterion.minScore} - {criterion.maxScoreActual}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Efficiency:</span>
                            <span className={`font-medium ${
                              criterion.utilizationRate >= 70 ? 'text-green-600' :
                              criterion.utilizationRate >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {criterion.utilizationRate >= 70 ? 'Excellent' :
                               criterion.utilizationRate >= 50 ? 'Good' : 'Needs Improvement'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Score Distribution Analysis
          </CardTitle>
          <CardDescription>
            Distribution of scores across different ranges by evaluation phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(distributionByPhase).map(([phase, distribution]) => {
              const total = distribution.reduce((sum, item) => sum + item.count, 0);
              const color = getPhaseColor(phase);
              
              return (
                <div key={phase} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`bg-${color}-100 text-${color}-800 capitalize`}>
                      {phase.replace('_', ' ')} Phase
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {total} total scores
                    </span>
                  </div>
                  
                  <div className="grid gap-2">
                    {['80-100', '60-79', '40-59', '20-39', '0-19'].map((range) => {
                      const item = distribution.find(d => d.scoreRange === range);
                      const count = item?.count || 0;
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={range} className="flex items-center gap-4">
                          <div className="w-16 text-sm font-medium">{range}</div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full ${
                                  range === '80-100' ? 'bg-green-500' :
                                  range === '60-79' ? 'bg-blue-500' :
                                  range === '40-59' ? 'bg-yellow-500' :
                                  range === '20-39' ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="w-12 text-sm font-medium text-right">{count}</div>
                            <div className="w-12 text-xs text-gray-500 text-right">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Applications */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Top Performing Applications
          </CardTitle>
          <CardDescription>
            Applications with the highest overall scores across all evaluation phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topApplications.slice(0, 10).map((app, index) => (
              <div key={app.applicationId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' :
                    'bg-blue-500'
                  }`}>
                    {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{app.businessName}</h4>
                    <p className="text-sm text-gray-600">{app.applicantName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {app.totalScore}/{app.maxPossibleScore}
                    </div>
                    <p className="text-xs text-gray-600">Total Score</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {app.percentage}%
                    </div>
                    <p className="text-xs text-gray-600">Performance</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {app.scoreCount}
                    </div>
                    <p className="text-xs text-gray-600">Evaluations</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Key Scoring Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="font-semibold text-blue-800 mb-2">Highest Scoring Criteria</div>
              <p className="text-sm text-blue-700">
                {data.criteriaAnalytics.length > 0 && 
                  data.criteriaAnalytics.reduce((max, curr) => 
                    curr.averageScore > max.averageScore ? curr : max
                  ).title
                } leads with highest average scores.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="font-semibold text-green-800 mb-2">Best Utilization</div>
              <p className="text-sm text-green-700">
                Evaluators are effectively using{' '}
                {data.criteriaAnalytics.length > 0 && 
                  Math.round(data.criteriaAnalytics.reduce((sum, c) => sum + c.utilizationRate, 0) / data.criteriaAnalytics.length)
                }% of available scoring range.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="font-semibold text-purple-800 mb-2">Evaluation Volume</div>
              <p className="text-sm text-purple-700">
                {data.criteriaAnalytics.reduce((sum, c) => sum + c.totalScores, 0)} total evaluations completed across all criteria.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 