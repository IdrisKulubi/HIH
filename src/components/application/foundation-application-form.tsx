"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    FloppyDiskIcon,
    CheckIcon,
    HouseIcon,
    SpinnerIcon,
    UserIcon,
    BuildingsIcon,
    CurrencyDollarIcon,
    LightbulbIcon,
    TargetIcon,
    PlantIcon,
    ClipboardTextIcon,
    HandshakeIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Form sections
import { ApplicantDetailsForm } from "./forms/applicant-details-form";
import { BusinessEligibilityForm } from "./forms/business-eligibility-form";
import { FoundationCommercialViabilityForm, FoundationBusinessModelForm } from "./forms/foundation-commercial-form";
import { FoundationMarketPotentialForm } from "./forms/foundation-market-form";
import { FoundationSocialImpactForm } from "./forms/foundation-social-form";
import { DeclarationForm } from "./forms/declaration-form";
import { ReviewSubmitSection } from "./forms/review-submit-section";

// Schema
import {
    foundationApplicationSchema,
    FoundationApplicationFormData,
    defaultApplicant,
    defaultBusinessEligibility,
} from "./schemas/bire-application-schema";

const DRAFT_KEY = "bire_foundation_draft";

const STEPS = [
    {
        id: "applicant",
        label: "Applicant Details",
        shortLabel: "Applicant",
        icon: UserIcon,
        description: "Personal information",
    },
    {
        id: "business",
        label: "Business Profile",
        shortLabel: "Business",
        icon: BuildingsIcon,
        description: "Eligibility details",
    },
    {
        id: "businessModel",
        label: "Business Model",
        shortLabel: "Model",
        icon: LightbulbIcon,
        description: "Innovation level",
    },
    {
        id: "commercial",
        label: "Commercial Viability",
        shortLabel: "Commercial",
        icon: CurrencyDollarIcon,
        description: "Revenue and customers",
    },
    {
        id: "market",
        label: "Market Potential",
        shortLabel: "Market",
        icon: TargetIcon,
        description: "Market analysis",
    },
    {
        id: "social",
        label: "Social Impact",
        shortLabel: "Impact",
        icon: PlantIcon,
        description: "Environmental & social",
    },
    {
        id: "declaration",
        label: "Declaration",
        shortLabel: "Declaration",
        icon: HandshakeIcon,
        description: "Sign & Certify",
    },
    {
        id: "review",
        label: "Review & Submit",
        shortLabel: "Review",
        icon: ClipboardTextIcon,
        description: "Final review",
    },
];

export function FoundationApplicationForm() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [disqualifiedReason, setDisqualifiedReason] = useState<string | null>(null);

    const form = useForm<FoundationApplicationFormData>({
        // Cast resolver to any to bypass strict Date vs undefined check in defaultValues
        resolver: zodResolver(foundationApplicationSchema) as any,
        defaultValues: {
            applicant: defaultApplicant,
            business: {
                ...defaultBusinessEligibility,
                isRegistered: true,
                hasFinancialRecords: true,
            },
            businessModel: {
                businessModelInnovation: undefined,
            },
            commercialViability: {
                revenueLastYear: 0,
                customerCount: 0,
                hasExternalFunding: false,
                digitizationLevel: undefined,
            },
            marketPotential: {
                relativePricing: undefined,
                relativePricingReason: "",
                productDifferentiation: undefined,
                productDifferentiationDescription: "",
                threatOfSubstitutes: undefined,
                competitorOverview: "",
                easeOfMarketEntry: undefined,
            },
            socialImpact: {
                environmentalImpact: undefined,
                fullTimeEmployeesTotal: 0,
                fullTimeEmployeesWomen: 0,
                fullTimeEmployeesYouth: 0,
                fullTimeEmployeesPwd: 0,
                businessCompliance: undefined,
            },
            declaration: {
                hasSocialSafeguarding: false,
                confirmTruth: false,
                declarationName: "",
                declarationDate: new Date(),
            },
            documents: {},
        } as DefaultValues<FoundationApplicationFormData>,
        mode: "onChange",
    });

    // Load draft
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                if (parsed.data?.declaration?.declarationDate) {
                    parsed.data.declaration.declarationDate = new Date(parsed.data.declaration.declarationDate);
                }
                // Also restore dates for applicant dob if it exists as string or needs init
                if (parsed.data?.applicant?.dob) {
                    parsed.data.applicant.dob = new Date(parsed.data.applicant.dob);
                } else if (parsed.data?.applicant) {
                    // Fallback if dob is missing in draft but applicant exists
                    parsed.data.applicant.dob = new Date();
                }

                form.reset(parsed.data);

                // Restore progress but check bounds
                const savedStep = parsed.step || 0;
                setActiveStep(savedStep < STEPS.length ? savedStep : 0);
                setCompletedSteps(parsed.completedSteps || []);

                toast.info("Draft loaded", { description: "Your previous progress was restored." });
            } catch (e) {
                console.error("Failed to load draft:", e);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }, [form]);

    // Auto-save logic
    const saveDraft = useCallback(() => {
        setIsAutoSaving(true);
        const data = form.getValues();
        const draft = {
            data,
            step: activeStep,
            completedSteps,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setLastSaved(new Date());
        setIsAutoSaving(false);
    }, [form, activeStep, completedSteps]);

    useEffect(() => {
        const interval = setInterval(saveDraft, 30000);
        return () => clearInterval(interval);
    }, [saveDraft]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login?callbackUrl=/apply/foundation");
        }
    }, [status, router]);

    const progress = ((activeStep + 1) / STEPS.length) * 100;

    const getFieldsForStep = (stepId: string): any[] => {
        switch (stepId) {
            case "applicant": return ["applicant"];
            case "business": return ["business"];
            case "businessModel": return ["businessModel"];
            case "commercial": return ["commercialViability"];
            case "market": return ["marketPotential"];
            case "social": return ["socialImpact"];
            case "declaration": return ["declaration"];
            default: return [];
        }
    };

    const checkEligibility = (data: FoundationApplicationFormData) => {
        // 1. Age Check (18-35)
        if (activeStep === 0) { // Applicant Step
            const dob = new Date(data.applicant.dob);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            // DOB Validation: Must be born in 2006 or earlier, and not in the current year
            const currentYear = today.getFullYear();
            const birthYear = dob.getFullYear();

            if (birthYear >= currentYear) {
                return "Date of birth cannot be in the current year or future. Please correct your date of birth.";
            }
            if (birthYear > 2006) {
                return "You must be born in 2006 or earlier to be eligible. Please correct your date of birth.";
            }
        }

        // 2. Business Country Check
        if (activeStep === 1) { // Business Step
            if (data.business.country?.toLowerCase() !== "kenya") {
                return "This program is currently open only to businesses based in Kenya.";
            }
        }

        return null;
    };

    const goToNextStep = async () => {
        if (activeStep >= STEPS.length - 1) return;

        const currentStepId = STEPS[activeStep].id;
        const fieldsToValidate = getFieldsForStep(currentStepId);

        // @ts-ignore
        const isValid = await form.trigger(fieldsToValidate);

        if (isValid) {
            const currentData = form.getValues();
            const disqualification = checkEligibility(currentData);

            if (disqualification) {
                setDisqualifiedReason(disqualification);
                return;
            }

            if (!completedSteps.includes(activeStep)) {
                setCompletedSteps([...completedSteps, activeStep]);
            }
            saveDraft();
            setActiveStep(activeStep + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            toast.error("Please fill in all required fields.");
            // Log errors for debugging
            console.log("Validation errors:", form.formState.errors);
        }
    };

    const goToPreviousStep = () => {
        if (activeStep > 0) {
            saveDraft();
            setActiveStep(activeStep - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleManualSave = () => {
        saveDraft();
        toast.success("Draft saved!");
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
    };

    const handleSubmitSuccess = () => {
        router.push("/apply/success");
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SpinnerIcon className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
        );
    }

    const renderStep = () => {
        switch (STEPS[activeStep].id) {
            case "applicant":
                return <ApplicantDetailsForm form={form} />;
            case "business":
                return <BusinessEligibilityForm form={form} />;
            case "businessModel":
                return <FoundationBusinessModelForm form={form} />;
            case "commercial":
                return <FoundationCommercialViabilityForm form={form} />;
            case "market":
                return <FoundationMarketPotentialForm form={form} />;
            case "social":
                return <FoundationSocialImpactForm form={form} />;
            case "declaration":
                return <DeclarationForm form={form} />;
            case "review":
                return (
                    <ReviewSubmitSection
                        form={form}
                        track="foundation"
                        onSuccess={handleSubmitSuccess}
                        onClearDraft={clearDraft}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-blue/5">
            {/* Disqualification Modal */}
            <AlertDialog open={!!disqualifiedReason} onOpenChange={(open) => !open && setDisqualifiedReason(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <WarningCircleIcon className="w-6 h-6" />
                            Not Eligible
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pt-2 text-slate-700 text-base">
                            {disqualifiedReason}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => router.push("/")}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            Return Home
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/")}
                                className="text-slate-600"
                            >
                                <HouseIcon className="w-4 h-4 mr-2" />
                                Home
                            </Button>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">
                                    Foundation Track
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Step {activeStep + 1} of {STEPS.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {lastSaved && (
                                <span className="text-xs text-slate-900 hidden md:block">
                                    Last saved: {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualSave}
                                disabled={isAutoSaving}
                                className="border-brand-blue text-gray-900 hover:bg-brand-blue/5"
                            >
                                <FloppyDiskIcon className={cn("w-4 h-4 mr-2", isAutoSaving && "animate-spin")} />
                                Save
                            </Button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar - Steps */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-32 space-y-2">
                            {STEPS.map((step, index) => {
                                const isActive = index === activeStep;
                                const isCompleted = completedSteps.includes(index);
                                const maxAccessibleStep = Math.max(-1, ...completedSteps) + 1;
                                const isAccessible = index <= maxAccessibleStep;

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => {
                                            if (isAccessible) {
                                                saveDraft();
                                                setActiveStep(index);
                                            } else {
                                                toast.error("Complete previous steps first");
                                            }
                                        }}
                                        disabled={!isAccessible}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                                                : isCompleted
                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                    : isAccessible
                                                        ? "bg-slate-50 hover:bg-slate-100 text-slate-600"
                                                        : "bg-slate-50/50 text-slate-300 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                                                    isActive
                                                        ? "bg-white/20"
                                                        : isCompleted
                                                            ? "bg-green-100"
                                                            : isAccessible
                                                                ? "bg-slate-200"
                                                                : "bg-slate-100 text-slate-300"
                                                )}
                                            >
                                                {isCompleted ? (
                                                    <CheckIcon className="w-4 h-4" weight="bold" />
                                                ) : (
                                                    <step.icon className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{step.shortLabel}</div>
                                                <div className="hidden xl:block text-xs opacity-70">
                                                    {step.description}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Main Form Area */}
                    <main className="lg:col-span-3">
                        <Form {...form}>
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeStep}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {renderStep()}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={goToPreviousStep}
                                        disabled={activeStep === 0}
                                        className="gap-2"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" />
                                        Previous
                                    </Button>

                                    {activeStep < STEPS.length - 1 ? (
                                        <Button
                                            type="button"
                                            onClick={goToNextStep}
                                            className="bg-brand-blue hover:bg-brand-blue-dark text-white gap-2"
                                        >
                                            Next
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </Button>
                                    ) : null}
                                </div>
                            </form>
                        </Form>
                    </main>
                </div>
            </div>
        </div>
    );
}
