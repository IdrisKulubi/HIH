"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Users,
  Target
} from "lucide-react";
import { reEvaluateApplications } from "@/lib/actions/scoring";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ReEvaluationDialogProps {
  children: React.ReactNode;
  configId: number;
}

export function ReEvaluationDialog({ children, configId }: ReEvaluationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();

  const handleReEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const result = await reEvaluateApplications(configId);
      
      if (result.success) {
        setEvaluationResults(result.data?.results || []);
        setShowResults(true);
        toast.success(`Successfully re-evaluated ${result.data?.results?.length || 0} applications!`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to re-evaluate applications");
      }
    } catch (error) {
      console.error("Error re-evaluating applications:", error);
      toast.error("An error occurred during re-evaluation");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowResults(false);
    setEvaluationResults([]);
  };

  // Calculate summary statistics
  const stats = evaluationResults.length > 0 ? {
    totalApplications: evaluationResults.length,
    scoreIncreases: evaluationResults.filter(r => r.scoreChange > 0).length,
    scoreDecreases: evaluationResults.filter(r => r.scoreChange < 0).length,
    noChange: evaluationResults.filter(r => r.scoreChange === 0).length,
    becameEligible: evaluationResults.filter(r => !r.previousEligible && r.newEligible).length,
    becameIneligible: evaluationResults.filter(r => r.previousEligible && !r.newEligible).length,
    averageScoreChange: evaluationResults.reduce((sum, r) => sum + r.scoreChange, 0) / evaluationResults.length,
  } : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            Re-evaluate Applications
          </DialogTitle>
          <DialogDescription>
            Apply the new scoring configuration to all existing applications and see the impact.
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          // Pre-evaluation view
          (<div className="space-y-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">About Re-evaluation</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• All existing applications will be re-scored using the currently active scoring configuration</p>
                    <p>• Previous evaluation results will be saved in the evaluation history</p>
                    <p>• Changes in eligibility status will be tracked and can be reviewed</p>
                    <p>• This action cannot be undone, but you can see before/after comparisons</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-yellow-900">What This Will Do</h3>
                  <div className="text-sm text-yellow-800 space-y-1">
                    <p>• Calculate new scores for all applications based on current data</p>
                    <p>• Update eligibility status based on the new pass threshold</p>
                    <p>• Generate a detailed impact report showing all changes</p>
                    <p>• Create an audit trail for compliance and review purposes</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isEvaluating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReEvaluate}
                disabled={isEvaluating}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Re-evaluating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Re-evaluation
                  </>
                )}
              </Button>
            </div>
          </div>)
        ) : (
          // Results view
          (<div className="space-y-6 py-4">
            {/* Summary Statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Applications</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.totalApplications}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Score Increases</p>
                        <p className="text-2xl font-bold text-green-900">{stats.scoreIncreases}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Score Decreases</p>
                        <p className="text-2xl font-bold text-red-900">{stats.scoreDecreases}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Avg. Change</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {stats.averageScoreChange > 0 ? '+' : ''}{stats.averageScoreChange.toFixed(1)}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Eligibility Changes */}
            {stats && (stats.becameEligible > 0 || stats.becameIneligible > 0) && (
              <Card className="border border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Eligibility Status Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-900">Became Eligible</div>
                        <div className="text-sm text-green-700">{stats.becameEligible} applications</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Became Ineligible</div>
                        <div className="text-sm text-red-700">{stats.becameIneligible} applications</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Separator />
            {/* Detailed Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Detailed Results</h3>
                <Badge variant="outline" className="text-gray-600">
                  {evaluationResults.length} applications
                </Badge>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {evaluationResults.map((result, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{result.businessName}</div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Previous: {result.previousScore} pts</span>
                            <span>New: {result.newScore} pts</span>
                            <span className={`flex items-center gap-1 ${
                              result.scoreChange > 0 ? 'text-green-600' : 
                              result.scoreChange < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {result.scoreChange > 0 ? <TrendingUp className="h-3 w-3" /> : 
                               result.scoreChange < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                              {result.scoreChange > 0 ? '+' : ''}{result.scoreChange} pts
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={result.previousEligible ? "default" : "secondary"}
                            className="text-xs"
                          >
                            Was: {result.previousEligible ? 'Eligible' : 'Ineligible'}
                          </Badge>
                          <Badge 
                            variant={result.newEligible ? "default" : "secondary"}
                            className="text-xs"
                          >
                            Now: {result.newEligible ? 'Eligible' : 'Ineligible'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>)
        )}
      </DialogContent>
    </Dialog>
  );
}
