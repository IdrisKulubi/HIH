/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, FileText, Eye } from "lucide-react";
import { ScoringSection, ScoringCriterion, EvaluationScores } from "@/types/evaluation";

interface ScoringModalProps {
  section: ScoringSection;
  isOpen: boolean;
  onClose: () => void;
  scores: EvaluationScores;
  onScoreChange: (criterionId: string, score: number) => void;
  applicationData: any;
}

interface CriterionScorerProps {
  criterion: ScoringCriterion;
  currentScore: number;
  onScoreChange: (score: number) => void;
  applicationData: any;
}

function CriterionScorer({ criterion, currentScore, onScoreChange, applicationData }: CriterionScorerProps) {
  const [showApplicationData, setShowApplicationData] = useState(false);

  const getRelevantApplicationData = (criterionId: string) => {
    if (!applicationData) return null;

    const { business, applicant } = applicationData;

    switch (criterionId) {
      case 'timeFrameFeasibility':
        return {
          title: "Time Frame & Implementation Details",
          data: [
            { label: "Business Start Date", value: new Date(business.startDate).toLocaleDateString() },
            { label: "Business Age", value: `${Math.floor((new Date().getTime() - new Date(business.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years` },
            { label: "Current Challenges", value: business.currentChallenges },
            { label: "Support Needed", value: business.supportNeeded },
            { label: "Production Capacity (Last 6 Months)", value: business.productionCapacityLastSixMonths },
            { label: "Additional Information", value: business.additionalInformation || "Not provided" }
          ]
        };

      case 'marketPotentialDemand':
        return {
          title: "Market & Customer Information",
          data: [
            { label: "Unit Price", value: `$${parseFloat(business.unitPrice).toLocaleString()}` },
            { label: "Customer Count (Last 6 Months)", value: business.customerCountLastSixMonths.toLocaleString() },
            { label: "Product/Service Description", value: business.productServiceDescription },
            { label: "Problem Being Solved", value: business.problemSolved },
            { label: "Target Customers", value: business.targetCustomers?.join(", ") || "Not specified" },
            { label: "Production Capacity", value: business.productionCapacityLastSixMonths }
          ]
        };

      case 'financialManagement':
        return {
          title: "Financial Information",
          data: [
            { label: "Revenue (Last 2 Years)", value: `$${parseFloat(business.revenueLastTwoYears).toLocaleString()}` },
            { label: "Unit Price", value: `$${parseFloat(business.unitPrice).toLocaleString()}` },
            { label: "Customer Count", value: business.customerCountLastSixMonths.toLocaleString() },
            { label: "Business Registration", value: business.isRegistered ? "Yes" : "No" },
            { label: "Registered Countries", value: business.registeredCountries },
            { label: "Funding History", value: business.funding?.length ? `${business.funding.length} funding round(s)` : "No external funding" }
          ]
        };

      case 'entrepreneurshipManagement':
        return {
          title: "Management & Leadership Information",
          data: [
            { label: "Founder", value: `${applicant?.firstName || 'N/A'} ${applicant?.lastName || ''}` },
            { label: "Education Level", value: applicant?.highestEducation?.replace(/_/g, ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A' },
            { label: "Age", value: applicant?.dateOfBirth ? `${new Date().getFullYear() - new Date(applicant.dateOfBirth).getFullYear()} years` : 'N/A' },
            { label: "Business Experience", value: business?.startDate ? `${Math.floor((new Date().getTime() - new Date(business.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years running this business` : 'N/A' },
            { label: "Team Size", value: business?.employees?.fullTimeTotal ? `${business.employees.fullTimeTotal} full-time employees` : 'N/A' },
            { label: "Business Vision", value: business?.description || 'N/A' }
          ]
        };

      case 'climateAdaptationBenefits':
        return {
          title: "Climate Adaptation Information",
          data: [
            { label: "Climate Adaptation Contribution", value: business.climateAdaptationContribution },
            { label: "Climate Extreme Impact", value: business.climateExtremeImpact },
            { label: "Product/Service Description", value: business.productServiceDescription },
            { label: "Problem Solved", value: business.problemSolved }
          ]
        };

      case 'innovativeness':
        return {
          title: "Innovation Information",
          data: [
            { label: "Business Description", value: business.description },
            { label: "Product/Service Innovation", value: business.productServiceDescription },
            { label: "Current Challenges", value: business.currentChallenges },
            { label: "Business Age", value: `Started ${new Date(business.startDate).toLocaleDateString()}` }
          ]
        };

      default:
        return {
          title: "General Business Information",
          data: [
            { label: "Business Name", value: business?.name || 'N/A' },
            { label: "Description", value: business?.description || 'N/A' },
            { label: "Location", value: `${business?.city || 'N/A'}, ${business?.country || 'N/A'}` },
            { label: "Current Challenges", value: business?.currentChallenges || 'N/A' },
            { label: "Support Needed", value: business?.supportNeeded || 'N/A' }
          ]
        };
    }
  };

  const relevantData = getRelevantApplicationData(criterion.id);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{criterion.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {currentScore}/{criterion.maxPoints} points
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowApplicationData(!showApplicationData)}
              className="h-8 px-3"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showApplicationData ? "Hide" : "View"} Data
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showApplicationData && relevantData && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {relevantData.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-3">
                {relevantData.data.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="font-medium text-sm text-blue-900">{item.label}:</div>
                    <div className="md:col-span-2 text-sm text-blue-800 whitespace-pre-wrap">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <RadioGroup
          value={currentScore.toString()}
          onValueChange={(value) => onScoreChange(parseInt(value))}
          className="space-y-3"
        >
          {criterion.options.map((option) => (
            <div key={option.value} className="flex items-start space-x-3">
              <RadioGroupItem
                value={option.value.toString()}
                id={`${criterion.id}-${option.value}`}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={`${criterion.id}-${option.value}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">{option.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {option.value} pts
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground pl-0">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export function ScoringModal({
  section,
  isOpen,
  onClose,
  scores,
  onScoreChange,
  applicationData
}: ScoringModalProps) {
  const [tempScores, setTempScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    section.criteria.forEach(criterion => {
      initial[criterion.id] = (scores as any)[criterion.id] || 0;
    });
    return initial;
  });

  const handleScoreChange = (criterionId: string, score: number) => {
    setTempScores(prev => ({ ...prev, [criterionId]: score }));
  };

  const handleSave = () => {
    Object.entries(tempScores).forEach(([criterionId, score]) => {
      onScoreChange(criterionId, score);
    });
    onClose();
  };

  const handleCancel = () => {
    const resetScores: Record<string, number> = {};
    section.criteria.forEach(criterion => {
      resetScores[criterion.id] = (scores as any)[criterion.id] || 0;
    });
    setTempScores(resetScores);
    onClose();
  };

  const sectionTotal = Object.values(tempScores).reduce((sum, score) => sum + score, 0);
  const completedCriteria = section.criteria.filter(criterion => tempScores[criterion.id] > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{section.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Score each criterion based on the application details. Click &quot;View Data&quot; to see relevant applicant information.
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {sectionTotal}/{section.maxPoints}
              </div>
              <div className="text-sm text-muted-foreground">
                {completedCriteria}/{section.criteria.length} completed
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="scoring" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="overview">Application Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="scoring" className="py-6 space-y-6">
            {section.criteria.map((criterion) => (
              <CriterionScorer
                key={criterion.id}
                criterion={criterion}
                currentScore={tempScores[criterion.id] || 0}
                onScoreChange={(score) => handleScoreChange(criterion.id, score)}
                applicationData={applicationData}
              />
            ))}
          </TabsContent>

          <TabsContent value="overview" className="py-6">
            {applicationData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Name:</strong> {applicationData.business.name}</div>
                    <div><strong>Location:</strong> {applicationData.business.city}, {applicationData.business.country}</div>
                    <div><strong>Started:</strong> {new Date(applicationData.business.startDate).toLocaleDateString()}</div>
                    <div><strong>Registered:</strong> {applicationData.business.isRegistered ? "Yes" : "No"}</div>
                    <div><strong>Revenue (2 years):</strong> ${parseFloat(applicationData.business.revenueLastTwoYears).toLocaleString()}</div>
                    <div><strong>Employees:</strong> {applicationData.business.employees.fullTimeTotal} full-time</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Founder Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Name:</strong> {applicationData.applicant?.firstName || 'N/A'} {applicationData.applicant?.lastName || ''}</div>
                    <div><strong>Education:</strong> {applicationData.applicant?.highestEducation?.replace(/_/g, ' ') || 'N/A'}</div>
                    <div><strong>Age:</strong> {applicationData.applicant?.dateOfBirth ? `${new Date().getFullYear() - new Date(applicationData.applicant.dateOfBirth).getFullYear()} years` : 'N/A'}</div>
                    <div><strong>Citizenship:</strong> {applicationData.applicant?.citizenship || 'N/A'}</div>
                    <div><strong>Residence:</strong> {applicationData.applicant?.countryOfResidence || 'N/A'}</div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Business Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{applicationData.business.description}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-background border-t pt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {completedCriteria === section.criteria.length ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {completedCriteria === section.criteria.length
                ? "All criteria scored"
                : `${section.criteria.length - completedCriteria} criteria remaining`
              }
            </span>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Scores
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 