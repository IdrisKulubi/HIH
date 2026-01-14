"use client";

import Link from "next/link";
import { format } from "date-fns";
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
  CaretRight,
  Buildings,
  User,
  EnvelopeSimple,
  Phone,
  CalendarBlank,
  MapPin,
  Globe,
  Briefcase,
  Money,
  TrendUp,
  Files,
  ShieldCheck,
  Target,
  Clock
} from "@phosphor-icons/react";
import { TwoTierReviewPanel } from "@/components/application/admin/TwoTierReviewPanel";
import { DocumentViewerModal } from "@/components/application/admin/DocumentViewerModal";
import { cn } from "@/lib/utils";

// --- UI Helpers ---

function DataField({ label, value, icon, className }: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("group p-3 rounded-xl transition-all hover:bg-gray-50 border border-transparent hover:border-gray-100", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <div className="text-sm font-semibold text-gray-900 break-words leading-relaxed">
            {value || <span className="text-gray-400 italic">N/A</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
      {icon && (
        <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm ring-1 ring-blue-100">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
    </div>
  );
}

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
    | "approved"
    | "rejected"
    | "scoring_phase"
    | "finalist";
    submittedAt: string | null;
    business: {
      name: string;
      city: string;
      county: string;
      country: string;
      description: string;
      yearsOperational?: number;
      sector?: string;
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
      dateOfBirth: string | null;
      county: string;
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

  // Document Viewer State
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [docViewerUrl, setDocViewerUrl] = useState<string | null>(null);
  const [docViewerName, setDocViewerName] = useState("");

  const handleOpenDocument = (url: string, name: string) => {
    setDocViewerUrl(url);
    setDocViewerName(name);
    setDocViewerOpen(true);
  };

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
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center">
        <Spinner className="animate-spin text-blue-600 mb-4 h-10 w-10" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading Application...</h1>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center">
        <div className="bg-red-50 rounded-full p-4 mb-4 ring-8 ring-red-50/50">
          <Warning className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Fetching Application</h1>
        <p className="text-gray-500 mb-6">{error || "An unexpected error occurred."}</p>
        <Button asChild variant="outline">
          <Link href="/admin/applications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
        </Button>
      </div>
    );
  }

  const formattedSubmittedAt = application.submittedAt
    ? format(new Date(application.submittedAt), "PPP 'at' p")
    : "Not Submitted";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10";
      case "under_review": return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/10";
      case "approved": return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/10";
      case "rejected": return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-700/10";
      case "scoring_phase": return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10";
      case "finalist": return "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10";
      default: return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/10";
    }
  };

  const handleDownloadApplication = async () => {
    if (!applicationId) return;

    try {
      const result = await downloadEnhancedApplicationDOCX(applicationId);
      if (result.success && result.data) {
        // Decode base64 to binary and create blob
        const binaryString = atob(result.data.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: result.data.contentType });

        // Create download link from blob
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Application exported successfully!");
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

  // Get category totals directly from stored DB values (no reconstruction needed!)
  const totals = {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    innovation: (application?.eligibility as any)?.categoryTotals?.innovation ?? 0,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    viability: (application?.eligibility as any)?.categoryTotals?.viability ?? 0,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    alignment: (application?.eligibility as any)?.categoryTotals?.alignment ?? 0,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    org: (application?.eligibility as any)?.categoryTotals?.orgCapacity ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/50 transition-all duration-200">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/applications"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Applications"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 hidden sm:block">Application #{application.id}</span>
                <Badge
                  variant="outline"
                  className={cn("font-medium px-2.5 py-0.5 rounded-full text-xs capitalize border-0", getStatusColor(application.status))}
                >
                  {application.status?.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 font-medium"
                onClick={handleDownloadApplication}
                disabled={updating}
              >
                <DownloadSimple className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>

              <Link href={`/admin/applications/${application.id}/due-diligence`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 font-medium"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Due Diligence</span>
                </Button>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-200 font-medium"
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Reject</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      Reject Application?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the application as rejected. This action can be undone later if needed, but will notify the applicant.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                      onClick={handleRejectApplication}
                      disabled={updating}
                    >
                      {updating ? "Processing..." : "Confirm Rejection"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-0 font-medium"
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Approve</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Approve Application?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the application as approved and move it to the next stage. PROCEED WITH CAUTION.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                      onClick={handleApproveApplication}
                      disabled={updating}
                    >
                      {updating ? "Processing..." : "Confirm Approval"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-6">

            {/* Applicant Profile Header Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-blue-200 shadow-lg">
                {application.business.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                  {application.business.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{application.applicant.firstName} {application.applicant.lastName}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{application.business.city}, {application.business.country}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="flex items-center gap-1.5">
                    <CalendarBlank className="h-4 w-4 text-gray-400" />
                    <span>Submitted {format(new Date(application.submittedAt || Date.now()), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="overview" className="w-full">
              <div className="sticky top-[65px] z-20 bg-[#F8FAFC] pt-2 pb-4">
                <TabsList className="h-12 w-full justify-start bg-white/50 backdrop-blur-sm p-1 border border-gray-200/50 rounded-xl gap-1">
                  {["overview", "business", "financial", "documents"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-medium text-gray-500 transition-all text-sm capitalize"
                    >
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sector</p>
                    <p className="font-semibold text-gray-900">{application.business.sector || "N/A"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Registration</p>
                    <div className="flex items-center gap-1.5">
                      {application.business.isRegistered ? (
                        <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                      ) : (
                        <Warning className="h-4 w-4 text-amber-500" weight="fill" />
                      )}
                      <span className="font-semibold text-gray-900">{application.business.isRegistered ? "Registered" : "Unregistered"}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">County</p>
                    <p className="font-semibold text-gray-900">{application.business.county}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Employees</p>
                    <p className="font-semibold text-gray-900">{application.business.employees?.fullTimeTotal || 0} Total</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <SectionHeader title="Executive Summary" icon={<Files className="h-5 w-5" weight="duotone" />} />
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Business Description</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">{application.business.description || "No description provided."}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Problem Statement</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">{application.business.problemSolved || "No problem statement provided."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
                  <SectionHeader title="Contact Information" icon={<EnvelopeSimple className="h-5 w-5" weight="duotone" />} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataField label="Email Address" value={application.applicant.email} icon={<EnvelopeSimple className="h-4 w-4" />} />
                    <DataField label="Phone Number" value={application.applicant.phoneNumber} icon={<Phone className="h-4 w-4" />} />
                    <DataField label="Gender" value={application.applicant.gender} className="capitalize" icon={<User className="h-4 w-4" />} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="business" className="mt-0 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
                  <SectionHeader title="Operational Details" icon={<Buildings className="h-5 w-5" weight="duotone" />} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataField label="Operational Years" value={application.business.yearsOperational} icon={<Clock className="h-4 w-4" />} />
                    <DataField label="Sector" value={application.business.sector} icon={<Briefcase className="h-4 w-4" />} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
                  <SectionHeader title="Strategic Analysis" icon={<TrendUp className="h-5 w-5" weight="duotone" />} />
                  <div className="space-y-8">
                    {application.business.businessModelUniquenessDescription && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Differentiation</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{application.business.businessModelUniquenessDescription}</p>
                      </div>
                    )}
                    {application.business.growthHistory && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Growth History</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{application.business.growthHistory}</p>
                      </div>
                    )}
                    {application.business.futureSalesGrowth && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Future Outlook</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">{application.business.futureSalesGrowth.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{application.business.futureSalesGrowthReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="mt-0 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
                  <SectionHeader title="Financial Overview" icon={<Money className="h-5 w-5" weight="duotone" />} />


                  {application.business.funding && application.business.funding.length > 0 ? (
                    <div className="space-y-6">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">External Funding History</h3>
                      {application.business.funding.map((fund, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-gray-900">{fund.funderName || "Unknown Funder"}</h4>
                              <p className="text-xs text-gray-500">{fund.fundingDate ? new Date(fund.fundingDate).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <Badge className="bg-white border-gray-200 text-gray-700 font-mono">
                              ${fund.amountUsd?.toLocaleString()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs block">Source</span>
                              <span className="capitalize">{fund.fundingSource?.replace(/_/g, " ")}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs block">Instrument</span>
                              <span className="capitalize">{fund.fundingInstrument}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Money className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No external funding records found.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                {/* Reusing the documents logic but styling it simpler */}
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
                  <SectionHeader title="Attached Documents" icon={<Files className="h-5 w-5" weight="duotone" />} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      { url: application.business.registrationCertificateUrl, name: "Registration Certificate", icon: <ShieldCheck className="h-5 w-5 text-emerald-600" /> },
                      //eslint-disable-next-line @typescript-eslint/no-explicit-any
                      { url: (application.business as any).businessOverviewUrl, name: "Business Overview", icon: <Files className="h-5 w-5 text-blue-600" /> },
                      //eslint-disable-next-line @typescript-eslint/no-explicit-any
                      { url: (application.business as any).auditedAccountsUrl, name: "Audited Accounts", icon: <Money className="h-5 w-5 text-amber-600" /> },
                      //eslint-disable-next-line @typescript-eslint/no-explicit-any
                      { url: (application.business as any).taxComplianceUrl, name: "Tax Compliance", icon: <Buildings className="h-5 w-5 text-indigo-600" /> }
                    ].filter(d => d.url)).map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-50">
                            {doc.icon}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-xs text-gray-500">Click to preview</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-white hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => handleOpenDocument(doc.url!, doc.name)}
                          >
                            View
                          </Button>
                          <Button size="icon" variant="ghost" asChild className="h-8 w-8 text-gray-400 hover:text-blue-600">
                            <Link href={doc.url!} target="_blank"><ArrowSquareOut className="h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(!application.business.registrationCertificateUrl && !(application.business as any).businessOverviewUrl) && (
                      <div className="col-span-full py-8 text-center text-gray-500">No documents uploaded.</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">

            {/* Review Panel - Now integrated structurally */}
            <div className="sticky top-[80px] space-y-6">
              {/* System Score Card */}
              <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" weight="fill" />
                    System Score
                  </h3>
                  {application.eligibility?.systemScore != null && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Score: {application.eligibility?.systemScore}
                    </Badge>
                  )}
                </div>
                <div className="p-6 text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={351.86} strokeDashoffset={351.86 - (351.86 * (application.eligibility?.systemScore || 0)) / 100} className="text-blue-600 transition-all duration-1000 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-3xl font-bold text-gray-900 tracking-tighter">{application.eligibility?.systemScore || 0}</span>
                      <span className="block text-xs text-gray-500 font-medium uppercase tracking-wide">Points</span>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Innovation</span>
                      <span className="font-medium text-gray-900">{totals.innovation} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Viability</span>
                      <span className="font-medium text-gray-900">{totals.viability} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Alignment</span>
                      <span className="font-medium text-gray-900">{totals.alignment} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Org. Capacity</span>
                      <span className="font-medium text-gray-900">{totals.org} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Review Workflow */}
              <TwoTierReviewPanel
                applicationId={application.id}
                currentStatus={application.status}
                isAdmin={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={docViewerOpen}
        onClose={() => setDocViewerOpen(false)}
        url={docViewerUrl}
        filename={docViewerName}
      />
    </div>
  );
}
