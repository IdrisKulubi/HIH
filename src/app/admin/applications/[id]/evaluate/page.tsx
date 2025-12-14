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
import { CheckCircle, XCircle, Loader2, TrendingUp, Users, Target, Leaf, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { ScoringModal } from "@/components/evaluation/ScoringModal";
import { SectionCard } from "@/components/evaluation/SectionCard";
import {
  getScoringSection,
  getDefaultScores,
  PASS_THRESHOLD,
  TOTAL_MAX_SCORE,
  EvaluationScores,
  ScoringSection
} from "@/types/evaluation";

export default function EvaluateApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [application, setApplication] = useState<DetailedApplication | null>(null);
  const [track, setTrack] = useState<'foundation' | 'acceleration'>('foundation');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [formState, setFormState] = useState<EvaluationScores>(getDefaultScores('foundation'));
  const [scoringSections, setScoringSections] = useState<ScoringSection[]>(getScoringSection('foundation'));

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
          const appData = result.data;
          setApplication(appData);

          // Determine track from application data
          const appTrack = appData.track === 'acceleration' ? 'acceleration' : 'foundation';
          setTrack(appTrack);
          setScoringSections(getScoringSection(appTrack));
          setFormState(getDefaultScores(appTrack));

          // Load existing scores if available
          if (appData.eligibility?.evaluationScores) {
            const existingScores = appData.eligibility.evaluationScores;
            setFormState(prev => ({
              ...prev,
              ...existingScores,
              evaluationNotes: appData.eligibility?.evaluationNotes || ''
            }));
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

  // Calculate total score whenever form state changes
  useEffect(() => {
    const scores = Object.entries(formState)
      .filter(([key]) => key !== 'evaluationNotes')
      .reduce((sum, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);
    setTotalScore(scores);
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

  // Section icons based on track
  const getSectionIcon = (sectionId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'commercial-viability': <TrendingUp className="h-5 w-5 text-green-600" />,
      'business-model': <Briefcase className="h-5 w-5 text-blue-600" />,
      'market-potential': <Target className="h-5 w-5 text-purple-600" />,
      'social-impact': <Users className="h-5 w-5 text-orange-600" />,
      'revenues-growth': <TrendingUp className="h-5 w-5 text-green-600" />,
      'impact-potential': <Users className="h-5 w-5 text-blue-600" />,
      'scalability': <Target className="h-5 w-5 text-purple-600" />,
      'social-environmental-impact': <Leaf className="h-5 w-5 text-emerald-600" />,
      'business-model-acc': <Briefcase className="h-5 w-5 text-orange-600" />,
    };
    return iconMap[sectionId] || <Briefcase className="h-5 w-5 text-gray-600" />;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link
          href={`/admin/applications/${applicationId}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          ← Back to Application Detail
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Evaluate Application #{application.id}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${track === 'acceleration'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
            {track} Track
          </span>
        </div>
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
                  Click on each section to score the criteria. Select the option that best matches the application.
                  Scores are automatically calculated based on your selections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  {scoringSections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      scores={formState}
                      onOpenModal={() => setActiveModal(section.id)}
                      icon={getSectionIcon(section.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scoring Modals */}
            {scoringSections.map((section) => (
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
                <CardTitle>Scoring Guide</CardTitle>
                <CardDescription>BIRE Programme criteria for {track} track</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {scoringSections.map((section) => (
                    <div key={section.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{section.name}</span>
                      <span className="font-medium">{section.maxPoints} pts</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>{TOTAL_MAX_SCORE} pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business</span>
                  <span className="font-medium">{application.business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Track</span>
                  <span className="font-medium capitalize">{track}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector</span>
                  <span className="font-medium">{application.business.sector || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">County</span>
                  <span className="font-medium">{application.business.county || 'N/A'}</span>
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