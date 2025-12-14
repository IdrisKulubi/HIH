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
import { CheckCircle2, Circle, FileText, Eye, CheckCircle } from "lucide-react";
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

  // Get relevant application data for each criterion type
  const getRelevantApplicationData = (criterionId: string) => {
    if (!applicationData) return null;

    const { business, applicant, revenues, impactPotential, socialImpact, businessModel } = applicationData;

    // Foundation Track Criteria
    switch (criterionId) {
      case 'revenueProof':
      case 'annualRevenue':
        return {
          title: "Revenue Information",
          data: [
            { label: "Annual Revenue", value: business?.revenueLastYear ? `KES ${business.revenueLastYear.toLocaleString()}` : (revenues?.revenueLastYear ? `KES ${revenues.revenueLastYear.toLocaleString()}` : 'Not provided') },
            { label: "Revenue (Last 2 Years)", value: business?.revenueLastTwoYears ? `KES ${parseFloat(business.revenueLastTwoYears).toLocaleString()}` : 'Not provided' },
          ]
        };

      case 'customerCount':
        return {
          title: "Customer Information",
          data: [
            { label: "Customer Count (6 months)", value: business?.customerCountLastSixMonths?.toLocaleString() || 'Not provided' },
            { label: "Target Customers", value: business?.targetCustomers?.join(", ") || 'Not specified' },
          ]
        };

      case 'externalFunding':
      case 'fundsRaised':
        return {
          title: "Funding Information",
          data: [
            { label: "Has External Funding", value: revenues?.hasExternalFunding ? 'Yes' : 'No' },
            { label: "Funding Details", value: revenues?.externalFundingDetails || business?.funding?.length ? `${business.funding?.length} funding round(s)` : 'No external funding' },
          ]
        };

      case 'businessModelDescription':
      case 'businessModelUniqueness':
        return {
          title: "Business Model",
          data: [
            { label: "Business Description", value: business?.description || 'Not provided' },
            { label: "Product/Service", value: business?.productServiceDescription || 'Not provided' },
            { label: "Problem Solved", value: business?.problemSolved || 'Not provided' },
          ]
        };

      case 'relativePricing':
        return {
          title: "Pricing Information",
          data: [
            { label: "Unit Price", value: business?.unitPrice ? `KES ${parseFloat(business.unitPrice).toLocaleString()}` : 'Not provided' },
          ]
        };

      case 'productDifferentiation':
      case 'marketDifferentiation':
        return {
          title: "Product Differentiation",
          data: [
            { label: "Product Description", value: business?.productServiceDescription || 'Not provided' },
            { label: "Problem Solved", value: business?.problemSolved || 'Not provided' },
            { label: "Business Description", value: business?.description || 'Not provided' },
          ]
        };

      case 'threatOfSubstitutes':
      case 'easeOfEntry':
      case 'competitiveAdvantage':
        return {
          title: "Market Competition",
          data: [
            { label: "Business Sector", value: business?.sector || 'Not provided' },
            { label: "Product Description", value: business?.productServiceDescription || 'Not provided' },
            { label: "Current Challenges", value: business?.currentChallenges || 'Not provided' },
          ]
        };

      case 'environmentalImpact':
      case 'environmentalImpactAcc':
        return {
          title: "Environmental Impact",
          data: [
            { label: "Environmental Impact", value: socialImpact?.environmentalImpact || 'Not specified' },
            { label: "Description", value: socialImpact?.environmentalImpactDescription || 'Not provided' },
            { label: "Climate Contribution", value: business?.climateAdaptationContribution || 'Not provided' },
          ]
        };

      case 'specialGroupsEmployed':
      case 'currentSpecialGroupsEmployed':
        return {
          title: "Employment - Special Groups",
          data: [
            { label: "Total Employees", value: impactPotential?.fullTimeEmployeesTotal || business?.employees?.fullTimeTotal || 'Not provided' },
            { label: "Women Employed", value: impactPotential?.fullTimeEmployeesWomen || business?.employees?.women || 'Not provided' },
            { label: "Youth Employed", value: impactPotential?.fullTimeEmployeesYouth || business?.employees?.youth || 'Not provided' },
            { label: "PWD Employed", value: impactPotential?.fullTimeEmployeesPwd || business?.employees?.pwd || 'Not provided' },
          ]
        };

      case 'jobCreationPotential':
        return {
          title: "Job Creation Potential",
          data: [
            { label: "Job Creation Rating", value: impactPotential?.jobCreationPotential || 'Not specified' },
            { label: "Projected Inclusion", value: impactPotential?.projectedInclusion || 'Not specified' },
            { label: "Current Employees", value: impactPotential?.fullTimeEmployeesTotal || 'Not provided' },
          ]
        };

      case 'businessCompliance':
        return {
          title: "Business Compliance",
          data: [
            { label: "Business Registered", value: business?.isRegistered ? 'Yes' : 'No' },
            { label: "Registration Type", value: business?.registrationType || 'Not specified' },
            { label: "Has Financial Records", value: business?.hasFinancialRecords ? 'Yes' : 'No' },
          ]
        };

      case 'yearsOfOperation':
        return {
          title: "Years of Operation",
          data: [
            { label: "Years Operational", value: business?.yearsOperational || revenues?.yearsOperational || 'Not provided' },
            { label: "Start Date", value: business?.startDate ? new Date(business.startDate).toLocaleDateString() : 'Not provided' },
          ]
        };

      case 'futureSalesGrowth':
        return {
          title: "Growth Projections",
          data: [
            { label: "Future Sales Growth", value: revenues?.futureSalesGrowth || 'Not specified' },
            { label: "Growth Reason", value: revenues?.futureSalesGrowthReason || 'Not provided' },
            { label: "Growth History", value: revenues?.growthHistory || 'Not provided' },
          ]
        };

      case 'offeringFocus':
      case 'salesMarketingIntegration':
        return {
          title: "Sales & Marketing",
          data: [
            { label: "Product Description", value: business?.productServiceDescription || 'Not provided' },
            { label: "Target Customers", value: business?.targetCustomers?.join(", ") || 'Not specified' },
            { label: "Business Description", value: business?.description || 'Not provided' },
          ]
        };

      case 'socialImpact':
        return {
          title: "Social Impact",
          data: [
            { label: "Social Impact Level", value: socialImpact?.socialImpactContribution || 'Not specified' },
            { label: "Special Groups Employed", value: `Women: ${impactPotential?.fullTimeEmployeesWomen || 0}, Youth: ${impactPotential?.fullTimeEmployeesYouth || 0}, PWD: ${impactPotential?.fullTimeEmployeesPwd || 0}` },
          ]
        };

      case 'supplierInvolvement':
        return {
          title: "Supplier Engagement",
          data: [
            { label: "Supplier Involvement", value: socialImpact?.supplierInvolvement || 'Not specified' },
            { label: "Support Description", value: socialImpact?.supplierSupportDescription || 'Not provided' },
          ]
        };

      case 'customerValueProposition':
        return {
          title: "Value Proposition",
          data: [
            { label: "Value Proposition", value: businessModel?.customerValueProposition || 'Not specified' },
            { label: "Product Description", value: business?.productServiceDescription || 'Not provided' },
            { label: "Problem Solved", value: business?.problemSolved || 'Not provided' },
          ]
        };

      case 'competitiveAdvantageStrength':
        return {
          title: "Competitive Advantage",
          data: [
            { label: "Advantage Strength", value: businessModel?.competitiveAdvantageStrength || 'Not specified' },
            { label: "Barriers", value: businessModel?.competitiveAdvantageBarriers || 'Not provided' },
          ]
        };

      default:
        return {
          title: "General Business Information",
          data: [
            { label: "Business Name", value: business?.name || 'N/A' },
            { label: "Description", value: business?.description || 'N/A' },
            { label: "Location", value: `${business?.city || 'N/A'}, ${business?.country || 'N/A'}` },
          ]
        };
    }
  };

  const relevantData = getRelevantApplicationData(criterion.id);
  const isSelected = currentScore > 0;

  return (
    <Card className={`mb-4 transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSelected && <CheckCircle className="h-5 w-5 text-green-600" />}
            <CardTitle className="text-lg">{criterion.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isSelected ? "default" : "outline"} className={`text-sm ${isSelected ? 'bg-green-600' : ''}`}>
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
              <div className="grid grid-cols-1 gap-2">
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
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${currentScore === option.value
                  ? 'bg-green-100 border-green-300'
                  : 'hover:bg-gray-50 border-gray-200'
                }`}
              onClick={() => onScoreChange(option.value)}
            >
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{section.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Select the option that best matches the application for each criterion. Click &quot;View Data&quot; to see relevant information.
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

          <TabsContent value="scoring" className="py-6 space-y-4">
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
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {applicationData.business?.name || 'N/A'}</div>
                    <div><strong>Sector:</strong> {applicationData.business?.sector || 'N/A'}</div>
                    <div><strong>Location:</strong> {applicationData.business?.city || 'N/A'}, {applicationData.business?.country || 'Kenya'}</div>
                    <div><strong>Years Operational:</strong> {applicationData.business?.yearsOperational || 'N/A'}</div>
                    <div><strong>Registered:</strong> {applicationData.business?.isRegistered ? "Yes" : "No"}</div>
                    <div><strong>Employees:</strong> {applicationData.impactPotential?.fullTimeEmployeesTotal || applicationData.business?.employees?.fullTimeTotal || 'N/A'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Applicant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {applicationData.applicant?.firstName || 'N/A'} {applicationData.applicant?.lastName || ''}</div>
                    <div><strong>Email:</strong> {applicationData.applicant?.email || 'N/A'}</div>
                    <div><strong>Phone:</strong> {applicationData.applicant?.phone || 'N/A'}</div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Business Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{applicationData.business?.description || 'No description provided'}</p>
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