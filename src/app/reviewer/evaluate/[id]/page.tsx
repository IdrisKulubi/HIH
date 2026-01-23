"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    CaretLeft,
    CheckCircle,
    XCircle,
    User,
    Money,
    Files,
    TrendUp,
    ShieldCheck,
    PaperPlaneRight,
    Spinner,
    ArrowSquareOut,
    Eye,
    CaretRight,
    ListChecks,
    Warning
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
    getApplicationById,
    getReviewStatus,
    submitReview,
    getActiveScoringConfiguration,
    getDetailedScores,
    saveScoringProgress,
    initializeDefaultScoringConfig
} from "@/lib/actions";
import { DocumentViewerModal } from "@/components/application/admin/DocumentViewerModal";
import { ScoringSectionModal } from "@/components/application/admin/ScoringSectionModal";
import { getScoringConfigByTrack } from "@/lib/types/scoring";

// --- UI Helpers ---
function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            {icon && <div className="text-blue-600">{icon}</div>}
            <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
    );
}

function DataField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={cn("p-3 bg-gray-50/50 rounded-lg border border-gray-100", className)}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <div className="text-sm font-medium text-gray-900 break-words">{value || <span className="text-gray-400 italic">N/A</span>}</div>
        </div>
    );
}

export default function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const applicationId = parseInt(id, 10);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initializing, setInitializing] = useState(false);

    // Data
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [application, setApplication] = useState<any>(null);
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reviewStatus, setReviewStatus] = useState<any>(null);
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [scoringConfig, setScoringConfig] = useState<any>(null);

    // Form State
    const [detailedScores, setDetailedScores] = useState<Record<number, number>>({});
    const [detailedNotes, setDetailedNotes] = useState<Record<number, string>>({});
    const [generalNotes, setGeneralNotes] = useState("");
    const [decision, setDecision] = useState<"approved" | "rejected">("approved");

    // UI State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerFilename, setViewerFilename] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [applicationId]);

    async function loadData() {
        try {
            const [appRes, statusRes, scoresRes, activeConfigRes] = await Promise.all([
                getApplicationById(applicationId),
                getReviewStatus(applicationId),
                getDetailedScores(applicationId),
                getActiveScoringConfiguration()
            ]);

            if (appRes.success && appRes.data) {
                setApplication(appRes.data);

                const track = appRes.data.track === 'acceleration' ? 'acceleration' : 'foundation';
                let configWithIds;

                // Try to use criteria from the database first
                if (activeConfigRes.success && activeConfigRes.data?.criteria) {
                    const dbCriteria = activeConfigRes.data.criteria
                        .filter((c: any) => c.track === track)
                        .map((c: any) => ({
                            id: c.id,
                            category: c.category,
                            name: c.criteriaName,
                            maxPoints: c.weight,
                            weight: c.weight,
                            scoringLevels: typeof c.scoringLogic === 'string' ? JSON.parse(c.scoringLogic) : c.scoringLogic
                        }));

                    if (dbCriteria.length > 0) {
                        configWithIds = {
                            id: activeConfigRes.data.id,
                            name: activeConfigRes.data.name,
                            criteria: dbCriteria
                        };
                    }
                }

                // Fallback to hardcoded config if DB config is missing/empty
                if (!configWithIds) {
                    const trackConfig = getScoringConfigByTrack(track);
                    configWithIds = {
                        ...trackConfig,
                        criteria: trackConfig.criteria.map((c, index) => ({
                            ...c,
                            id: index + 1, // This will still fail on save, but it's better than nothing
                            weight: c.maxPoints
                        }))
                    };

                    if (activeConfigRes.success && !activeConfigRes.data) {
                        toast.error("Scoring configuration not initialized. Please go to Admin Dashboard to initialize it.");
                    }
                }

                setScoringConfig(configWithIds);
            }

            if (statusRes.success && statusRes.data) {
                setReviewStatus(statusRes.data);
                // Pre-fill notes
                const isR2 = appRes.data?.status === "pending_senior_review";
                if (isR2 && statusRes.data.reviewer2) {
                    setGeneralNotes(statusRes.data.reviewer2.notes || "");
                } else if (!isR2 && statusRes.data.reviewer1) {
                    setGeneralNotes(statusRes.data.reviewer1.notes || "");
                }
            }

            if (scoresRes.success && scoresRes.data) {
                // BLIND REVIEW: Only load scores if:
                // 1. Both reviews are complete, OR
                // 2. Current user has already reviewed (viewing their own scores)
                // R2 should NOT see R1's per-criteria scores before submitting
                const bothReviewsComplete = statusRes.data?.bothReviewsComplete;
                const currentUserHasReviewed = statusRes.data?.currentUserHasReviewed;

                if (bothReviewsComplete || currentUserHasReviewed) {
                    // Safe to show scores
                    const dScores: Record<number, number> = {};
                    const dNotes: Record<number, string> = {};
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    scoresRes.data.forEach((s: any) => {
                        dScores[s.criteriaId] = parseFloat(s.score);
                        dNotes[s.criteriaId] = s.reviewerComment || "";
                    });
                    setDetailedScores(dScores);
                    setDetailedNotes(dNotes);
                } else {
                    // Blind review mode - R2 should start fresh
                    setDetailedScores({});
                    setDetailedNotes({});
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to load application data");
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDoc = (url: string | null, name: string) => {
        if (!url) return;
        setViewerUrl(url);
        setViewerFilename(name);
        setViewerOpen(true);
    };

    const handleInitializeConfig = async () => {
        setInitializing(true);
        try {
            // Force reinitialize to apply updated scoring weights
            const result = await initializeDefaultScoringConfig(true);
            if (result.success) {
                toast.success("Scoring configuration updated!");
                loadData(); // Reload data
            } else {
                toast.error(result.error || "Failed to initialize config");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setInitializing(false);
        }
    };

    const handleSectionSave = async (scores: Record<number, number>, notes: Record<number, string>) => {
        // Update local state
        setDetailedScores(prev => ({ ...prev, ...scores }));
        setDetailedNotes(prev => ({ ...prev, ...notes }));

        // Prepare data for server action
        const updates = Object.entries(scores).map(([cId, score]) => ({
            criteriaId: parseInt(cId),
            score,
            notes: notes[parseInt(cId)]
        }));

        const result = await saveScoringProgress(applicationId, updates);
        if (result.success) {
            toast.success("Section saved");
        } else {
            toast.error("Failed to save progress");
        }
    };

    const handleSubmit = async () => {
        if (!generalNotes.trim()) {
            toast.error("Please provide general evaluation notes");
            return;
        }

        const totalScore = calculateTotalScore();

        setSubmitting(true);
        try {
            // Use unified submitReview - it auto-detects R1/R2
            const result = await submitReview({
                applicationId,
                score: totalScore,
                notes: generalNotes,
            });

            if (result.success) {
                toast.success(result.message);
                router.push(`/admin/applications/${applicationId}`);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper: Group Criteria by Category
    const getGroupedCriteria = () => {
        if (!scoringConfig?.criteria) return {};
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grouped: Record<string, any[]> = {};
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        scoringConfig.criteria.forEach((c: any) => {
            if (!grouped[c.category]) grouped[c.category] = [];
            grouped[c.category].push(c);
        });
        return grouped;
    };

    const calculateTotalScore = () => {
        if (!scoringConfig?.criteria) return 0;
        return Object.values(detailedScores).reduce((sum, val) => sum + val, 0);
    };

    const calculateMaxScore = () => {
        if (!scoringConfig?.criteria) return 100;
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return scoringConfig.criteria.reduce((sum: number, c: any) => sum + (c.weight || 0), 0);
    }

    const groupedCriteria = getGroupedCriteria();
    const currentTotalScore = calculateTotalScore();
    const maxTotalScore = calculateMaxScore();

    const getScoreColor = (s: number) => {
        const pct = (s / maxTotalScore) * 100;
        if (pct >= 70) return "text-green-600";
        if (pct >= 50) return "text-amber-600";
        return "text-red-600";
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Spinner className="animate-spin h-8 w-8 text-blue-600" />
            </div>
        );
    }

    if (!application) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <p>Application not found</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    // Determine reviewer role - based on review status
    const isBlindReview = reviewStatus?.isBlindReview;
    const currentUserHasReviewed = reviewStatus?.currentUserHasReviewed;
    const canSubmitReview = reviewStatus?.canSubmitReview !== false;

    // Check if R1 slot is filled
    const hasReviewer1 = !!reviewStatus?.reviewer1;
    const hasReviewer2 = !!reviewStatus?.reviewer2;

    // If no R1 yet, current user will be R1
    // If R1 exists but no R2, current user will be R2
    const awaitingSecondReview = hasReviewer1 && !hasReviewer2;

    // Determine the role title
    let reviewerTitle = "Reviewer 1";
    if (hasReviewer1 && !hasReviewer2) {
        reviewerTitle = "Reviewer 2 (Blind)";
    } else if (hasReviewer1 && hasReviewer2) {
        reviewerTitle = "Review Complete";
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm h-16 flex items-center px-6 justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-500 hover:text-gray-900">
                        <CaretLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">
                            Evaluating: {application.business.name}
                        </h1>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                            <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{application.status.replace(/_/g, " ")}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{reviewerTitle}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={cn("shadow-lg shadow-blue-900/10 min-w-[120px]", awaitingSecondReview ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700")}
                    >
                        {submitting ? <Spinner className="animate-spin h-4 w-4" /> : "Submit Review"}
                    </Button>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-h-[calc(100vh-64px)]">

                {/* Left Column: Application Details */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col">
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <div className="border-b border-gray-100 px-6 pt-4 bg-gray-50/50">
                            <TabsList className="bg-white border border-gray-200 p-1 mb-4">
                                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                                <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
                                <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
                                <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DataField label="Applicant" value={`${application.applicant.firstName} ${application.applicant.lastName}`} />
                                    <DataField label="Location" value={`${application.business.city}, ${application.business.country}`} />
                                    <DataField label="Sector" value={application.business.sector} />
                                    <DataField label="Registration" value={application.business.isRegistered ? "Registered" : "Unregistered"} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-900">Description</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        {application.business.description}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-900">Problem Statement</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        {application.business.problemSolved}
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="business" className="mt-0 space-y-6">
                                <SectionHeader title="Strategic Analysis" icon={<TrendUp />} />
                                <div className="space-y-4">
                                    <DataField label="Differentiation" value={application.business.businessModelUniquenessDescription} />
                                    <DataField label="Growth History" value={application.business.growthHistory} />
                                    <DataField label="Future Outlook" value={application.business.futureSalesGrowthReason} />
                                </div>
                            </TabsContent>

                            <TabsContent value="financial" className="mt-0 space-y-6">
                                <SectionHeader title="Financial Overview" icon={<Money />} />
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium">County</p>
                                        <p className="text-xl font-bold text-emerald-900">{application.business.county}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                        <p className="text-xs text-blue-600 font-medium">Revenue</p>
                                        <p className="text-xl font-bold text-blue-900">KES {application.business.revenueLastYear ? Number(application.business.revenueLastYear).toLocaleString() : '0'}</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-0 space-y-4">
                                <SectionHeader title="Attached Documents" icon={<Files />} />
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { url: application.business.registrationCertificateUrl, name: "Registration Certificate" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).taxComplianceUrl, name: "Tax Compliance" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).auditedAccountsUrl, name: "Audited Accounts" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).financialRecordsUrl, name: "Financial Records" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).salesEvidenceUrl, name: "Sales Evidence" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).photosUrl, name: "Business Photos" },
                                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        { url: (application.business as any).complianceDocumentsUrl, name: "Compliance Documents" },
                                    ].filter(d => d.url).map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <Files size={20} />
                                                </div>
                                                {doc.name}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleOpenDoc(doc.url!, doc.name)}>
                                                    <Eye size={16} className="mr-2" /> View
                                                </Button>
                                                <Button size="icon" variant="ghost" asChild>
                                                    <a href={doc.url!} target="_blank" title="Open external">
                                                        <ArrowSquareOut size={16} />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Right Column: Scoring (Sticky) */}
                <div className="lg:col-span-4 flex flex-col">
                    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex flex-col">
                        <div className={cn("p-6 border-b border-gray-100", awaitingSecondReview ? "bg-purple-50/50" : "bg-blue-50/50")}>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                {awaitingSecondReview ? <ShieldCheck className="text-purple-600" weight="fill" /> : <User className="text-blue-600" weight="fill" />}
                                {reviewerTitle}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {isBlindReview ? "Blind review - other scores hidden until you submit." : "Complete the scoring sections below."}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Blind Review Notice */}
                            {isBlindReview && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-2">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Warning weight="fill" className="h-5 w-5" />
                                        <span className="text-sm font-medium">Blind Review Mode</span>
                                    </div>
                                    <p className="text-xs text-amber-600 mt-1">Another reviewer has scored this application. Their scores are hidden to ensure unbiased evaluation. Final score will be the average of both reviews.</p>
                                </div>
                            )}


                            {/* Total Score Display */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <Label className="text-sm font-medium text-gray-700">Total Score (You)</Label>
                                <span className={cn("text-3xl font-bold font-mono", getScoreColor(currentTotalScore))}>
                                    {currentTotalScore}<span className="text-base text-gray-400 font-normal">/{maxTotalScore}</span>
                                </span>
                            </div>

                            {/* Criteria Categories List */}
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">Scoring Sections</Label>
                                {Object.keys(groupedCriteria).length === 0 && (
                                    <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-3">
                                        <Warning size={32} className="text-amber-500 mx-auto" />
                                        <p className="text-sm text-gray-500">No active scoring criteria found.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleInitializeConfig}
                                            disabled={initializing}
                                            className="w-full text-xs"
                                        >
                                            {initializing ? "Initializing..." : "Initialize Default Criteria"}
                                        </Button>
                                    </div>
                                )}
                                {Object.keys(groupedCriteria).map((category, idx) => {
                                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const categoryCriteria = groupedCriteria[category] as any[];
                                    const catMax = categoryCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
                                    const catScore = categoryCriteria.reduce((sum, c) => sum + (detailedScores[c.id] || 0), 0);
                                    const isComplete = catScore > 0; // Simple heuristic

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => { setActiveCategory(category); setModalOpen(true); }}
                                            className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", isComplete ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600")}>
                                                    {isComplete ? <CheckCircle size={20} weight="fill" /> : <ListChecks size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{category}</h4>
                                                    <p className="text-xs text-gray-500">{categoryCriteria.length} questions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <span className="block text-sm font-bold text-gray-900">{catScore} / {catMax}</span>
                                                </div>
                                                <CaretRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Final Score Info */}
                            {reviewStatus?.bothReviewsComplete && (
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <Label className="text-sm font-medium text-gray-900">Review Complete</Label>
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-green-700">{reviewStatus.finalScore?.toFixed(1)}</span>
                                            <span className="text-sm text-green-600 ml-1">/ 100</span>
                                        </div>
                                        <p className="text-xs text-green-600 text-center mt-1">Average of both reviewers</p>
                                    </div>
                                </div>
                            )}

                            {/* Decision Info (R2 Only) - Decision is automatic based on average */}
                            {awaitingSecondReview && (
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <Label className="text-sm font-medium text-gray-900">Final Decision</Label>
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                        <p className="text-sm text-blue-800 font-medium">Automatic Decision</p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            The final decision will be calculated automatically based on the average of both reviewers&apos; scores.
                                        </p>
                                        <div className="mt-3 text-xs text-blue-700 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={14} weight="fill" className="text-green-600" />
                                                <span>Average ≥ 70: <strong>Approved</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <XCircle size={14} weight="fill" className="text-red-500" />
                                                <span>Average &lt; 70: <strong>Rejected</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <Label className="text-sm font-medium text-gray-700">
                                    General Feedback <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    value={generalNotes}
                                    onChange={(e) => setGeneralNotes(e.target.value)}
                                    placeholder="Overall assessment and feedback..."
                                    className="min-h-[100px] bg-gray-50 border-gray-200 focus:border-blue-500 p-4 leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/30">
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className={cn("w-full h-12 text-base font-semibold shadow-xl", awaitingSecondReview ? "bg-purple-600 hover:bg-purple-700 shadow-purple-900/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20")}
                            >
                                {submitting ? <Spinner className="animate-spin mr-2" /> : <PaperPlaneRight weight="fill" className="mr-2" />}
                                Submit Evaluation
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                url={viewerUrl}
                filename={viewerFilename}
            />

            {
                activeCategory && (
                    <ScoringSectionModal
                        open={modalOpen}
                        onOpenChange={setModalOpen}
                        category={activeCategory}
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        criteria={groupedCriteria[activeCategory] as any[]}
                        initialScores={detailedScores}
                        initialNotes={detailedNotes}
                        onSave={handleSectionSave}
                        applicationData={application}
                    />
                )
            }
        </div>
    );
}
