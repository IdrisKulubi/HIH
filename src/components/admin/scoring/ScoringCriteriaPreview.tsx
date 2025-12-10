"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, Award, Target } from "lucide-react";

interface ScoringCriteriaPreviewProps {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  criteria: any[];
}

export function ScoringCriteriaPreview({ criteria }: ScoringCriteriaPreviewProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Set<number>>(new Set());

  const toggleCriteria = (criteriaId: number) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criteriaId)) {
      newExpanded.delete(criteriaId);
    } else {
      newExpanded.add(criteriaId);
    }
    setExpandedCriteria(newExpanded);
  };

  // Group criteria by category
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categorizedCriteria = criteria.reduce((acc: any, criteria: any) => {
    if (!acc[criteria.category]) {
      acc[criteria.category] = [];
    }
    acc[criteria.category].push(criteria);
    return acc;
  }, {});

  const getCategoryColor = (index: number) => {
    const colors = [
      'border-blue-200 bg-blue-50',
      'border-green-200 bg-green-50',
      'border-purple-200 bg-purple-50',
      'border-orange-200 bg-orange-50',
      'border-pink-200 bg-pink-50',
      'border-indigo-200 bg-indigo-50'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Scoring Criteria</h4>
        <Badge variant="outline" className="text-xs">
          {criteria.length} criteria
        </Badge>
      </div>

      <div className="space-y-3">
        {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
        {Object.entries(categorizedCriteria).map(([category, categoryCriteria]: [string, any], categoryIndex) => {
          //eslint-disable-next-line @typescript-eslint/no-explicit-any
          const categoryTotal = categoryCriteria.reduce((sum: number, c: any) => sum + c.weight, 0);

          return (
            <Card key={category} className={`border ${getCategoryColor(categoryIndex)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-800">
                    {category}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-white/80 text-gray-700 border-gray-300">
                      {categoryCriteria.length} items
                    </Badge>
                    <Badge className="text-xs bg-white/80 text-gray-700 border-gray-300">
                      {categoryTotal} pts
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
                {categoryCriteria.map((criteria: any) => {
                  const isExpanded = expandedCriteria.has(criteria.id);
                  const scoringLevels = criteria.scoringLevels ? JSON.parse(criteria.scoringLevels) : [];

                  return (
                    <div key={criteria.id} className="border border-gray-200 rounded-lg bg-white">
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto p-3 hover:bg-gray-50"
                        onClick={() => toggleCriteria(criteria.id)}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <Target className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="space-y-1">
                            <div className="font-medium text-sm text-gray-900">
                              {criteria.criteriaName}
                            </div>
                            {/* Description removed as not in schema */}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {criteria.weight} pts
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </Button>

                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <Separator className="mb-3" />
                          <div className="space-y-3">
                            {/* Criteria Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="font-medium text-gray-700">Max Points:</span>
                                <span className="ml-2 text-gray-900">{criteria.weight}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Type:</span>
                                <span className="ml-2 text-gray-900 capitalize">
                                  Manual
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Required:</span>
                                <span className="ml-2 text-gray-900">
                                  Yes
                                </span>
                              </div>
                            </div>

                            {/* Scoring Levels */}
                            {scoringLevels.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-gray-700">Scoring Levels:</h5>
                                <div className="space-y-1">
                                  {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
                                  {scoringLevels.map((level: any, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Award className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium text-gray-700">
                                          {level.level}
                                        </span>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {level.points} pts
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 