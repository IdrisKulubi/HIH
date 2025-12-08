/* eslint-disable @typescript-eslint/no-explicit-any */

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
  FileText, 
  User,   
  Target,
  Star,
  Shield,
  DollarSign,
  Leaf
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateApplicationScores } from "@/lib/actions/evaluator-scoring";

interface ScoringInterfaceProps {
  assignment: any; // Type this properly based on your data structure
}

export function ScoringInterface({ assignment }: ScoringInterfaceProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const application = assignment.application;

  // Initialize scores and comments from existing data
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    const initialComments: Record<string, string> = {};
    
    assignment.scores.forEach((score: any) => {
      initialScores[score.criterionId] = score.score || 0;
      initialComments[score.criterionId] = score.comments || "";
    });
    
    setScores(initialScores);
    setComments(initialComments);
  }, [assignment.scores]);

  const handleScoreChange = (criterionId: string, newScore: number) => {
    setScores(prev => ({ ...prev, [criterionId]: newScore }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setComments(prev => ({ ...prev, [criterionId]: comment }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateApplicationScores(
        assignment.scores.map((s: any) => ({
          applicationId: application.id,
          criteriaId: s.criteriaId,
          score: scores[s.criteriaId] || 0,
          notes: comments[s.criteriaId] || ""
        }))
      );

      if (result.success) {
        toast.success("Scores saved successfully!");
        setLastSaved(new Date());
      } else {
        toast.error(result.error || "Failed to save scores");
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      toast.error("An error occurred while saving scores");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotalScore = assignment.scores.reduce((sum: number, s: any) => 
    sum + (scores[s.criterionId] || 0), 0
  );
  const completedCriteria = assignment.scores.filter((s: any) => scores[s.criterionId] > 0).length;
  const completionPercentage = Math.round((completedCriteria / assignment.scores.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/evaluator">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{application.business.name}</h1>
              <p className="text-gray-600 mt-1">
                {application.business.applicant.firstName} {application.business.applicant.lastName} • 
                {application.business.city}, {application.business.country}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastSaved && (
              <p className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Evaluation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{completionPercentage}%</div>
                <p className="text-sm text-gray-600">Complete</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedCriteria}</div>
                <p className="text-sm text-gray-600">Criteria Scored</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{currentTotalScore}</div>
                <p className="text-sm text-gray-600">Current Total</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{assignment.maxTotalScore}</div>
                <p className="text-sm text-gray-600">Maximum Score</p>
              </div>
            </div>
            <div className="mt-6">
              <Progress value={completionPercentage} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Application Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Application Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Business Description</Label>
                  <p className="text-sm text-gray-900 mt-1">{application.business.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Problem Solved</Label>
                  <p className="text-sm text-gray-900 mt-1">{application.business.problemSolved}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Climate Contribution</Label>
                  <p className="text-sm text-gray-900 mt-1">{application.business.climateAdaptationContribution}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Started</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(application.business.startDate).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <User className="h-5 w-5 text-green-600" />
                  Applicant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium">
                      {application.business.applicant.firstName} {application.business.applicant.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Gender</Label>
                    <p className="font-medium">{application.business.applicant.gender}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Education</Label>
                    <p className="font-medium">{application.business.applicant.highestEducation}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Citizenship</Label>
                    <p className="font-medium">{application.business.applicant.citizenship}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scoring Interface */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Evaluation Criteria
                </CardTitle>
                <CardDescription>
                  Score each criterion based on the provided guidelines. Your scores will be saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
                  {assignment.scores.map((scoreData: any, index: number) => (
                    <div key={scoreData.criterionId} className="border-b border-gray-100 pb-8 last:border-b-0">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            scoreData.criterion.category === 'technical' ? 'bg-blue-100' :
                            scoreData.criterion.category === 'business' ? 'bg-green-100' :
                            scoreData.criterion.category === 'impact' ? 'bg-purple-100' :
                            'bg-gray-100'
                          }`}>
                            {scoreData.criterion.category === 'technical' ? <Shield className="h-4 w-4 text-blue-600" /> :
                             scoreData.criterion.category === 'business' ? <DollarSign className="h-4 w-4 text-green-600" /> :
                             scoreData.criterion.category === 'impact' ? <Leaf className="h-4 w-4 text-purple-600" /> :
                             <Target className="h-4 w-4 text-gray-600" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{scoreData.criterion.title}</h3>
                            <p className="text-sm text-gray-600">{scoreData.criterion.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          Max: {scoreData.criterion.maxPoints}
                        </Badge>
                      </div>

                      {/* Score Slider */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <Label className="text-sm font-medium">Score</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600">
                              {scores[scoreData.criterionId] || 0}
                            </span>
                            <span className="text-sm text-gray-500">
                              / {scoreData.criterion.maxPoints}
                            </span>
                          </div>
                        </div>
                        <Slider
                          value={[scores[scoreData.criterionId] || 0]}
                          onValueChange={(value) => handleScoreChange(scoreData.criterionId, value[0])}
                          max={scoreData.criterion.maxPoints}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0</span>
                          <span>{scoreData.criterion.maxPoints}</span>
                        </div>
                      </div>

                      {/* Comments */}
                      <div>
                        <Label htmlFor={`comment-${scoreData.criterionId}`} className="text-sm font-medium mb-2 block">
                          Comments & Justification
                        </Label>
                        <Textarea
                          id={`comment-${scoreData.criterionId}`}
                          placeholder="Provide specific feedback and justification for your score..."
                          value={comments[scoreData.criterionId] || ""}
                          onChange={(e) => handleCommentChange(scoreData.criterionId, e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary and Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {currentTotalScore} / {assignment.maxTotalScore}
                        </div>
                        <p className="text-xs text-gray-500">Total Score</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.round((currentTotalScore / assignment.maxTotalScore) * 100)}%
                        </div>
                        <p className="text-xs text-gray-500">Percentage</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Progress
                      </Button>
                      {completionPercentage === 100 && (
                        <Button className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 