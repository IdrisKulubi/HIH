"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { getApplicationById } from "@/lib/actions";
import { downloadEnhancedApplicationDOCX } from "@/lib/actions/enhanced-export";
import { updateApplicationStatus } from "@/lib/actions/application-status";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Warning,
  FileText,
  DownloadSimple,
  ArrowSquareOut,
  Spinner,
} from "@phosphor-icons/react";
import { TwoTierReviewPanel } from "@/components/admin/TwoTierReviewPanel";

export default function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [application, setApplication] = useState<{
    id: number;
    status:
    | "submitted"
    | "under_review"
    | "pending_senior_review"
    | "approved"
    | "rejected"
    | "draft"
    | "shortlisted"
    | "scoring_phase"
    | "dragons_den"
    | "finalist";
    submittedAt: string | null;
    business: {
      name: string;
      city: string;
      country: string;
      description: string;
      problemSolved: string;
      startDate: string;
      isRegistered: boolean;
      registrationCertificateUrl?: string;
      registeredCountries: string;
      revenueLastTwoYears?: number;
      targetCustomers: string[];
      unitPrice?: number;
      customerCountLastSixMonths?: number;
      productionCapacityLastSixMonths?: string;
      employees: {
        fullTimeTotal: number;
        fullTimeMale: number;
        fullTimeFemale: number;
        partTimeMale: number;
        partTimeFemale: number;
        fullTimeYouth: number;
        fullTimePwd: number;
      };
      currentChallenges?: string;
      supportNeeded?: string;
      additionalInformation?: string;
      climateAdaptationContribution?: string;
      productServiceDescription?: string;
      climateExtremeImpact?: string;
      growthHistory?: string;
      futureSalesGrowth?: string;
      futureSalesGrowthReason?: string;
      businessModelUniquenessDescription?: string;
      competitiveAdvantageBarriers?: string;
      externalFundingDetails?: string;
      funding?: Array<{
        id: number;
        hasExternalFunding: boolean;
        fundingSource?: string;
        fundingSourceOther?: string;
        funderName?: string;
        fundingDate?: string;
        amountUsd?: number;
        fundingInstrument?: string;
        fundingInstrumentOther?: string;
      }>;
    };
    applicant: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      gender: string;
      dateOfBirth: string;
      citizenship: string;
      countryOfResidence: string;
      highestEducation: string;
    };
    eligibility?: {
      isEligible: boolean;
      totalScore: number;
      evaluatedAt?: string;
      mandatoryCriteria: {
        ageEligible: boolean;
        registrationEligible: boolean;
        revenueEligible: boolean;
        businessPlanEligible: boolean;
        impactEligible: boolean;
      };
      evaluationScores: {
        innovationScore: number;
        climateAdaptationScore: number;
        viabilityScore: number;
        marketPotentialScore: number;
        managementCapacityScore: number;
        jobCreationScore: number;
        locationBonus: number;
        genderBonus: number;
      };
      evaluationNotes?: string;
      evaluator?: {
        name?: string;
        profile?: {
          firstName: string;
          lastName: string;
          role?: string;
        };
      };
    } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const initializeParams = async () => {
      try {
        const awaitedParams = await params;
        const id = parseInt(awaitedParams.id, 10);
        setApplicationId(id);
      } catch (err) {
        console.error(err);
        setError("Invalid application ID");
        setLoading(false);
      }
    };

    initializeParams();
  }, [params]);

  useEffect(() => {
    if (applicationId) {
      const fetchApplication = async () => {
        try {
          setLoading(true);
          const result = await getApplicationById(applicationId);

          if (!result.success || !result.data) {
            if (result.error === "Application not found") {
              router.push("/404");
            } else {
              setError(result.error || "An unexpected error occurred.");
            }
          } else {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            setApplication(result.data as any);
          }
        } catch (err) {
          console.error(err);
          setError("Failed to fetch application");
        } finally {
          setLoading(false);
        }
      };

      fetchApplication();
    }
  }, [applicationId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center h-[50vh]">
          <Spinner className="animate-spin text-blue-600 mb-4 h-8 w-8" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Application...
          </h1>
          <p className="text-gray-500">
            Please wait while we fetch the application details.
          </p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center h-[50vh]">
          <div className="bg-red-50 rounded-full p-4 mb-4">
            <Warning className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Error Fetching Application
          </h1>
          <p className="text-gray-500 mb-6">
            {error || "An unexpected error occurred."}
          </p>
          <Button
            asChild
            variant="outline"
          >
            <Link href="/admin/applications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formattedSubmittedAt = application.submittedAt
    ? new Date(application.submittedAt).toLocaleString()
    : "Not Submitted";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "under_review":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleDownloadApplication = async () => {
    if (!applicationId) return;

    try {
      const result = await downloadEnhancedApplicationDOCX(applicationId);
      if (result.success && result.data) {
        // Create download link from blob
        const url = URL.createObjectURL(result.data.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error("Failed to download application:", result.error);
        toast.error("Failed to download application. Please try again.");
      }
    } catch (error) {
      console.error("Error downloading application:", error);
      toast.error("Failed to download application. Please try again.");
    }
  };

  const handleApproveApplication = async () => {
    if (!applicationId || updating) return;

    setUpdating(true);
    try {
      const result = await updateApplicationStatus(
        applicationId,
        "approved",
        "Application approved by admin"
      );
      if (result.success) {
        // Update local state immediately
        setApplication((prev) =>
          prev
            ? {
              ...prev,
              status: "approved",
            }
            : null
        );
        // Small delay to allow UI to update
        setTimeout(() => {
          toast.success("Application approved successfully!");
        }, 100);
      } else {
        console.error("Failed to approve application:", result.error);
        toast.error(`Failed to approve application: ${result.error}`);
      }
    } catch (error) {
      console.error("Error approving application:", error);
      toast.error("Failed to approve application. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!applicationId || updating) return;

    setUpdating(true);
    try {
      const result = await updateApplicationStatus(
        applicationId,
        "rejected",
        "Application rejected by admin"
      );
      if (result.success) {
        // Update local state immediately
        setApplication((prev) =>
          prev
            ? {
              ...prev,
              status: "rejected",
            }
            : null
        );
        // Small delay to allow UI to update
        setTimeout(() => {
          toast.success("Application rejected successfully!");
        }, 100);
      } else {
        console.error("Failed to reject application:", result.error);
        toast.error(`Failed to reject application: ${result.error}`);
      }
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast.error("Failed to reject application. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Compute per-section totals using the same reconstruction logic used on the re-evaluation page
  const computeSectionTotals = () => {
    const elig = application?.eligibility;
    if (!elig) {
      return { innovation: 0, viability: 0, alignment: 0, org: 0 };
    }

    const s = elig.evaluationScores;

    // Base mapping (legacy -> new fields)
    const base = {
      // Innovation & Climate
      climateAdaptationBenefits: s.climateAdaptationScore || 0,
      innovativeness: s.innovationScore || 0,
      socioeconomicGenderImpact: s.jobCreationScore || 0,
      // Viability
      entrepreneurshipManagement: s.managementCapacityScore || 0,
      marketPotentialDemand: s.marketPotentialScore || 0,
      financialManagement: s.viabilityScore || 0,
      // Alignment
      foodSecurityRelevance: s.locationBonus || 0,
      // Org capacity
      genderInclusionManagement: s.genderBonus || 0,
    };

    const mappedTotal =
      base.climateAdaptationBenefits +
      base.innovativeness +
      base.socioeconomicGenderImpact +
      base.entrepreneurshipManagement +
      base.marketPotentialDemand +
      base.financialManagement +
      base.foodSecurityRelevance +
      base.genderInclusionManagement;

    let remaining = (elig.totalScore || 0) - mappedTotal;

    const fieldMax: Record<string, number> = {
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

    const distributed: Record<string, number> = Object.fromEntries(
      Object.keys(fieldMax).map((k) => [k, 0])
    );

    const totalMax = Object.values(fieldMax).reduce((a, b) => a + b, 0);

    // Proportional distribution
    for (const [key, max] of Object.entries(fieldMax)) {
      if (remaining <= 0) break;
      const proportional = Math.floor((remaining * max) / totalMax);
      const assign = Math.min(proportional, max, remaining);
      distributed[key] = assign;
      remaining -= assign;
    }

    // Distribute any remainder round-robin
    while (remaining > 0) {
      let progress = false;
      for (const [key, max] of Object.entries(fieldMax)) {
        if (distributed[key] < max && remaining > 0) {
          distributed[key] += 1;
          remaining -= 1;
          progress = true;
        }
      }
      if (!progress) break;
    }

    const innovation =
      base.climateAdaptationBenefits +
      base.innovativeness +
      base.socioeconomicGenderImpact +
      distributed.scalabilityReplicability +
      distributed.environmentalImpact;

    const viability =
      base.entrepreneurshipManagement +
      base.marketPotentialDemand +
      base.financialManagement +
      distributed.timeFrameFeasibility;

    const alignment = base.foodSecurityRelevance + distributed.gcaAlignment;

    const org =
      base.genderInclusionManagement +
      distributed.humanResourcesInfrastructure +
      distributed.technicalExpertise +
      distributed.experienceTrackRecord +
      distributed.governanceManagement +
      distributed.riskManagementStrategy +
      distributed.partnershipsCollaborations;

    return { innovation, viability, alignment, org };
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      <div className="container mx-auto py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/admin/applications"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Applications
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  Application #{application.id}
                </h1>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(application.status)} font-medium px-2.5 py-0.5 rounded-full text-xs`}
                >
                  {application.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-gray-500 text-lg mt-1 font-medium">
                {application.business.name} • {application.applicant.firstName}{" "}
                {application.applicant.lastName}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Submitted on {formattedSubmittedAt}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
              onClick={handleDownloadApplication}
              disabled={updating}
            >
              <DownloadSimple className="h-4 w-4 mr-2" />
              Download
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm"
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {updating ? "Processing..." : "Reject"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Are you sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reject the application and notify the applicant.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updating}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleRejectApplication}
                    disabled={updating}
                  >
                    {updating ? "Rejecting..." : "Reject Application"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-0"
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updating ? "Processing..." : "Approve"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Confirm Approval
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will approve the application and notify the applicant.
                    Proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updating}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleApproveApplication}
                    disabled={updating}
                  >
                    {updating ? "Approving..." : "Approve Application"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="summary" className="w-full">
              <div className="border-b border-gray-200 mb-6">
                <TabsList className="h-auto w-full justify-start bg-transparent p-0 gap-6 overflow-x-auto">
                  {["summary", "personal", "business", "adaptation", "financial", "documents"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 data-[state=active]:shadow-none transition-all"
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="summary" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Application Summary</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Overview of the application
                    </p>
                  </div>
                  <div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">
                            Business Name
                          </h3>
                          <p className="font-medium text-gray-900">{application.business.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                          <p className="font-medium text-gray-900">
                            {application.business.city},{" "}
                            {application.business.country?.toUpperCase() ??
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">
                            Applicant
                          </h3>
                          <p className="font-medium text-gray-900">
                            {application.applicant.firstName}{" "}
                            {application.applicant.lastName}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Contact</h3>
                          <p className="font-medium text-gray-900">{application.applicant.email}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">
                            Submitted
                          </h3>
                          <p className="font-medium text-gray-900">{formattedSubmittedAt}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                          <p className="font-medium text-gray-900 capitalize">
                            {application.status.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Business Description
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.description ||
                            "No description provided."}
                        </p>
                      </div>
                      <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Problem Solved
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.problemSolved ||
                            "Not specified."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Personal Information</h2>
                  </div>
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">First Name</h3>
                        <p className="font-medium text-gray-900">{application.applicant.firstName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Last Name</h3>
                        <p className="font-medium text-gray-900">{application.applicant.lastName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                        <p className="font-medium text-gray-900">{application.applicant.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
                        <p className="font-medium text-gray-900">{application.applicant.phoneNumber}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Gender</h3>
                        <p className="font-medium text-gray-900 capitalize">
                          {application.applicant.gender}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h3>
                        <p className="font-medium text-gray-900">{application.applicant.dateOfBirth}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Citizenship</h3>
                        <p className="font-medium text-gray-900 capitalize">
                          {application.applicant.citizenship}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Country of Residence
                        </h3>
                        <p className="font-medium text-gray-900 capitalize">
                          {application.applicant.countryOfResidence}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Highest Education
                        </h3>
                        <p className="font-medium text-gray-900 capitalize">
                          {application.applicant.highestEducation.replace(
                            /_/g,
                            " "
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="business" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Business Information</h2>
                  </div>
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Business Name
                        </h3>
                        <p className="font-medium text-gray-900">{application.business.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Start Date
                        </h3>
                        <p className="font-medium text-gray-900">{application.business.startDate}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Registered?
                        </h3>
                        <p className="font-medium text-gray-900">
                          {application.business.isRegistered ? "Yes" : "No"}
                        </p>
                      </div>
                      {application.business.isRegistered &&
                        application.business.registrationCertificateUrl && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">
                              Registration Certificate
                            </h3>
                            <Link
                              href={
                                application.business.registrationCertificateUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              View Certificate
                            </Link>
                          </div>
                        )}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Country of Operation
                        </h3>
                        <p className="font-medium text-gray-900 capitalize">
                          {application.business.country}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">City</h3>
                        <p className="font-medium text-gray-900">{application.business.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Registered Countries (Other)
                        </h3>
                        <p className="font-medium text-gray-900">{application.business.registeredCountries}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Revenue (Last 2 Years)
                        </h3>
                        <p className="font-medium text-gray-900">
                          $
                          {application.business.revenueLastTwoYears?.toLocaleString() ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Target Customers
                        </h3>
                        <p className="font-medium text-gray-900">
                          {application.business.targetCustomers
                            .join(", ")
                            .replace(/_/g, " ") || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Unit Price</h3>
                        <p className="font-medium text-gray-900">
                          $
                          {application.business.unitPrice?.toLocaleString() ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Customers (Last 6 Mo)
                        </h3>
                        <p className="font-medium text-gray-900">
                          {application.business.customerCountLastSixMonths ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Production Capacity (Last 6 Mo)
                        </h3>
                        <p className="font-medium text-gray-900">
                          {application.business
                            .productionCapacityLastSixMonths || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Employees</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Total Full-Time</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.fullTimeTotal}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Full-Time Male</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.fullTimeMale}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Full-Time Female</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.fullTimeFemale}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Full-Time Youth</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.fullTimeYouth}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Full-Time PWD</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.fullTimePwd}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Part-Time Male</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.partTimeMale}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Part-Time Female</h4>
                          <p className="font-medium text-gray-900">{application.business.employees.partTimeFemale}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        Challenges & Support Needed
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">
                            Current Challenges
                          </h4>
                          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {application.business.currentChallenges || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">
                            Support Needed
                          </h4>
                          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {application.business.supportNeeded || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {application.business.additionalInformation && (
                      <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          Additional Information
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.additionalInformation}
                        </p>
                      </div>
                    )}
                    {/* New Detailed Fields from Updated Schema */}
                    {application.business.growthHistory && (
                      <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">History & Growth</h3>
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Growth History</h4>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{application.business.growthHistory}</p>
                          </div>
                          {application.business.futureSalesGrowth && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Future Sales Growth</h4>
                              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {application.business.futureSalesGrowth.toUpperCase()} - {application.business.futureSalesGrowthReason || ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {application.business.businessModelUniquenessDescription && (
                      <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Strategy & Differentiation</h3>
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Uniqueness</h4>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{application.business.businessModelUniquenessDescription}</p>
                          </div>
                          {application.business.competitiveAdvantageBarriers && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Barriers to Entry</h4>
                              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{application.business.competitiveAdvantageBarriers}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {application.business.externalFundingDetails && (
                      <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">External Funding Details</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{application.business.externalFundingDetails}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="adaptation" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Climate Adaptation Solution</h2>
                  </div>
                  <div>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Contribution to Climate Adaptation
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.climateAdaptationContribution ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Product/Service Description
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.productServiceDescription ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Impact of Climate Extremes
                        </h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {application.business.climateExtremeImpact || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Financial Information</h2>
                  </div>
                  <div>
                    {application.business.funding &&
                      application.business.funding.length > 0 ? (
                      <div className="space-y-8">
                        {application.business.funding.map(
                          (fund, index: number) => (
                            <div
                              key={fund.id}
                              className={index > 0 ? "border-t border-gray-100 pt-8" : ""}
                            >
                              <h3 className="text-base font-semibold text-gray-900 mb-4">
                                Funding Record {index + 1}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                                    Has External Funding?
                                  </h4>
                                  <p className="font-medium text-gray-900">
                                    {fund.hasExternalFunding ? "Yes" : "No"}
                                  </p>
                                </div>
                                {fund.hasExternalFunding && (
                                  <>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                                        Funding Source
                                      </h4>
                                      <p className="font-medium text-gray-900 capitalize">
                                        {fund.fundingSource === "other"
                                          ? fund.fundingSourceOther
                                          : fund.fundingSource?.replace(
                                            /_/g,
                                            " "
                                          )}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                                        Funder Name
                                      </h4>
                                      <p className="font-medium text-gray-900">{fund.funderName || "N/A"}</p>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                                        Funding Date
                                      </h4>
                                      <p className="font-medium text-gray-900">
                                        {fund.fundingDate
                                          ? new Date(
                                            fund.fundingDate
                                          ).toLocaleDateString()
                                          : "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                                        Amount (USD)
                                      </h4>
                                      <p className="font-medium text-gray-900">
                                        $
                                        {fund.amountUsd?.toLocaleString() ??
                                          "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-500 mb-1">
                                        Instrument
                                      </h4>
                                      <p className="font-medium text-gray-900 capitalize">
                                        {fund.fundingInstrument === "other"
                                          ? fund.fundingInstrumentOther
                                          : fund.fundingInstrument}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No external funding information provided.
                      </p>
                    )}
                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Revenue (Last 2 Years)
                      </h3>
                      <p className="font-medium text-gray-900 text-lg">
                        $
                        {application.business.revenueLastTwoYears?.toLocaleString() ??
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Documents & Attachments</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      All uploaded documents and supporting materials
                    </p>
                  </div>
                  <div>
                    <div className="space-y-4">
                      {/* Define all possible document types */}
                      {(() => {
                        const documents = [
                          {
                            url: application.business.registrationCertificateUrl,
                            name: "Registration Certificate",
                            type: "Legal Document",
                            icon: "📄",
                            color: "emerald"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).businessOverviewUrl,
                            name: "Business Overview",
                            type: "Business Document",
                            icon: "📊",
                            color: "blue"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).cr12Url,
                            name: "CR12 Certificate",
                            type: "Legal Document",
                            icon: "📋",
                            color: "purple"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).auditedAccountsUrl,
                            name: "Audited Accounts",
                            type: "Financial Document",
                            icon: "💰",
                            color: "yellow"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).taxComplianceUrl,
                            name: "Tax Compliance Certificate",
                            type: "Compliance Document",
                            icon: "🏛️",
                            color: "indigo"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).businessPlanUrl,
                            name: "Business Plan",
                            type: "Strategic Document",
                            icon: "📈",
                            color: "pink"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).financialStatementsUrl,
                            name: "Financial Statements",
                            type: "Financial Document",
                            icon: "💵",
                            color: "green"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).pitchDeckUrl,
                            name: "Pitch Deck",
                            type: "Presentation",
                            icon: "🎯",
                            color: "orange"
                          },
                          {
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            url: (application.business as any).additionalDocumentsUrl,
                            name: "Additional Documents",
                            type: "Supporting Documents",
                            icon: "📁",
                            color: "gray"
                          }
                        ];

                        const uploadedDocs = documents.filter(doc => doc.url);
                        const hasDocuments = uploadedDocs.length > 0;

                        if (!hasDocuments) {
                          return (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
                              <FileText className="mx-auto h-12 w-12 text-gray-300" />
                              <h3 className="mt-4 text-sm font-medium text-gray-900">
                                No Documents Uploaded
                              </h3>
                              <p className="mt-2 text-xs text-gray-500 max-w-sm mx-auto">
                                The applicant has not uploaded any supporting documents for this application.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="mb-4 px-4 py-3 bg-blue-50 rounded-lg flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-blue-600" weight="fill" />
                              <p className="text-sm font-medium text-blue-900">
                                {uploadedDocs.length} document{uploadedDocs.length !== 1 ? 's' : ''} uploaded successfully
                              </p>
                            </div>
                            <div className="grid gap-3">
                              {uploadedDocs.map((doc, index) => {
                                const colorStyles = {
                                  emerald: "bg-emerald-50 border-emerald-100",
                                  blue: "bg-blue-50 border-blue-100",
                                  purple: "bg-purple-50 border-purple-100",
                                  yellow: "bg-amber-50 border-amber-100",
                                  indigo: "bg-indigo-50 border-indigo-100",
                                  pink: "bg-pink-50 border-pink-100",
                                  green: "bg-green-50 border-green-100",
                                  orange: "bg-orange-50 border-orange-100",
                                  gray: "bg-gray-50 border-gray-100"
                                };

                                const iconBgColors = {
                                  emerald: "bg-emerald-100 text-emerald-600",
                                  blue: "bg-blue-100 text-blue-600",
                                  purple: "bg-purple-100 text-purple-600",
                                  yellow: "bg-amber-100 text-amber-600",
                                  indigo: "bg-indigo-100 text-indigo-600",
                                  pink: "bg-pink-100 text-pink-600",
                                  green: "bg-green-100 text-green-600",
                                  orange: "bg-orange-100 text-orange-600",
                                  gray: "bg-gray-100 text-gray-600"
                                };

                                return (
                                  <div
                                    key={index}
                                    className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-200 hover:shadow-sm bg-white`}
                                  >
                                    <div className="flex items-center space-x-4">
                                      <div className={`h-10 w-10 flex items-center justify-center rounded-lg ${iconBgColors[doc.color as keyof typeof iconBgColors]} text-lg`}>
                                        {doc.icon}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                          {doc.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {doc.type}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(doc.url, "_blank")}
                                        className="h-8 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 text-xs font-medium"
                                      >
                                        <ArrowSquareOut className="h-3.5 w-3.5 mr-1.5" />
                                        View
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = doc.url!;
                                          link.download = doc.name.replace(/ /g, '_');
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <DownloadSimple className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Summary Section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Document Checklist</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                                {documents.map((doc, idx) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    {doc.url ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border-2 border-gray-200" />
                                    )}
                                    <span className={`text-xs ${doc.url ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                                      {doc.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {/* Two-Tier Review Panel */}
            <TwoTierReviewPanel
              applicationId={application.id}
              currentStatus={application.status}
              isAdmin={true}
            />

            <div className="relative overflow-hidden rounded-[24px] border border-white/50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="mb-8">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Eligibility Assessment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {application.eligibility
                    ? `Last evaluated: ${application.eligibility.evaluatedAt ? new Date(application.eligibility.evaluatedAt).toLocaleString() : "N/A"}`
                    : "Not evaluated yet"}
                </p>
              </div>
              {application.eligibility ? (
                <div>
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Overall Result</h3>
                        <Badge
                          className={
                            application.eligibility.isEligible
                              ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                          }
                        >
                          {application.eligibility.isEligible
                            ? "ELIGIBLE"
                            : "INELIGIBLE"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-gray-700">Total Score</h3>
                        <span className="text-xl font-bold text-gray-900">
                          {application.eligibility.totalScore}<span className="text-sm text-gray-400 font-normal">/100</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        Mandatory Criteria
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700">Age (18-35)</span>
                          {application.eligibility.mandatoryCriteria.ageEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                          )}
                        </li>
                        <li className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700">Business Registration</span>
                          {application.eligibility.mandatoryCriteria.registrationEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                          )}
                        </li>
                        <li className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700">Revenue Generation</span>
                          {application.eligibility.mandatoryCriteria.revenueEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                          )}
                        </li>
                        <li className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700">Business Plan</span>
                          {application.eligibility.mandatoryCriteria.businessPlanEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                          )}
                        </li>
                        <li className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700">Climate Impact</span>
                          {application.eligibility.mandatoryCriteria.impactEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                          )}
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        Evaluation Scores
                      </h3>
                      {(() => {
                        const totals = computeSectionTotals();
                        return (
                          <ul className="space-y-3">
                            <li className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Innovation & Adaptation</span>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-0">{totals.innovation}/35</Badge>
                            </li>
                            <li className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Business Viability</span>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-0">{totals.viability}/31</Badge>
                            </li>
                            <li className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Strategic Alignment</span>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-0">{totals.alignment}/20</Badge>
                            </li>
                            <li className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Org Capacity</span>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-0">{totals.org}/14</Badge>
                            </li>
                          </ul>
                        );
                      })()}
                    </div>
                    {application.eligibility.evaluationNotes && (
                      <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Evaluation Notes
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                          {application.eligibility.evaluationNotes}
                        </p>
                      </div>
                    )}

                    {application.eligibility.evaluator && (
                      <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Reviewed By
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium text-gray-900">Reviewer:</span>{" "}
                            {application.eligibility.evaluator.profile
                              ? `${application.eligibility.evaluator.profile.firstName} ${application.eligibility.evaluator.profile.lastName}`
                              : application.eligibility.evaluator.name ||
                              "Unknown Reviewer"}
                          </p>
                          {application.eligibility.evaluator.profile?.role && (
                            <p>
                              <span className="font-medium text-gray-900">Role:</span>{" "}
                              {application.eligibility.evaluator.profile.role
                                .replace(/_/g, " ")
                                .toUpperCase()}
                            </p>
                          )}
                          {application.eligibility.evaluatedAt && (
                            <p>
                              <span className="font-medium text-gray-900">Date:</span>{" "}
                              {new Date(
                                application.eligibility.evaluatedAt
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  <p className="text-gray-500 text-sm text-center italic">
                    This application has not been evaluated yet.
                  </p>
                </div>
              )}
              <div className="bg-gray-50/50 border-t border-gray-100 p-6 rounded-b-[24px]">
                <Button className="w-full bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm" variant="outline" asChild>
                  <Link href={`/admin/applications/${application.id}/evaluate`}>
                    {application.eligibility
                      ? "Re-evaluate Application"
                      : "Evaluate Application"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
