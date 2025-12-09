"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { downloadApplicationDOCX } from "@/lib/actions/export";
import { updateApplicationStatus } from "@/lib/actions/application-status";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
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
      };
      currentChallenges?: string;
      supportNeeded?: string;
      additionalInformation?: string;
      climateAdaptationContribution?: string;
      productServiceDescription?: string;
      climateExtremeImpact?: string;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">
            Loading Application...
          </h1>
          <p className="text-gray-600">
            Please wait while we fetch the application details.
          </p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 text-center">
          <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Error Fetching Application
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "An unexpected error occurred."}
          </p>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300";
      case "under_review":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300";
      case "approved":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300";
      case "rejected":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300";
    }
  };

  const handleDownloadApplication = async () => {
    if (!applicationId) return;

    try {
      const result = await downloadApplicationDOCX(applicationId);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Link
              href="/admin/applications"
              className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Applications
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Application #{application.id}
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                {application.business.name} - {application.applicant.firstName}{" "}
                {application.applicant.lastName}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Badge
                  className={`${getStatusColor(application.status)} font-medium px-3 py-1`}
                >
                  {application.status.replace("_", " ").toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  Submitted: {formattedSubmittedAt}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className=" text-blue-600 hover:bg-blue-400 hover:border-blue-300"
              onClick={handleDownloadApplication}
              disabled={updating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Application
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
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
                    className="bg-red-600 hover:bg-red-700"
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
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updating ? "Processing..." : "Approve"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
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
                    className="bg-green-600 hover:bg-green-700"
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
            <Tabs defaultValue="summary">
              <TabsList className="w-full">
                <TabsTrigger value="summary" className="flex-1">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="personal" className="flex-1">
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="business" className="flex-1">
                  Business
                </TabsTrigger>
                <TabsTrigger value="adaptation" className="flex-1">
                  Climate Adaptation
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex-1">
                  Financial
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Summary</CardTitle>
                    <CardDescription>
                      Overview of the application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium mb-1">
                            Business Name
                          </h3>
                          <p>{application.business.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">Location</h3>
                          <p>
                            {application.business.city},{" "}
                            {application.business.country?.toUpperCase() ??
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">
                            Applicant
                          </h3>
                          <p>
                            {application.applicant.firstName}{" "}
                            {application.applicant.lastName}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">Contact</h3>
                          <p>{application.applicant.email}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">
                            Submitted
                          </h3>
                          <p>{formattedSubmittedAt}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium mb-1">Status</h3>
                          <p className="capitalize">
                            {application.status.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Business Description
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {application.business.description ||
                            "No description provided."}
                        </p>
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Problem Solved
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {application.business.problemSolved ||
                            "Not specified."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="personal" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium">First Name</h3>
                        <p>{application.applicant.firstName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Last Name</h3>
                        <p>{application.applicant.lastName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Email</h3>
                        <p>{application.applicant.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Phone</h3>
                        <p>{application.applicant.phoneNumber}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Gender</h3>
                        <p className="capitalize">
                          {application.applicant.gender}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Date of Birth</h3>
                        <p>{application.applicant.dateOfBirth}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Citizenship</h3>
                        <p className="capitalize">
                          {application.applicant.citizenship}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Country of Residence
                        </h3>
                        <p className="capitalize">
                          {application.applicant.countryOfResidence}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Highest Education
                        </h3>
                        <p className="capitalize">
                          {application.applicant.highestEducation.replace(
                            /_/g,
                            " "
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm text-black font-medium">
                          Business Name
                        </h3>
                        <p>{application.business.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-black font-medium">
                          Start Date
                        </h3>
                        <p>{application.business.startDate}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-black font-medium">
                          Registered?
                        </h3>
                        <p>
                          {application.business.isRegistered ? "Yes" : "No"}
                        </p>
                      </div>
                      {application.business.isRegistered &&
                        application.business.registrationCertificateUrl && (
                          <div>
                            <h3 className="text-sm font-medium">
                              Registration Certificate
                            </h3>
                            <Link
                              href={
                                application.business.registrationCertificateUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Certificate
                            </Link>
                          </div>
                        )}
                      <div>
                        <h3 className="text-sm font-medium">
                          Country of Operation
                        </h3>
                        <p className="capitalize">
                          {application.business.country}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">City</h3>
                        <p>{application.business.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Registered Countries (Other)
                        </h3>
                        <p>{application.business.registeredCountries}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Revenue (Last 2 Years)
                        </h3>
                        <p>
                          $
                          {application.business.revenueLastTwoYears?.toLocaleString() ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Target Customers
                        </h3>
                        <p>
                          {application.business.targetCustomers
                            .join(", ")
                            .replace(/_/g, " ") || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Unit Price</h3>
                        <p>
                          $
                          {application.business.unitPrice?.toLocaleString() ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Customers (Last 6 Mo)
                        </h3>
                        <p>
                          {application.business.customerCountLastSixMonths ??
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Production Capacity (Last 6 Mo)
                        </h3>
                        <p>
                          {application.business
                            .productionCapacityLastSixMonths || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-semibold mb-2">Employees</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium">Total Full-Time</h4>
                          <p>{application.business.employees.fullTimeTotal}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Full-Time Male</h4>
                          <p>{application.business.employees.fullTimeMale}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Full-Time Female</h4>
                          <p>{application.business.employees.fullTimeFemale}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Part-Time Male</h4>
                          <p>{application.business.employees.partTimeMale}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Part-Time Female</h4>
                          <p>{application.business.employees.partTimeFemale}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Challenges & Support Needed
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm">
                            Current Challenges
                          </h4>
                          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                            {application.business.currentChallenges || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">
                            Support Needed
                          </h4>
                          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                            {application.business.supportNeeded || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {application.business.additionalInformation && (
                      <div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-2">
                          Additional Information
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                          {application.business.additionalInformation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="adaptation" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Climate Adaptation Solution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">
                          Contribution to Climate Adaptation
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {application.business.climateAdaptationContribution ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Product/Service Description
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {application.business.productServiceDescription ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          Impact of Climate Extremes
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {application.business.climateExtremeImpact || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {application.business.funding &&
                      application.business.funding.length > 0 ? (
                      <div className="space-y-6">
                        {application.business.funding.map(
                          (fund, index: number) => (
                            <div
                              key={fund.id}
                              className={index > 0 ? "border-t pt-6" : ""}
                            >
                              <h3 className="font-semibold mb-2">
                                Funding Record {index + 1}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-medium">
                                    Has External Funding?
                                  </h4>
                                  <p>
                                    {fund.hasExternalFunding ? "Yes" : "No"}
                                  </p>
                                </div>
                                {fund.hasExternalFunding && (
                                  <>
                                    <div>
                                      <h4 className="font-medium">
                                        Funding Source
                                      </h4>
                                      <p className="capitalize">
                                        {fund.fundingSource === "other"
                                          ? fund.fundingSourceOther
                                          : fund.fundingSource?.replace(
                                            /_/g,
                                            " "
                                          )}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        Funder Name
                                      </h4>
                                      <p>{fund.funderName || "N/A"}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        Funding Date
                                      </h4>
                                      <p>
                                        {fund.fundingDate
                                          ? new Date(
                                            fund.fundingDate
                                          ).toLocaleDateString()
                                          : "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        Amount (USD)
                                      </h4>
                                      <p>
                                        $
                                        {fund.amountUsd?.toLocaleString() ??
                                          "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        Instrument
                                      </h4>
                                      <p className="capitalize">
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
                      <p className="text-muted-foreground">
                        No external funding information provided.
                      </p>
                    )}
                    <div className="mt-6 border-t pt-6">
                      <h3 className="font-semibold mb-2">
                        Revenue (Last 2 Years)
                      </h3>
                      <p>
                        $
                        {application.business.revenueLastTwoYears?.toLocaleString() ??
                          "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents & Attachments</CardTitle>
                    <CardDescription>
                      All uploaded documents and supporting materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                              <FileText className="mx-auto h-16 w-16 text-gray-300" />
                              <h3 className="mt-4 text-lg font-medium text-gray-900">
                                No Documents Uploaded
                              </h3>
                              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                                The applicant has not uploaded any supporting documents for this application.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <span className="font-semibold">{uploadedDocs.length}</span> document{uploadedDocs.length !== 1 ? 's' : ''} uploaded
                              </p>
                            </div>
                            <div className="grid gap-3">
                              {uploadedDocs.map((doc, index) => {
                                const colorStyles = {
                                  emerald: "from-emerald-50 to-green-50 border-emerald-200 hover:border-emerald-300",
                                  blue: "from-blue-50 to-sky-50 border-blue-200 hover:border-blue-300",
                                  purple: "from-purple-50 to-violet-50 border-purple-200 hover:border-purple-300",
                                  yellow: "from-yellow-50 to-amber-50 border-yellow-200 hover:border-yellow-300",
                                  indigo: "from-indigo-50 to-blue-50 border-indigo-200 hover:border-indigo-300",
                                  pink: "from-pink-50 to-rose-50 border-pink-200 hover:border-pink-300",
                                  green: "from-green-50 to-emerald-50 border-green-200 hover:border-green-300",
                                  orange: "from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300",
                                  gray: "from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300"
                                };

                                const iconBgColors = {
                                  emerald: "bg-emerald-100",
                                  blue: "bg-blue-100",
                                  purple: "bg-purple-100",
                                  yellow: "bg-yellow-100",
                                  indigo: "bg-indigo-100",
                                  pink: "bg-pink-100",
                                  green: "bg-green-100",
                                  orange: "bg-orange-100",
                                  gray: "bg-gray-100"
                                };

                                const textColors = {
                                  emerald: "text-emerald-900",
                                  blue: "text-blue-900",
                                  purple: "text-purple-900",
                                  yellow: "text-yellow-900",
                                  indigo: "text-indigo-900",
                                  pink: "text-pink-900",
                                  green: "text-green-900",
                                  orange: "text-orange-900",
                                  gray: "text-gray-900"
                                };

                                const subTextColors = {
                                  emerald: "text-emerald-600",
                                  blue: "text-blue-600",
                                  purple: "text-purple-600",
                                  yellow: "text-yellow-600",
                                  indigo: "text-indigo-600",
                                  pink: "text-pink-600",
                                  green: "text-green-600",
                                  orange: "text-orange-600",
                                  gray: "text-gray-600"
                                };

                                const buttonColors = {
                                  emerald: "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100",
                                  blue: "text-blue-600 hover:text-blue-700 hover:bg-blue-100",
                                  purple: "text-purple-600 hover:text-purple-700 hover:bg-purple-100",
                                  yellow: "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100",
                                  indigo: "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100",
                                  pink: "text-pink-600 hover:text-pink-700 hover:bg-pink-100",
                                  green: "text-green-600 hover:text-green-700 hover:bg-green-100",
                                  orange: "text-orange-600 hover:text-orange-700 hover:bg-orange-100",
                                  gray: "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                };

                                return (
                                  <div
                                    key={index}
                                    className={`flex items-center justify-between p-4 bg-gradient-to-r ${colorStyles[doc.color as keyof typeof colorStyles]} border-2 rounded-xl transition-all duration-200 hover:shadow-md`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-shrink-0">
                                        <div className={`w-12 h-12 ${iconBgColors[doc.color as keyof typeof iconBgColors]} rounded-lg flex items-center justify-center text-xl`}>
                                          {doc.icon}
                                        </div>
                                      </div>
                                      <div>
                                        <p className={`text-sm font-semibold ${textColors[doc.color as keyof typeof textColors]}`}>
                                          {doc.name}
                                        </p>
                                        <p className={`text-xs ${subTextColors[doc.color as keyof typeof subTextColors]}`}>
                                          {doc.type} • ✓ Uploaded
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(doc.url, "_blank")}
                                        className={`h-9 px-3 ${buttonColors[doc.color as keyof typeof buttonColors]} font-medium text-xs`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                        View
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = doc.url!;
                                          link.download = doc.name.replace(/ /g, '_');
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className={`h-9 w-9 p-0 ${buttonColors[doc.color as keyof typeof buttonColors]}`}
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                        </svg>
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Summary Section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Document Checklist</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                {documents.map((doc, idx) => (
                                  <div key={idx} className="flex items-center space-x-1">
                                    <span className={doc.url ? "text-green-600" : "text-gray-400"}>
                                      {doc.url ? "✓" : "○"}
                                    </span>
                                    <span className={doc.url ? "text-gray-700" : "text-gray-400"}>
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
                  </CardContent>
                </Card>
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

            <Card>
              <CardHeader>
                <CardTitle>Eligibility Assessment</CardTitle>
                <CardDescription>
                  {application.eligibility
                    ? `Last evaluated: ${application.eligibility.evaluatedAt ? new Date(application.eligibility.evaluatedAt).toLocaleString() : "N/A"}`
                    : "Not evaluated yet"}
                </CardDescription>
              </CardHeader>
              {application.eligibility ? (
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">Overall Result</h3>
                        <span
                          className={
                            application.eligibility.isEligible
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {application.eligibility.isEligible
                            ? "ELIGIBLE"
                            : "INELIGIBLE"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">Total Score</h3>
                        <span className="font-medium">
                          {application.eligibility.totalScore}/100
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Mandatory Criteria
                      </h3>
                      <ul className="space-y-1 text-sm">
                        <li className="flex justify-between">
                          <span>Age (18-35)</span>
                          <span
                            className={
                              application.eligibility.mandatoryCriteria
                                .ageEligible
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {application.eligibility.mandatoryCriteria
                              .ageEligible
                              ? "✓"
                              : "✗"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Business Registration</span>
                          <span
                            className={
                              application.eligibility.mandatoryCriteria
                                .registrationEligible
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {application.eligibility.mandatoryCriteria
                              .registrationEligible
                              ? "✓"
                              : "✗"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Revenue Generation</span>
                          <span
                            className={
                              application.eligibility.mandatoryCriteria
                                .revenueEligible
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {application.eligibility.mandatoryCriteria
                              .revenueEligible
                              ? "✓"
                              : "✗"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Business Plan</span>
                          <span
                            className={
                              application.eligibility.mandatoryCriteria
                                .businessPlanEligible
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {application.eligibility.mandatoryCriteria
                              .businessPlanEligible
                              ? "✓"
                              : "✗"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Climate Impact</span>
                          <span
                            className={
                              application.eligibility.mandatoryCriteria
                                .impactEligible
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {application.eligibility.mandatoryCriteria
                              .impactEligible
                              ? "✓"
                              : "✗"}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Evaluation Scores
                      </h3>
                      {(() => {
                        const totals = computeSectionTotals();
                        return (
                          <ul className="space-y-1 text-sm">
                            <li className="flex justify-between">
                              <span>Innovation and Climate Adaptation Focus</span>
                              <span>{totals.innovation}/35</span>
                            </li>
                            <li className="flex justify-between">
                              <span>Business Viability</span>
                              <span>{totals.viability}/31</span>
                            </li>
                            <li className="flex justify-between">
                              <span>Sectoral and Strategic Alignment</span>
                              <span>{totals.alignment}/20</span>
                            </li>
                            <li className="flex justify-between">
                              <span>Organization Capacity and Partnerships</span>
                              <span>{totals.org}/14</span>
                            </li>
                          </ul>
                        );
                      })()}
                    </div>
                    {application.eligibility.evaluationNotes && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-2">
                          Evaluation Notes
                        </h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {application.eligibility.evaluationNotes}
                        </p>
                      </div>
                    )}

                    {application.eligibility.evaluator && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-2">
                          Reviewed By
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>Reviewer:</strong>{" "}
                            {application.eligibility.evaluator.profile
                              ? `${application.eligibility.evaluator.profile.firstName} ${application.eligibility.evaluator.profile.lastName}`
                              : application.eligibility.evaluator.name ||
                              "Unknown Reviewer"}
                          </p>
                          {application.eligibility.evaluator.profile?.role && (
                            <p>
                              <strong>Role:</strong>{" "}
                              {application.eligibility.evaluator.profile.role
                                .replace(/_/g, " ")
                                .toUpperCase()}
                            </p>
                          )}
                          {application.eligibility.evaluatedAt && (
                            <p>
                              <strong>Review Date:</strong>{" "}
                              {new Date(
                                application.eligibility.evaluatedAt
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-muted-foreground text-sm text-center py-4">
                    This application has not been evaluated yet.
                  </p>
                </CardContent>
              )}
              <CardFooter>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/admin/applications/${application.id}/evaluate`}>
                    {application.eligibility
                      ? "Re-evaluate Application"
                      : "Evaluate Application"}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
