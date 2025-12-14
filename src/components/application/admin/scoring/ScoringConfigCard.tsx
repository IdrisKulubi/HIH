"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Play,
  Eye,

  Clock,
  BarChart3,
  Target,
  Users,
  Calendar,
  User
} from "lucide-react";
import { activateScoringConfiguration } from "@/lib/actions/scoring";
import { toast } from "sonner";
import { ScoringCriteriaPreview } from "./ScoringCriteriaPreview";
import { useRouter } from "next/navigation";

interface ScoringConfigCardProps {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  isActive: boolean;
}

export function ScoringConfigCard({ config, isActive }: ScoringConfigCardProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const router = useRouter();

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const result = await activateScoringConfiguration(config.id);
      if (result.success) {
        toast.success("Configuration activated successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to activate configuration");
      }
    } catch (error) {
      console.error("Error activating configuration:", error);
      toast.error("An error occurred while activating configuration");
    } finally {
      setIsActivating(false);
    }
  };

  // Group criteria by category
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categorizedCriteria = config.criteria.reduce((acc: any, criteria: any) => {
    if (!acc[criteria.category]) {
      acc[criteria.category] = [];
    }
    acc[criteria.category].push(criteria);
    return acc;
  }, {});

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryTotals = Object.entries(categorizedCriteria).map(([category, criteria]: [string, any]) => ({
    category,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    totalPoints: criteria.reduce((sum: number, c: any) => sum + c.weight, 0),
    criteriaCount: criteria.length
  }));

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${isActive
      ? 'border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
      : 'border hover:border-blue-200'
      }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{config.name}</CardTitle>
              {isActive && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              {config.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* <Badge variant="outline" className="text-xs">
              v{config.version}
            </Badge> */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Pass:</span>
            <span className="font-medium">60%</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-gray-600">Max:</span>
            <span className="font-medium">100</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4 text-orange-500" />
            <span className="text-gray-600">Criteria:</span>
            <span className="font-medium">{config.criteria.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-gray-600">Categories:</span>
            <span className="font-medium">{Object.keys(categorizedCriteria).length}</span>
          </div>
        </div>

        <Separator />

        {/* Category Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Category Breakdown</h4>
          <div className="space-y-1">
            {categoryTotals.map(({ category, totalPoints, criteriaCount }) => (
              <div key={category} className="flex justify-between items-center text-xs">
                <span className="text-gray-600 truncate max-w-[180px]" title={category}>
                  {category}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {criteriaCount} items
                  </Badge>
                  <span className="font-medium text-gray-900">{totalPoints}pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            {/* <span>Created by {config.creator?.name || 'Unknown'}</span> */}
            <span>System Configuration</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(config.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCriteria(!showCriteria)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            {showCriteria ? 'Hide' : 'View'} Criteria
          </Button>

          {!isActive && (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={isActivating}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isActivating ? (
                <>
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Activate
                </>
              )}
            </Button>
          )}
        </div>

        {/* Criteria Preview */}
        {showCriteria && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ScoringCriteriaPreview criteria={config.criteria} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 