"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    getDueDiligence,
    submitPrimaryDDReview,
    getAvailableValidators,
    getEligibilityScoresForDD,
    selectValidatorReviewer,
    claimDDApplication
} from "@/lib/actions/due-diligence";
import { getApplicationById } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Check,
    Clock,
    Buildings,
    Lightning,
    PaperPlaneTilt,
    ShieldCheck,
    UserCheck,
    ChartBar,
    Warning,
    Lightbulb,
    TrendUp,
    Target,
    Users,
    Info,
    PencilSimple,
    Eye,
    HandGrabbing
} from "@phosphor-icons/react";

type DDRecord = {
    id: number;
    applicationId: number;
    phase1Score: number | null;
    phase1Status: string | null;
    phase1Notes: string | null;
    ddStatus: string | null;
    approvalDeadline: Date | null;
    isOversightInitiated: boolean | null;
    oversightJustification: string | null;
    primaryReviewerId: string | null;
    validatorReviewerId: string | null;
    validatorAction: string | null;
    validatorComments: string | null;
    primaryReviewedAt: Date | null;
    reviewer?: { name: string; email: string } | null;
};

type EligibilityScores = {
    applicationId: number;
    reviewer1Score: number;
    reviewer2Score: number;
    aggregateScore: number;
    reviewer1Notes: string | null;
    reviewer2Notes: string | null;
    innovationTotal: number;
    viabilityTotal: number;
    alignmentTotal: number;
    orgCapacityTotal: number;
    totalScore: number;
    scoreDisparity: number;
};

type Validator = {
    id: string;
    name: string;
    email: string;
    role: string;
};

// Category configuration
const CATEGORIES = [
    { id: 'innovation', name: 'Innovation & Climate', max: 35, icon: Lightbulb, color: 'emerald' },
    { id: 'viability', name: 'Business Viability', max: 31, icon: TrendUp, color: 'blue' },
    { id: 'alignment', name: 'Strategic Alignment', max: 20, icon: Target, color: 'purple' },
    { id: 'orgCapacity', name: 'Org Capacity', max: 14, icon: Users, color: 'amber' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

export default function ReviewerDDReviewPage() {
    const params = useParams();
    const { data: session } = useSession();
    const applicationId = parseInt(params.id as string);

    const [ddRecord, setDDRecord] = useState<DDRecord | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [application, setApplication] = useState<any>(null);
    const [eligibilityScores, setEligibilityScores] = useState<EligibilityScores | null>(null);
    const [validators, setValidators] = useState<Validator[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // DD Reviewer's adjusted scores and justifications
    const [adjustedScores, setAdjustedScores] = useState<Record<CategoryId, number>>({
        innovation: 0,
        viability: 0,
        alignment: 0,
        orgCapacity: 0,
    });
    const [scoreJustifications, setScoreJustifications] = useState<Record<CategoryId, string>>({
        innovation: '',
        viability: '',
        alignment: '',
        orgCapacity: '',
    });
    const [editingCategory, setEditingCategory] = useState<CategoryId | null>(null);

    // General comments and validator
    const [generalComments, setGeneralComments] = useState("");
    const [selectedValidator, setSelectedValidator] = useState("");
    const [isClaimed, setIsClaimed] = useState(false);
    const [isMyReview, setIsMyReview] = useState(false);
    const [isMyValidation, setIsMyValidation] = useState(false);

    const loadData = async () => {
        setLoading(true);

        const ddResult = await getDueDiligence(applicationId);
        if (ddResult.success && ddResult.data) {
            const record = ddResult.data as unknown as DDRecord;
            setDDRecord(record);
            setGeneralComments(record.phase1Notes || "");
            
            // Check claim status
            const hasPrimaryReviewer = !!record.primaryReviewerId;
            const isCurrentUserPrimary = record.primaryReviewerId === session?.user?.id;
            const isCurrentUserValidator = record.validatorReviewerId === session?.user?.id;
            
            setIsClaimed(hasPrimaryReviewer);
            setIsMyReview(isCurrentUserPrimary);
            setIsMyValidation(isCurrentUserValidator);
            
            // Auto-claim if unclaimed and status is pending
            if (!hasPrimaryReviewer && record.ddStatus === 'pending') {
                const claimResult = await claimDDApplication(applicationId);
                if (claimResult.success) {
                    toast.success("You've claimed this application for DD review");
                    setIsClaimed(true);
                    setIsMyReview(true);
                }
            }
        }

        const appResult = await getApplicationById(applicationId);
        if (appResult.success && appResult.data) {
            setApplication(appResult.data);
        }

        const scoresResult = await getEligibilityScoresForDD(applicationId);
        if (scoresResult.success && scoresResult.data) {
            setEligibilityScores(scoresResult.data);
            // Initialize adjusted scores with original scores
            setAdjustedScores({
                innovation: scoresResult.data.innovationTotal || 0,
                viability: scoresResult.data.viabilityTotal || 0,
                alignment: scoresResult.data.alignmentTotal || 0,
                orgCapacity: scoresResult.data.orgCapacityTotal || 0,
            });
        }

        const validatorResult = await getAvailableValidators(applicationId);
        if (validatorResult.success && validatorResult.data) {
            setValidators(validatorResult.data);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (applicationId && session?.user?.id) {
            loadData();
        }
    }, [applicationId, session?.user?.id]);

    // Calculate final DD score based on adjusted scores
    const calculateFinalScore = () => {
        const totalMax = CATEGORIES.reduce((sum, cat) => sum + cat.max, 0);
        const totalAdjusted = Object.values(adjustedScores).reduce((sum, score) => sum + score, 0);
        return Math.round((totalAdjusted / totalMax) * 100 * 10) / 10;
    };

    const handleScoreChange = (categoryId: CategoryId, newScore: number, max: number) => {
        const clampedScore = Math.min(Math.max(0, newScore), max);
        setAdjustedScores(prev => ({ ...prev, [categoryId]: clampedScore }));
    };

    const handleJustificationChange = (categoryId: CategoryId, justification: string) => {
        setScoreJustifications(prev => ({ ...prev, [categoryId]: justification }));
    };

    const hasScoreChanged = (categoryId: CategoryId) => {
        if (!eligibilityScores) return false;
        const originalMap: Record<CategoryId, number> = {
            innovation: eligibilityScores.innovationTotal || 0,
            viability: eligibilityScores.viabilityTotal || 0,
            alignment: eligibilityScores.alignmentTotal || 0,
            orgCapacity: eligibilityScores.orgCapacityTotal || 0,
        };
        return adjustedScores[categoryId] !== originalMap[categoryId];
    };

    // Helper to get relevant application data for each scoring category
    const getCategoryApplicationData = (categoryId: CategoryId): { label: string; value: string }[] => {
        if (!application) return [];
        const business = application?.business;
        const appApplicant = application?.applicant;

        switch (categoryId) {
            case 'innovation':
                return [
                    { label: 'Problem Solved', value: business?.problemSolved || 'Not provided' },
                    { label: 'Business Description', value: business?.description || 'Not provided' },
                    { label: 'Sector', value: business?.sector?.replace(/_/g, ' ') || 'Not provided' },
                    { label: 'Environmental Impact', value: business?.environmentalImpact || 'Not provided' },
                    { label: 'Environmental Impact Description', value: business?.environmentalImpactDescription || 'Not provided' },
                    { label: 'Business Model Innovation', value: business?.businessModelInnovation || 'Not provided' },
                    { label: 'Business Model Description', value: business?.businessModelDescription || 'Not provided' },
                    { label: 'Technology Integration', value: business?.technologyIntegration || 'Not provided' },
                    { label: 'Technology Description', value: business?.technologyIntegrationDescription || 'Not provided' },
                    { label: 'Digitization Level', value: business?.digitizationLevel === true ? 'Yes' : business?.digitizationLevel === false ? 'No' : 'Not provided' },
                    { label: 'Digitization Reason', value: business?.digitizationReason || 'Not provided' },
                    { label: 'Business Model Uniqueness', value: business?.businessModelUniqueness || 'Not provided' },
                    { label: 'Business Model Uniqueness Description', value: business?.businessModelUniquenessDescription || 'Not provided' },
                ];
            case 'viability':
                return [
                    { label: 'Revenue Last Year (KES)', value: business?.revenueLastYear || 'Not provided' },
                    { label: 'Customer Count', value: business?.customerCount?.toString() || 'Not provided' },
                    { label: 'Has Financial Records', value: business?.hasFinancialRecords ? 'Yes' : 'No' },
                    { label: 'Has Audited Accounts', value: business?.hasAuditedAccounts ? 'Yes' : 'No' },
                    { label: 'Growth History', value: business?.growthHistory || 'Not provided' },
                    { label: 'Average Annual Revenue Growth', value: business?.averageAnnualRevenueGrowth || 'Not provided' },
                    { label: 'Future Sales Growth', value: business?.futureSalesGrowth || 'Not provided' },
                    { label: 'Future Growth Reason', value: business?.futureSalesGrowthReason || 'Not provided' },
                    { label: 'Relative Pricing', value: business?.relativePricing || 'Not provided' },
                    { label: 'Product Differentiation', value: business?.productDifferentiation || 'Not provided' },
                    { label: 'Threat of Substitutes', value: business?.threatOfSubstitutes || 'Not provided' },
                    { label: 'Competitor Overview', value: business?.competitorOverview || 'Not provided' },
                    { label: 'Ease of Market Entry', value: business?.easeOfMarketEntry || 'Not provided' },
                    { label: 'Scalability Plan', value: business?.scalabilityPlan || 'Not provided' },
                    { label: 'Market Scale Potential', value: business?.marketScalePotential || 'Not provided' },
                    { label: 'Customer Value Proposition', value: business?.customerValueProposition || 'Not provided' },
                ];
            case 'alignment':
                return [
                    { label: 'Social Impact Contribution', value: business?.socialImpactContribution || 'Not provided' },
                    { label: 'Social Impact Description', value: business?.socialImpactContributionDescription || 'Not provided' },
                    { label: 'Job Creation Potential', value: business?.jobCreationPotential || 'Not provided' },
                    { label: 'Projected Inclusion', value: business?.projectedInclusion || 'Not provided' },
                    { label: 'Supplier Involvement', value: business?.supplierInvolvement || 'Not provided' },
                    { label: 'Supplier Support Description', value: business?.supplierSupportDescription || 'Not provided' },
                    { label: 'Market Differentiation', value: business?.marketDifferentiation || 'Not provided' },
                    { label: 'Market Differentiation Description', value: business?.marketDifferentiationDescription || 'Not provided' },
                    { label: 'Sales & Marketing Integration', value: business?.salesMarketingIntegration || 'Not provided' },
                    { label: 'Sales & Marketing Approach', value: business?.salesMarketingApproach || 'Not provided' },
                    { label: 'Has Social Safeguarding', value: business?.hasSocialSafeguarding ? 'Yes' : 'No' },
                    { label: 'Business Compliance', value: business?.businessCompliance || 'Not provided' },
                ];
            case 'orgCapacity':
                return [
                    { label: 'Founder Name', value: `${appApplicant?.firstName || ''} ${appApplicant?.lastName || ''}`.trim() || 'Not provided' },
                    { label: 'Phone Number', value: appApplicant?.phoneNumber || 'Not provided' },
                    { label: 'Email', value: appApplicant?.email || 'Not provided' },
                    { label: 'Years Operational', value: business?.yearsOperational?.toString() || 'Not provided' },
                    { label: 'Is Registered', value: business?.isRegistered ? 'Yes' : 'No' },
                    { label: 'Registration Type', value: business?.registrationType?.replace(/_/g, ' ') || 'Not provided' },
                    { label: 'Full-Time Employees (Total)', value: business?.employees?.fullTimeTotal?.toString() || 'Not provided' },
                    { label: 'Full-Time Women', value: business?.employees?.fullTimeFemale?.toString() || 'Not provided' },
                    { label: 'Full-Time Youth', value: business?.employees?.fullTimeYouth?.toString() || 'Not provided' },
                    { label: 'Full-Time PWD', value: business?.employees?.fullTimePwd?.toString() || 'Not provided' },
                    { label: 'Special Groups Employed', value: business?.specialGroupsEmployed?.toString() || 'Not provided' },
                    { label: 'Has External Funding', value: business?.hasExternalFunding ? 'Yes' : 'No' },
                    { label: 'External Funding Details', value: business?.externalFundingDetails || 'Not provided' },
                    { label: 'Competitive Advantage', value: business?.competitiveAdvantage || 'Not provided' },
                    { label: 'Competitive Advantage Source', value: business?.competitiveAdvantageSource || 'Not provided' },
                    { label: 'Competitive Advantage Strength', value: business?.competitiveAdvantageStrength || 'Not provided' },
                    { label: 'Competitive Advantage Barriers', value: business?.competitiveAdvantageBarriers || 'Not provided' },
                ];
            default:
                return [];
        }
    };

    const handleSubmitReview = async () => {
        // Check if any changed score lacks justification
        for (const cat of CATEGORIES) {
            if (hasScoreChanged(cat.id) && !scoreJustifications[cat.id].trim()) {
                toast.error(`Please provide a reason for changing the ${cat.name} score`);
                return;
            }
        }

        if (!generalComments || generalComments.trim().length < 10) {
            toast.error("Please provide general DD comments (at least 10 characters)");
            return;
        }

        if (!selectedValidator) {
            toast.error("Please select an oversight approver");
            return;
        }

        setSubmitting(true);

        // Build notes with justifications
        const adjustmentNotes = CATEGORIES
            .filter(cat => hasScoreChanged(cat.id))
            .map(cat => `${cat.name}: ${scoreJustifications[cat.id]}`)
            .join('\n');

        const fullNotes = adjustmentNotes
            ? `${generalComments}\n\n--- Score Adjustments ---\n${adjustmentNotes}`
            : generalComments;

        const finalScore = calculateFinalScore();
        const result = await submitPrimaryDDReview(applicationId, finalScore, fullNotes);

        if (result.success) {
            const validatorResult = await selectValidatorReviewer(applicationId, selectedValidator);
            if (validatorResult.success) {
                toast.success("Assessment submitted and sent for approval!");
                loadData();
            } else {
                toast.error(validatorResult.message);
            }
        } else {
            toast.error(result.message);
        }
        setSubmitting(false);
    };

    const canReview = ddRecord?.ddStatus === 'pending' || ddRecord?.ddStatus === 'in_progress' || ddRecord?.ddStatus === 'queried' || ddRecord?.ddStatus === 'auto_reassigned';
    const isAwaitingApproval = ddRecord?.ddStatus === 'awaiting_approval';

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] p-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    const getOriginalScore = (categoryId: CategoryId): number => {
        if (!eligibilityScores) return 0;
        const map: Record<CategoryId, number> = {
            innovation: eligibilityScores.innovationTotal || 0,
            viability: eligibilityScores.viabilityTotal || 0,
            alignment: eligibilityScores.alignmentTotal || 0,
            orgCapacity: eligibilityScores.orgCapacityTotal || 0,
        };
        return map[categoryId];
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" asChild>
                        <Link href="/reviewer/due-diligence">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to DD Queue
                        </Link>
                    </Button>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <Buildings className="h-7 w-7 text-emerald-600" weight="duotone" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {application?.business?.name || "DD Review"}
                                </h1>
                                <p className="text-gray-500">Application #{applicationId} • Due Diligence Review</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {ddRecord?.isOversightInitiated && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    <Lightning className="h-4 w-4 mr-1" />
                                    Oversight Recommended
                                </Badge>
                            )}
                            <Badge variant={ddRecord?.ddStatus === 'approved' ? 'default' : 'secondary'}>
                                {ddRecord?.ddStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Role Status Banner */}
                <Card className={`border-2 ${isMyReview ? 'border-emerald-300 bg-emerald-50' : isMyValidation ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <HandGrabbing className={`h-5 w-5 ${isMyReview ? 'text-emerald-600' : isMyValidation ? 'text-purple-600' : 'text-gray-500'}`} weight="duotone" />
                                <div>
                                    {isMyReview ? (
                                        <div>
                                            <p className="font-medium text-emerald-800">
                                                👋 This is <span className="font-bold">your review</span> to complete
                                            </p>
                                            <p className="text-sm text-emerald-600">
                                                Fill in your findings below, then send to a colleague for a second check
                                            </p>
                                        </div>
                                    ) : isMyValidation ? (
                                        <div>
                                            <p className="font-medium text-purple-800">
                                                👀 You&apos;ve been asked to <span className="font-bold">verify this review</span>
                                            </p>
                                            <p className="text-sm text-purple-600">
                                                Check the work done by your colleague and approve or send back for changes
                                            </p>
                                        </div>
                                    ) : ddRecord?.primaryReviewerId ? (
                                        <p className="font-medium text-gray-700">
                                            ℹ️ Being reviewed by: <span className="font-bold">{ddRecord?.reviewer?.name || 'Another team member'}</span>
                                        </p>
                                    ) : (
                                        <p className="font-medium text-gray-600">
                                            📋 This application is available to review
                                        </p>
                                    )}
                                </div>
                            </div>
                            {isMyReview && (
                                <Badge className="bg-emerald-600">Your Review</Badge>
                            )}
                            {isMyValidation && (
                                <Badge className="bg-purple-600">Your Second Check</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts */}
                {ddRecord?.isOversightInitiated && ddRecord?.oversightJustification && (
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <Lightning className="h-5 w-5 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-purple-800">⚡ Priority Review</p>
                                    <p className="text-purple-700">{ddRecord.oversightJustification}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {ddRecord?.ddStatus === 'queried' && ddRecord?.validatorComments && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <Warning className="h-5 w-5 text-red-600 mt-0.5" weight="fill" />
                                <div>
                                    <p className="font-medium text-red-800">🔙 Sent Back For Changes</p>
                                    <p className="text-red-700 mt-1">{ddRecord.validatorComments}</p>
                                    <p className="text-sm text-red-600 mt-2 bg-red-100 p-2 rounded">
                                        <strong>What to do:</strong> Please address the comments above and submit again.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {eligibilityScores && eligibilityScores.scoreDisparity > 10 && (
                    <Card className="border-amber-300 bg-amber-50">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <Warning className="h-5 w-5 text-amber-600" weight="fill" />
                                <div>
                                    <p className="font-medium text-amber-800">⚠️ Reviewers Disagreed on Score</p>
                                    <p className="text-sm text-amber-600">
                                        The two reviewers gave very different scores ({eligibilityScores.scoreDisparity} points apart). 
                                        Please pay extra attention during your site visit.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main Content */}
                    <div className="xl:col-span-3 space-y-6">
                        <Tabs defaultValue="scoring" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="scoring">Scoring Review</TabsTrigger>
                                <TabsTrigger value="application">Application Details</TabsTrigger>
                            </TabsList>

                            {/* Scoring Review Tab */}
                            <TabsContent value="scoring" className="space-y-6">
                                {/* Score Summary Header */}
                                <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <ChartBar className="h-5 w-5 text-emerald-600" weight="duotone" />
                                            Score Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-4 gap-4 text-center">
                                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-500 mb-1">Reviewer 1</p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {eligibilityScores?.reviewer1Score || 0}%
                                                </p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-500 mb-1">Reviewer 2</p>
                                                <p className="text-2xl font-bold text-purple-600">
                                                    {eligibilityScores?.reviewer2Score || 0}%
                                                </p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-500 mb-1">Original Avg</p>
                                                <p className="text-2xl font-bold text-gray-600">
                                                    {eligibilityScores?.aggregateScore || 0}%
                                                </p>
                                            </div>
                                            <div className="p-3 bg-emerald-100 rounded-lg shadow-sm border-2 border-emerald-300">
                                                <p className="text-xs text-emerald-700 mb-1 font-medium">Your Final</p>
                                                <p className="text-2xl font-bold text-emerald-700">
                                                    {calculateFinalScore()}%
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Category Scoring Cards */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <PencilSimple className="h-5 w-5" />
                                        Review & Adjust Scores
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Review each category. Keep the score if you agree, or adjust it and provide a reason.
                                    </p>

                                    {CATEGORIES.map((category) => {
                                        const Icon = category.icon;
                                        const original = getOriginalScore(category.id);
                                        const current = Math.min(adjustedScores[category.id], category.max);
                                        const changed = hasScoreChanged(category.id);

                                        // Map colors explicitly to avoid Tailwind purging dynamic classes
                                        const colorClasses: Record<string, { bgIcon: string, textIcon: string, bgBar: string }> = {
                                            emerald: { bgIcon: 'bg-emerald-100', textIcon: 'text-emerald-600', bgBar: 'bg-emerald-500' },
                                            blue: { bgIcon: 'bg-blue-100', textIcon: 'text-blue-600', bgBar: 'bg-blue-500' },
                                            purple: { bgIcon: 'bg-purple-100', textIcon: 'text-purple-600', bgBar: 'bg-purple-500' },
                                            amber: { bgIcon: 'bg-amber-100', textIcon: 'text-amber-600', bgBar: 'bg-amber-500' }
                                        };
                                        const colors = colorClasses[category.color];

                                        return (
                                            <Card
                                                key={category.id}
                                                className={`transition-all ${changed ? 'border-amber-300 bg-amber-50/30' : ''}`}
                                            >
                                                <CardContent className="py-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-3 rounded-lg ${colors.bgIcon}`}>
                                                            <Icon className={`h-6 w-6 ${colors.textIcon}`} weight="duotone" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-gray-900">{category.name}</h4>
                                                                    <Dialog>
                                                                        <DialogTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={`View ${category.name} applicant data`}>
                                                                                <Eye className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <DialogContent className="max-w-lg">
                                                                            <DialogHeader>
                                                                                <DialogTitle className="flex items-center gap-2">
                                                                                    <Icon className={`h-5 w-5 ${colors.textIcon}`} />
                                                                                    {category.name} - Applicant Data
                                                                                </DialogTitle>
                                                                            </DialogHeader>
                                                                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                                                                {getCategoryApplicationData(category.id).map((item, idx) => (
                                                                                    <div key={idx} className="border-b pb-3 last:border-b-0">
                                                                                        <Label className="text-sm font-medium text-gray-600">{item.label}</Label>
                                                                                        <p className="mt-1 text-gray-900 whitespace-pre-wrap">{item.value}</p>
                                                                                    </div>
                                                                                ))}
                                                                                {getCategoryApplicationData(category.id).length === 0 && (
                                                                                    <p className="text-gray-500 italic">No application data available for this category.</p>
                                                                                )}
                                                                            </div>
                                                                        </DialogContent>
                                                                    </Dialog>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm text-gray-500">
                                                                        Original: <strong>{getOriginalScore(category.id)}</strong> / {category.max}
                                                                    </span>
                                                                    {changed && (
                                                                        <Badge variant="outline" className="bg-amber-100 text-amber-700">
                                                                            Modified
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Label className="text-sm whitespace-nowrap">Your Score:</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={category.max}
                                                                        value={adjustedScores[category.id]}
                                                                        onChange={(e) => handleScoreChange(category.id, parseInt(e.target.value) || 0, category.max)}
                                                                        className="w-20"
                                                                        disabled={!canReview}
                                                                    />
                                                                    <span className="text-sm text-gray-500">/ {category.max}</span>
                                                                </div>

                                                                <div className="flex-1">
                                                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                        <div
                                                                            className={`h-2 rounded-full transition-all ${changed ? 'bg-amber-500' : colors.bgBar}`}
                                                                            style={{ width: `${Math.min(100, (adjustedScores[category.id] / category.max) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Justification required if changed */}
                                                            {changed && canReview && (
                                                                <div className="mt-3">
                                                                    <Label className="text-sm text-amber-700 font-medium">
                                                                        Reason for change *
                                                                    </Label>
                                                                    <Textarea
                                                                        placeholder={`Why did you change the ${category.name} score?`}
                                                                        value={scoreJustifications[category.id]}
                                                                        onChange={(e) => handleJustificationChange(category.id, e.target.value)}
                                                                        rows={2}
                                                                        className="mt-1"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Reviewer Notes */}
                                {(eligibilityScores?.reviewer1Notes || eligibilityScores?.reviewer2Notes) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Previous Reviewer Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {eligibilityScores?.reviewer1Notes && (
                                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <p className="text-xs text-blue-700 font-medium mb-1">Reviewer 1:</p>
                                                    <p className="text-sm text-gray-700">{eligibilityScores.reviewer1Notes}</p>
                                                </div>
                                            )}
                                            {eligibilityScores?.reviewer2Notes && (
                                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                    <p className="text-xs text-purple-700 font-medium mb-1">Reviewer 2:</p>
                                                    <p className="text-sm text-gray-700">{eligibilityScores.reviewer2Notes}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* Application Details Tab */}
                            <TabsContent value="application" className="space-y-6">
                                {application?.business && (
                                    <>
                                        {/* Business Info */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Buildings className="h-5 w-5" weight="duotone" />
                                                    Business Information
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Name:</span>
                                                        <p className="font-medium">{application.business.name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Sector:</span>
                                                        <p className="font-medium">{application.business.sector || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">County:</span>
                                                        <p className="font-medium">{application.business.county || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Years Operating:</span>
                                                        <p className="font-medium">{application.business.yearsOperational || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Registered:</span>
                                                        <p className="font-medium">{application.business.isRegistered ? 'Yes' : 'No'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Revenue Last Year:</span>
                                                        <p className="font-medium">{application.business.revenueLastYear || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <span className="text-gray-500 text-sm">Description:</span>
                                                    <p className="text-sm mt-1">{application.business.description || '-'}</p>
                                                </div>
                                                <div className="mt-4">
                                                    <span className="text-gray-500 text-sm">Problem Solved:</span>
                                                    <p className="text-sm mt-1">{application.business.problemSolved || '-'}</p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Employees */}
                                        {application.business.employees && (
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Users className="h-5 w-5" weight="duotone" />
                                                        Employee Information
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500">Full-Time Total:</span>
                                                            <p className="font-medium">{application.business.employees.fullTimeTotal || 0}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Full-Time Female:</span>
                                                            <p className="font-medium">{application.business.employees.fullTimeFemale || 0}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Full-Time Youth:</span>
                                                            <p className="font-medium">{application.business.employees.fullTimeYouth || 0}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Environmental Impact */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Lightbulb className="h-5 w-5" weight="duotone" />
                                                    Innovation & Impact
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Environmental Impact:</span>
                                                    <p className="mt-1">{application.business.environmentalImpact || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Business Model Innovation:</span>
                                                    <p className="mt-1">{application.business.businessModelInnovation || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Scalability Plan:</span>
                                                    <p className="mt-1">{application.business.scalabilityPlan || '-'}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                <Button variant="outline" asChild className="w-full">
                                    <Link href={`/reviewer/applications/${applicationId}`}>
                                        View Complete Application
                                    </Link>
                                </Button>
                            </TabsContent>
                        </Tabs>

                        {/* Submit Section */}
                        {canReview && (
                            <Card className="border-2 border-emerald-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                        Ready to Submit?
                                    </CardTitle>
                                    <CardDescription>
                                        Your final score: <strong className="text-emerald-600">{calculateFinalScore()}%</strong>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Your Findings & Notes *</Label>
                                        <p className="text-sm text-gray-500 mb-2">
                                            Write down what you found during your site visit:
                                        </p>
                                        <Textarea
                                            placeholder="For example:
• Did you visit the business in person?
• Does it exist at the address given?
• Did you meet the owner/staff?
• Any concerns or things that don't match their application?"
                                            value={generalComments}
                                            onChange={(e) => setGeneralComments(e.target.value)}
                                            rows={5}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Who Should Check Your Work? *</Label>
                                        <p className="text-sm text-gray-500 mb-2">
                                            Choose a colleague to review what you&apos;ve done. They&apos;ll give final approval.
                                        </p>
                                        <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="👤 Select a colleague..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {validators.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{v.name || v.email}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {v.role === 'reviewer_1' ? 'Reviewer 1' : 
                                                                 v.role === 'reviewer_2' ? 'Reviewer 2' : 
                                                                 v.role === 'oversight' ? 'Oversight' : 
                                                                 v.role === 'admin' ? 'Admin' : v.role}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-800">
                                            <strong>What happens next?</strong><br />
                                            Your colleague will receive this review and check your work. 
                                            Once they approve, the application moves forward. 
                                            If they have questions, they&apos;ll send it back to you.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={submitting || !generalComments.trim() || !selectedValidator}
                                        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <PaperPlaneTilt className="h-5 w-5 mr-2" />
                                        {submitting ? "Submitting..." : "Submit & Send for Second Check"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Awaiting Approval */}
                        {isAwaitingApproval && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="py-8 text-center">
                                    <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500" weight="duotone" />
                                    <h3 className="text-lg font-medium text-blue-800">Waiting for Second Check</h3>
                                    <p className="text-blue-600 mt-2">
                                        You&apos;ve sent this to a colleague for review. <br/>
                                        They&apos;ll approve it or send it back if they have questions.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Review Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-sm">DD Assessment</span>
                                    {ddRecord?.primaryReviewedAt ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                            <Check className="h-3 w-3 mr-1" /> Done
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Pending</Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-sm">Sent for Approval</span>
                                    {ddRecord?.validatorReviewerId ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                            <Check className="h-3 w-3 mr-1" /> Yes
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">No</Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 text-sm">Final Approval</span>
                                    {ddRecord?.validatorAction === 'approved' ? (
                                        <Badge className="bg-emerald-600 text-xs">Approved</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Pending</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Quick Info</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Track</span>
                                    <Badge variant="outline">{application?.track || '-'}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Sector</span>
                                    <span className="font-medium">{application?.business?.sector || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">County</span>
                                    <span className="font-medium">{application?.business?.county || '-'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Button variant="outline" asChild className="w-full">
                            <Link href={`/reviewer/applications/${applicationId}`}>
                                <Info className="h-4 w-4 mr-2" />
                                Full Application
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
