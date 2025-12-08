"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
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
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Form sections
import { ApplicantDetailsForm } from "./forms/applicant-details-form";
import { BusinessEligibilityForm } from "./forms/business-eligibility-form";
import { FoundationCommercialViabilityForm, FoundationBusinessModelForm } from "./forms/foundation-commercial-form";
import { FoundationMarketPotentialForm } from "./forms/foundation-market-form";
import { FoundationSocialImpactForm } from "./forms/foundation-social-form";
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
        description: "Your personal information",
    },
    {
        id: "business",
        label: "Business Profile",
        shortLabel: "Business",
        icon: BuildingsIcon,
        description: "Business eligibility details",
    },
    {
        id: "commercial",
        label: "Commercial Viability",
        shortLabel: "Commercial",
        icon: CurrencyDollarIcon,
        description: "Revenue and customers (20 marks)",
    },
    {
        id: "businessModel",
        label: "Business Model",
        shortLabel: "Model",
        icon: LightbulbIcon,
        description: "Innovation level (10 marks)",
    },
    {
        id: "market",
        label: "Market Potential",
        shortLabel: "Market",
        icon: TargetIcon,
        description: "Market analysis (30 marks)",
    },
    {
        id: "social",
        label: "Social Impact",
        shortLabel: "Impact",
        icon: PlantIcon,
        description: "Environmental & social (40 marks)",
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

    const form = useForm<FoundationApplicationFormData>({
        resolver: zodResolver(foundationApplicationSchema),
        defaultValues: {
            applicant: defaultApplicant as FoundationApplicationFormData["applicant"],
            business: defaultBusinessEligibility as FoundationApplicationFormData["business"],
            commercialViability: {
                revenueLastYear: 0,
                customerCount: 0,
                hasExternalFunding: false,
                fundingDetails: "",
            },
            businessModel: {
                businessModelInnovation: undefined,
            },
            marketPotential: {
                relativePricing: undefined,
                productDifferentiation: undefined,
                threatOfSubstitutes: undefined,
                easeOfMarketEntry: undefined,
            },
            socialImpact: {
                environmentalImpact: undefined,
                environmentalExamples: "",
                specialGroupsEmployed: 0,
                businessCompliance: undefined,
            },
            documents: {},
        },
        mode: "onChange",
    });

    // Load draft on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                form.reset(parsed.data);
                setActiveStep(parsed.step || 0);
                setCompletedSteps(parsed.completedSteps || []);
                toast.info("Draft loaded", { description: "Your previous progress has been restored." });
            } catch (e) {
                console.error("Failed to load draft:", e);
            }
        }
    }, [form]);

    // Auto-save draft
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

    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(saveDraft, 30000);
        return () => clearInterval(interval);
    }, [saveDraft]);

    // Auth guard
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login?callbackUrl=/apply/foundation");
        }
    }, [status, router]);

    const progress = ((activeStep + 1) / STEPS.length) * 100;

    // Get fields to validate for current step
    const getFieldsForStep = (stepId: string): (keyof FoundationApplicationFormData)[] => {
        switch (stepId) {
            case "applicant":
                return ["applicant"];
            case "business":
                return ["business"];
            case "commercial":
                return ["commercialViability"];
            case "businessModel":
                return ["businessModel"];
            case "market":
                return ["marketPotential"];
            case "social":
                return ["socialImpact"];
            default:
                return [];
        }
    };

    const goToNextStep = async () => {
        if (activeStep < STEPS.length - 1) {
            // Validate fields for current step
            const currentStepId = STEPS[activeStep].id;
            const fieldsToValidate = getFieldsForStep(currentStepId);

            // @ts-ignore - path string access is valid for trigger but TS doesn't infer it perfectly with nested Zod schemas
            const isValid = await form.trigger(fieldsToValidate);

            if (isValid) {
                if (!completedSteps.includes(activeStep)) {
                    setCompletedSteps([...completedSteps, activeStep]);
                }
                saveDraft();
                setActiveStep(activeStep + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                toast.error("Please fill in all required fields before proceeding.");
            }
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
        toast.success("Draft saved!", { description: "Your progress has been saved." });
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
            case "commercial":
                return <FoundationCommercialViabilityForm form={form} />;
            case "businessModel":
                return <FoundationBusinessModelForm form={form} />;
            case "market":
                return <FoundationMarketPotentialForm form={form} />;
            case "social":
                return <FoundationSocialImpactForm form={form} />;
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
                                    🌱 Foundation Track Application
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
                                Save Draft
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

                                // Calculate if this step is reachable
                                // A step is reachable if:
                                // 1. It is the first step (index 0)
                                // 2. All previous steps have been completed (or at least touched sequentially)
                                // Simplified: Can navigate to any step <= max(completedSteps) + 1
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
                                                toast.error("Please complete previous steps first to unlock this section.");
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
                                                <div
                                                    className={cn(
                                                        "text-xs",
                                                        isActive ? "text-white/70" : isAccessible ? "text-slate-500" : "text-slate-300"
                                                    )}
                                                >
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
