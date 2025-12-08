"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Flame,
  Star,
  Target,
  Trophy,
  Presentation,
  MessageSquare,
  Award,
  Timer
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateDragonsDenScores } from "@/lib/actions/dragons-den-scoring";

interface DragonsDenScoringInterfaceProps {
  applicationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  criteria: any[];
}

export function DragonsDenScoringInterface({ 
  applicationId, 
  criteria 
}: DragonsDenScoringInterfaceProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize scores and comments from existing data
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    const initialComments: Record<string, string> = {};
    
    criteria.forEach((criterion) => {
      initialScores[criterion.criterionId] = criterion.score || 0;
      initialComments[criterion.criterionId] = criterion.comments || "";
    });
    
    setScores(initialScores);
    setComments(initialComments);
  }, [criteria]);

  const handleScoreChange = (criterionId: string, newScore: number) => {
    setScores(prev => ({ ...prev, [criterionId]: newScore }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setComments(prev => ({ ...prev, [criterionId]: comment }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateDragonsDenScores(
        applicationId,
        criteria.map((c) => ({
          criterionId: c.criterionId,
          score: scores[c.criterionId] || 0,
          comments: comments[c.criterionId] || ""
        }))
      );

      if (result.success) {
        toast.success("Presentation scores saved successfully!");
        setLastSaved(new Date());
      } else {
        toast.error(result.message || "Failed to save scores");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving scores");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotalScore = criteria.reduce((sum, c) => 
    sum + (scores[c.criterionId] || 0), 0
  );
  const maxTotalScore = criteria.reduce((sum, c) => sum + c.criterion.maxPoints, 0);
  const completedCriteria = criteria.filter((c) => scores[c.criterionId] > 0).length;
  const completionPercentage = Math.round((completedCriteria / criteria.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/dragons-den">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dragon&apos;s Den
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Presentation Evaluation</h1>
                <p className="text-gray-600 mt-1">
                  Dragon&apos;s Den Final Pitch Assessment
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastSaved && (
              <p className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Evaluation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Evaluation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{completionPercentage}%</div>
                <p className="text-sm text-orange-100">Complete</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{completedCriteria}</div>
                <p className="text-sm text-orange-100">Criteria Scored</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{currentTotalScore}</div>
                <p className="text-sm text-orange-100">Current Score</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{maxTotalScore}</div>
                <p className="text-sm text-orange-100">Maximum Score</p>
              </div>
            </div>
            <div className="mt-6">
              <Progress value={completionPercentage} className="h-3 bg-orange-200" />
            </div>
          </CardContent>
        </Card>

        {/* Dragon's Den Criteria Cards */}
        <div className="space-y-6">
          {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
          {criteria.map((criterionData, index) => (
            <Card key={criterionData.criterionId} className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-orange-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full">
                      {criterionData.criterion.category === 'presentation' ? <Presentation className="h-5 w-5 text-white" /> :
                       criterionData.criterion.category === 'pitch' ? <MessageSquare className="h-5 w-5 text-white" /> :
                       criterionData.criterion.category === 'innovation' ? <Star className="h-5 w-5 text-white" /> :
                       <Trophy className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        {criterionData.criterion.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        {criterionData.criterion.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Max: {criterionData.criterion.maxPoints}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-8">
                {/* Score Slider with Large Display */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <Label className="text-lg font-medium text-gray-700">Score</Label>
                    <div className="flex items-center gap-3">
                      <div className="text-5xl font-bold text-orange-600">
                        {scores[criterionData.criterionId] || 0}
                      </div>
                      <div className="text-lg text-gray-500">
                        / {criterionData.criterion.maxPoints}
                      </div>
                    </div>
                  </div>
                  
                  <Slider
                    value={[scores[criterionData.criterionId] || 0]}
                    onValueChange={(value) => handleScoreChange(criterionData.criterionId, value[0])}
                    max={criterionData.criterion.maxPoints}
                    step={1}
                    className="w-full h-4"
                  />
                  
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>0 - Poor</span>
                    <span className="text-center">
                      {Math.floor(criterionData.criterion.maxPoints / 2)} - Average
                    </span>
                    <span>{criterionData.criterion.maxPoints} - Excellent</span>
                  </div>
                </div>

                {/* Evaluation Guidelines */}
                <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    Evaluation Guidelines
                  </h4>
                  <p className="text-sm text-gray-700">
                    {criterionData.criterion.guidelines || 
                     "Evaluate based on clarity, innovation, feasibility, and impact potential of the presentation."}
                  </p>
                </div>

                {/* Comments */}
                <div>
                  <Label htmlFor={`comment-${criterionData.criterionId}`} className="text-lg font-medium mb-3 block">
                    Judge&apos;s Comments & Feedback
                  </Label>
                  <Textarea
                    id={`comment-${criterionData.criterionId}`}
                    placeholder="Provide detailed feedback on the presentation, including strengths, areas for improvement, and specific observations..."
                    value={comments[criterionData.criterionId] || ""}
                    onChange={(e) => handleCommentChange(criterionData.criterionId, e.target.value)}
                    className="min-h-[120px] resize-none text-base"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Final Summary and Actions */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-6 w-6" />
              Final Evaluation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {currentTotalScore} / {maxTotalScore}
                </div>
                <p className="text-purple-100">Total Score</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {Math.round((currentTotalScore / maxTotalScore) * 100)}%
                </div>
                <p className="text-purple-100">Performance</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {completionPercentage === 100 ? '✓' : `${completedCriteria}/${criteria.length}`}
                </div>
                <p className="text-purple-100">Criteria</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {completionPercentage === 100 ? (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Evaluation Complete
                  </Badge>
                ) : (
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2">
                    <Timer className="h-4 w-4 mr-1" />
                    {criteria.length - completedCriteria} criteria remaining
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="border-white text-white hover:bg-white hover:text-purple-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </Button>
                {completionPercentage === 100 && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalize Evaluation
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 