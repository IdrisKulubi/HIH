"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getApplicationById, saveEvaluation, type DetailedApplication } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Lightbulb, DollarSign, Target, Building2 } from "lucide-react";
import { toast } from "sonner";
import { ScoringModal } from "@/components/evaluation/ScoringModal";
import { SectionCard } from "@/components/evaluation/SectionCard";
import { SCORING_SECTIONS, PASS_THRESHOLD, TOTAL_MAX_SCORE, EvaluationScores } from "@/types/evaluation";

export default function EvaluateApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [application, setApplication] = useState<DetailedApplication | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [formState, setFormState] = useState<EvaluationScores>({
    // Innovation and Climate Adaptation Focus (40 points)
    climateAdaptationBenefits: 0,
    innovativeness: 0,
    scalabilityReplicability: 0,
    environmentalImpact: 0,
    socioeconomicGenderImpact: 0,
    // Business Viability (31 points)
    entrepreneurshipManagement: 0,
    marketPotentialDemand: 0,
    financialManagement: 0,
    timeFrameFeasibility: 0,
    // Sectoral and Strategic Alignment (20 points)
    foodSecurityRelevance: 0,
    gcaAlignment: 0,
    // Organizational Capacity and Partnerships (14 points)
    humanResourcesInfrastructure: 0,
    technicalExpertise: 0,
    experienceTrackRecord: 0,
    governanceManagement: 0,
    genderInclusionManagement: 0,
    riskManagementStrategy: 0,
    partnershipsCollaborations: 0,
    // Notes
    evaluationNotes: "",
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    async function resolveParams() {
      try {
        const resolvedParams = await params;
        setApplicationId(parseInt(resolvedParams.id, 10));
      } catch (err) {
        console.error("Error resolving params promise:", err);
        setError("Failed to load application ID.");
      }
    }
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (applicationId === null) {
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getApplicationById(applicationId as number);
        if (!result.success || !result.data) {
          if (result.error === "Application not found") {
            setError("Application not found. It may have been deleted.");
            setApplication(null);
          } else {
            throw new Error(result.error || "Failed to fetch application data.");
          }
        } else {
          setApplication(result.data);
          if (result.data.eligibility) {
            // Map existing scores to new structure for backward compatibility
            // Calculate how to distribute the existing total score across new fields
            const existingTotal = result.data.eligibility.totalScore || 0;
            const eligScores = result.data.eligibility.evaluationScores;

            // Safety check - if no evaluation scores yet, use defaults
            if (!eligScores) {
              // No existing scores, keep default form state
              console.log("No existing evaluationScores found, using defaults.");
            } else {
              // First, map the old fields to their equivalent new fields
              const baseScores = {
                // Map old scores to closest matching new fields
                climateAdaptationBenefits: eligScores.climateAdaptationScore || 0,
                innovativeness: eligScores.innovationScore || 0,
                socioeconomicGenderImpact: eligScores.jobCreationScore || 0,
                entrepreneurshipManagement: eligScores.managementCapacityScore || 0,
                marketPotentialDemand: eligScores.marketPotentialScore || 0,
                financialManagement: eligScores.viabilityScore || 0,
                foodSecurityRelevance: eligScores.locationBonus || 0,
                genderInclusionManagement: eligScores.genderBonus || 0,
              };

              // Calculate the sum of mapped scores
              const mappedTotal = Object.values(baseScores).reduce((sum, score) => sum + score, 0);

              // Calculate remaining points to distribute
              let remainingPoints = existingTotal - mappedTotal;

              // Initialize new fields with smart defaults based on remaining points
              const newFieldDefaults: { [key: string]: number } = {
                scalabilityReplicability: 0,
                environmentalImpact: 0,
                timeFrameFeasibility: 0,
                gcaAlignment: 0,
                humanResourcesInfrastructure: 0,
                technicalExpertise: 0,
                experienceTrackRecord: 0,
                governanceManagement: 0,
                riskManagementStrategy: 0,
                partnershipsCollaborations: 0,
              };

              // Distribute remaining points intelligently across new fields
              if (remainingPoints > 0) {
                // Define max points for each new field
                const fieldMaxPoints: { [key: string]: number } = {
                  scalabilityReplicability: 5,
                  environmentalImpact: 5,
                  timeFrameFeasibility: 5,
                  gcaAlignment: 5,
                  humanResourcesInfrastructure: 2,
                  technicalExpertise: 2,
                  experienceTrackRecord: 2,
                  governanceManagement: 2,
                  riskManagementStrategy: 2,
                  partnershipsCollaborations: 2,
                };

                // Distribute points proportionally up to max for each field
                const totalMaxNewPoints = Object.values(fieldMaxPoints).reduce((sum, max) => sum + max, 0);

                for (const [field, maxPoints] of Object.entries(fieldMaxPoints)) {
                  if (remainingPoints <= 0) break;

                  // Calculate proportional share, but cap at field's max and remaining points
                  const proportionalPoints = Math.floor((remainingPoints * maxPoints) / totalMaxNewPoints);
                  const assignedPoints = Math.min(proportionalPoints, maxPoints, remainingPoints);

                  newFieldDefaults[field] = assignedPoints;
                  remainingPoints -= assignedPoints;
                }

                // If there are still remaining points, distribute them one by one
                while (remainingPoints > 0) {
                  let distributed = false;
                  for (const [field, maxPoints] of Object.entries(fieldMaxPoints)) {
                    if (newFieldDefaults[field] < maxPoints && remainingPoints > 0) {
                      newFieldDefaults[field]++;
                      remainingPoints--;
                      distributed = true;
                    }
                  }
                  if (!distributed) break; // Can't distribute more points
                }
              }

              // Set the form state with properly distributed scores
              setFormState({
                // Innovation and Climate Adaptation Focus
                climateAdaptationBenefits: baseScores.climateAdaptationBenefits,
                innovativeness: baseScores.innovativeness,
                scalabilityReplicability: newFieldDefaults.scalabilityReplicability,
                environmentalImpact: newFieldDefaults.environmentalImpact,
                socioeconomicGenderImpact: baseScores.socioeconomicGenderImpact,

                // Business Viability
                entrepreneurshipManagement: baseScores.entrepreneurshipManagement,
                marketPotentialDemand: baseScores.marketPotentialDemand,
                financialManagement: baseScores.financialManagement,
                timeFrameFeasibility: newFieldDefaults.timeFrameFeasibility,

                // Sectoral and Strategic Alignment
                foodSecurityRelevance: baseScores.foodSecurityRelevance,
                gcaAlignment: newFieldDefaults.gcaAlignment,

                // Organizational Capacity and Partnerships
                humanResourcesInfrastructure: newFieldDefaults.humanResourcesInfrastructure,
                technicalExpertise: newFieldDefaults.technicalExpertise,
                experienceTrackRecord: newFieldDefaults.experienceTrackRecord,
                governanceManagement: newFieldDefaults.governanceManagement,
                genderInclusionManagement: baseScores.genderInclusionManagement,
                riskManagementStrategy: newFieldDefaults.riskManagementStrategy,
                partnershipsCollaborations: newFieldDefaults.partnershipsCollaborations,

                // Notes
                evaluationNotes: result.data.eligibility.evaluationNotes || "",
              });
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error fetching application for evaluation:", err);
        setError(err.message || "An unexpected error occurred while fetching data.");
        setApplication(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [applicationId]);

  useEffect(() => {
    const score =
      formState.climateAdaptationBenefits +
      formState.innovativeness +
      formState.scalabilityReplicability +
      formState.environmentalImpact +
      formState.socioeconomicGenderImpact +
      formState.entrepreneurshipManagement +
      formState.marketPotentialDemand +
      formState.financialManagement +
      formState.timeFrameFeasibility +
      formState.foodSecurityRelevance +
      formState.gcaAlignment +
      formState.humanResourcesInfrastructure +
      formState.technicalExpertise +
      formState.experienceTrackRecord +
      formState.governanceManagement +
      formState.genderInclusionManagement +
      formState.riskManagementStrategy +
      formState.partnershipsCollaborations;
    setTotalScore(score);
  }, [formState]);

  const handleScoreChange = (criterionId: string, score: number) => {
    setFormState(prev => ({ ...prev, [criterionId]: score }));
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, evaluationNotes: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (applicationId === null) {
      toast.error("Application ID is missing, cannot save evaluation.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const result = await saveEvaluation({
          applicationId,
          ...formState,
          totalScore,
          isEligible: totalScore >= PASS_THRESHOLD,
          evaluationNotes: formState.evaluationNotes || undefined,
        });

        if (result.success) {
          toast.success(result.message || "Evaluation saved successfully.");
          router.push(`/admin/applications/${applicationId}`);
        } else {
          throw new Error(result.error || "Failed to save evaluation.");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error submitting evaluation:", err);
        setError(err.message || "An unexpected error occurred during submission.");
        toast.error(err.message || "Failed to save evaluation. Please try again.");
      }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading Application Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/admin/applications">Back to Applications</Link>
        </Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">Application data could not be loaded.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/applications">Back to Applications</Link>
        </Button>
      </div>
    );
  }

  const mandatoryEligible = application.eligibility?.mandatoryCriteria ? (
    application.eligibility.mandatoryCriteria.ageEligible &&
    application.eligibility.mandatoryCriteria.registrationEligible &&
    application.eligibility.mandatoryCriteria.revenueEligible &&
    application.eligibility.mandatoryCriteria.businessPlanEligible &&
    application.eligibility.mandatoryCriteria.impactEligible
  ) : false;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link
          href={`/admin/applications/${applicationId}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          ← Back to Application Detail
        </Link>
        <h1 className="text-3xl font-bold">Evaluate Application #{application.id}</h1>
        <p className="text-muted-foreground">
          {application.business.name} - {application.applicant.firstName} {application.applicant.lastName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Sections</CardTitle>
                <CardDescription>
                  Click on each section to score the criteria. Each section has specific weightings based on the BIRE Programme requirements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  {SCORING_SECTIONS.map((section, index) => {
                    const sectionIcons = [
                      <Lightbulb key="innovation" className="h-5 w-5 text-yellow-600" />,
                      <DollarSign key="viability" className="h-5 w-5 text-green-600" />,
                      <Target key="alignment" className="h-5 w-5 text-blue-600" />,
                      <Building2 key="capacity" className="h-5 w-5 text-purple-600" />
                    ];

                    return (
                      <SectionCard
                        key={section.id}
                        section={section}
                        scores={formState}
                        onOpenModal={() => setActiveModal(section.id)}
                        icon={sectionIcons[index]}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Scoring Modals */}
            {SCORING_SECTIONS.map((section) => (
              <ScoringModal
                key={section.id}
                section={section}
                isOpen={activeModal === section.id}
                onClose={() => setActiveModal(null)}
                scores={formState}
                onScoreChange={handleScoreChange}
                applicationData={application}
              />
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Evaluation Notes</CardTitle>
                <CardDescription>Provide justification for the scores and overall assessment.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="evaluationNotes"
                  placeholder="Enter evaluation notes here..."
                  value={formState.evaluationNotes}
                  onChange={handleNotesChange}
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Evaluation Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-4xl font-bold">{totalScore} / {TOTAL_MAX_SCORE}</p>
                  <div className={`p-3 rounded-md text-center font-medium text-sm ${totalScore >= PASS_THRESHOLD
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {totalScore >= PASS_THRESHOLD ? "PASS" : "FAIL"}
                    <span className="text-xs block mt-1">
                      (Minimum: {PASS_THRESHOLD} points)
                    </span>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Submission Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mandatory Criteria</CardTitle>
                <CardDescription>Based on initial automatic check.</CardDescription>
              </CardHeader>
              <CardContent>
                {application.eligibility?.mandatoryCriteria ? (
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center">
                      <span>Age (18-35)</span>
                      {application.eligibility.mandatoryCriteria.ageEligible
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Business Registration</span>
                      {application.eligibility.mandatoryCriteria.registrationEligible
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Revenue Generation (&gt; $0)</span>
                      {application.eligibility.mandatoryCriteria.revenueEligible
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Business Plan (Complete)</span>
                      {application.eligibility.mandatoryCriteria.businessPlanEligible
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Climate Impact Focus</span>
                      {application.eligibility.mandatoryCriteria.impactEligible
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : <XCircle className="h-5 w-5 text-red-600" />}
                    </li>
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">Eligibility criteria not available for this application type.</p>
                )}
                <div className={`mt-4 p-3 rounded-md text-center font-medium text-sm ${mandatoryEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Mandatory Criteria: {mandatoryEligible ? "PASSED" : "FAILED"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-8">
          <CardFooter className="flex justify-end gap-4 pt-6">
            <Button variant="outline" asChild>
              <Link href={`/admin/applications/${applicationId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Evaluation'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 