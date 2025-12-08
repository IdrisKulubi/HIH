"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Edit3 } from "lucide-react";
import { ScoringSection, EvaluationScores } from "@/types/evaluation";

interface SectionCardProps {
  section: ScoringSection;
  scores: EvaluationScores;
  onOpenModal: () => void;
  icon: React.ReactNode;
}

export function SectionCard({ section, scores, onOpenModal, icon }: SectionCardProps) {
  // Calculate section totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionScores = section.criteria.map(criterion => (scores as any)[criterion.id] || 0);
  const currentTotal = sectionScores.reduce((sum, score) => sum + score, 0);
  const completedCriteria = sectionScores.filter(score => score > 0).length;
  const progressPercentage = (currentTotal / section.maxPoints) * 100;
  const isComplete = completedCriteria === section.criteria.length;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{section.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {section.criteria.length} criteria to evaluate
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentTotal}
              <span className="text-lg text-muted-foreground">/{section.maxPoints}</span>
            </div>
            <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
              {completedCriteria}/{section.criteria.length} completed
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={isComplete ? "text-green-600 font-medium" : "text-muted-foreground"}>
                {isComplete ? "Complete" : "In Progress"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Points Earned</p>
            <p className="font-medium">{currentTotal} points</p>
          </div>
        </div>

        <Button 
          type="button"
          onClick={onOpenModal} 
          className="w-full" 
          variant={isComplete ? "outline" : "default"}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {isComplete ? "Review Scores" : "Start Scoring"}
        </Button>
      </CardContent>

      {/* Visual indicator for completion */}
      {isComplete && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-green-500">
          <CheckCircle2 className="h-3 w-3 text-white absolute -top-4 -right-3" />
        </div>
      )}
    </Card>
  );
} 