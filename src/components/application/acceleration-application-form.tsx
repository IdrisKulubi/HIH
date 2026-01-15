"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
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
    ChartLineUpIcon,
    UsersIcon,
    RocketLaunchIcon,
    PlantIcon,
    LightbulbIcon,
    ClipboardTextIcon,
    HandshakeIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";

import { cn } from "@/lib/utils";

// Form sections
import { ApplicantDetailsForm } from "./forms/applicant-details-form";
import { BusinessEligibilityForm } from "./forms/business-eligibility-form";
import { AccelerationRevenuesForm } from "./forms/acceleration-revenues-form";
import { AccelerationImpactForm, AccelerationScalabilityForm } from "./forms/acceleration-impact-scalability-form";
import { AccelerationSocialImpactForm, AccelerationBusinessModelForm } from "./forms/acceleration-social-model-form";
import { DeclarationForm } from "./forms/declaration-form";
import { ReviewSubmitSection } from "./forms/review-submit-section";

// Schema
import {
    accelerationApplicationSchema,
    AccelerationApplicationFormData,
    defaultApplicant,
    defaultBusinessEligibility,
} from "./schemas/bire-application-schema";

const DRAFT_KEY = "bire_acceleration_draft";

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
        id: "revenues",
        label: "Revenue & Growth",
        shortLabel: "Revenues",
        icon: ChartLineUpIcon,
        description: "Financial performance",
    },
    {
        id: "impact",
        label: "Impact Potential",
        shortLabel: "Impact",
        icon: UsersIcon,
        description: "Job creation potential",
    },
    {
        id: "scalability",
        label: "Scalability",
        shortLabel: "Scalability",
        icon: RocketLaunchIcon,
        description: "Growth potential",
    },
    {
        id: "social",
        label: "Social Impact",
        shortLabel: "Social",
        icon: PlantIcon,
        description: "Environmental & social",
    },
    {
        id: "businessModel",
        label: "Business Model",
        shortLabel: "Model",
        icon: LightbulbIcon,
        description: "Model innovation",
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

export function AccelerationApplicationForm() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const form = useForm<AccelerationApplicationFormData>({
        resolver: zodResolver(accelerationApplicationSchema) as any,
        defaultValues: {
            applicant: defaultApplicant,
            business: defaultBusinessEligibility as AccelerationApplicationFormData["business"],
            revenues: {
                revenueLastYear: 0,
                yearsOperational: 0,
                growthHistory: "", // Added
                averageAnnualRevenueGrowth: undefined, // Added
                futureSalesGrowth: undefined,
                hasExternalFunding: false,
                externalFundingDetails: "",
            },
            impactPotential: {
                fullTimeEmployeesTotal: 0,
                jobCreationPotential: undefined,
                projectedInclusion: undefined, // Added
            },
            scalability: {
                // D1-D4 new fields
                marketDifferentiation: undefined,
                marketDifferentiationDescription: "",
                competitiveAdvantage: undefined,
                competitiveAdvantageSource: "",
                technologyIntegration: undefined,
                technologyIntegrationDescription: "",
                salesMarketingIntegration: undefined,
                salesMarketingApproach: "",
                // Legacy fields
                scalabilityPlan: undefined,
                marketScalePotential: undefined,
            },
            socialImpact: {
                socialImpactContribution: undefined,
                socialImpactContributionDescription: "",
                supplierInvolvement: undefined,
                supplierSupportDescription: "",
                environmentalImpact: undefined,
                environmentalImpactDescription: "",
            },
            businessModel: {
                businessModelUniqueness: undefined,
                customerValueProposition: undefined,
                competitiveAdvantageStrength: undefined,
            },
            declaration: {
                hasSocialSafeguarding: false,
                confirmTruth: false,
                declarationName: "",
                declarationDate: new Date(),
            },
            documents: {},
        } as DefaultValues<AccelerationApplicationFormData>,
        mode: "onChange",
    });

    // Load draft on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                // Handle date reconstruction
                if (parsed.data?.declaration?.declarationDate) {
                    parsed.data.declaration.declarationDate = new Date(parsed.data.declaration.declarationDate);
                }
                if (parsed.data?.applicant?.dob) {
                    parsed.data.applicant.dob = new Date(parsed.data.applicant.dob);
                }

                form.reset(parsed.data);

                const savedStep = parsed.step || 0;
                setActiveStep(savedStep < STEPS.length ? savedStep : 0);

                setCompletedSteps(parsed.completedSteps || []);
                toast.info("Draft loaded", { description: "Your previous progress has been restored." });
            } catch (e) {
                console.error("Failed to load draft:", e);
                localStorage.removeItem(DRAFT_KEY);
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
            router.push("/login?callbackUrl=/apply/acceleration");
        }
    }, [status, router]);

    const progress = ((activeStep + 1) / STEPS.length) * 100;

    // Get fields to validate for current step
    const getFieldsForStep = (stepId: string): any[] => {
        switch (stepId) {
            case "applicant": return ["applicant"];
            case "business": return ["business"];
            case "revenues": return ["revenues"];
            case "impact": return ["impactPotential"];
            case "scalability": return ["scalability"];
            case "social": return ["socialImpact"];
            case "businessModel": return ["businessModel"];
            case "declaration": return ["declaration"];
            default: return [];
        }
    };

    const checkEligibility = (data: AccelerationApplicationFormData) => {
        // 1. Age Check (18-35)
        if (activeStep === 0) { // Applicant
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

        // 2. Business Check
        if (activeStep === 1) { // Business
            // Explicitly require registration for Acceleration
            if (!data.business.isRegistered) {
                return "Your business must be officially registered to be eligible for the Acceleration Track.";
            }
            if (data.business.country?.toLowerCase() !== "kenya") {
                return "This program is currently open only to businesses based in Kenya.";
            }
        }

        // 3. Revenue Check
        if (activeStep === 2) { // Revenues
            if (data.revenues.revenueLastYear <= 3000000) {
                return "Your annual revenue must be above KES 3 Million to qualify for the Acceleration Track. Consider applying for the Foundation Track.";
            }
        }

        return null;
    };

    const goToNextStep = async () => {
        if (activeStep < STEPS.length - 1) {
            const currentStepId = STEPS[activeStep].id;
            const fieldsToValidate = getFieldsForStep(currentStepId);

            // @ts-ignore
            const isValid = await form.trigger(fieldsToValidate);

            if (isValid) {
                const currentData = form.getValues();
                const disqualification = checkEligibility(currentData);

                if (disqualification) {
                    // Show toast with the issue instead of blocking dialog
                    toast.error("Eligibility Issue", {
                        description: disqualification,
                        duration: 8000,
                    });
                    return;
                }

                if (!completedSteps.includes(activeStep)) {
                    setCompletedSteps([...completedSteps, activeStep]);
                }
                saveDraft();
                setActiveStep(activeStep + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                toast.error("Please fill in all required fields before proceeding.");
                console.log("Validation errors:", form.formState.errors);
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
                return <BusinessEligibilityForm form={form} track="acceleration" />;
            case "revenues":
                return <AccelerationRevenuesForm form={form} />;
            case "impact":
                return <AccelerationImpactForm form={form} />;
            case "scalability":
                return <AccelerationScalabilityForm form={form} />;
            case "social":
                return <AccelerationSocialImpactForm form={form} />;
            case "businessModel":
                return <AccelerationBusinessModelForm form={form} />;
            case "declaration":
                return <DeclarationForm form={form} />;
            case "review":
                return (
                    <ReviewSubmitSection
                        form={form}
                        track="acceleration"
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
                                    Acceleration Track
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

                                    {/* WhatsApp Help Button */}
                                    <a
                                        href="https://wa.me/254116027118?text=Hi,%20I%20need%20help%20with%20my%20BIRE%20Acceleration%20application"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        <span className="hidden md:inline">Need Help?</span>
                                    </a>

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
