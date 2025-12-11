"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    CheckCircleIcon,
    WarningIcon,
    UserIcon,
    BuildingsIcon,
    CurrencyDollarIcon,
    LeafIcon,
    ChartLineUpIcon,
    FileTextIcon,
    PaperPlaneTiltIcon,
    CaretDownIcon,
    CaretUpIcon,
    SpinnerIcon,
    DownloadIcon,
    HandshakeIcon,
} from "@phosphor-icons/react";
import { generateBireApplicationDocx } from "@/lib/bire-docx-generator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    submitFoundationApplication,
    submitAccelerationApplication,
} from "@/lib/actions";
import type {
    FoundationApplicationFormData,
    AccelerationApplicationFormData,
} from "../schemas/bire-application-schema";

// =============================================================================
// TYPES
// =============================================================================

type Track = "foundation" | "acceleration";

interface ReviewSubmitSectionProps<T extends FoundationApplicationFormData | AccelerationApplicationFormData> {
    form: UseFormReturn<T>;
    track: Track;
    onSuccess?: () => void;
    onClearDraft?: () => void;
}

interface SectionConfig {
    id: string;
    label: string;
    icon: React.ElementType;
    fields: { key: string; label: string; formatter?: (value: unknown) => string }[];
}

// =============================================================================
// HELPERS
// =============================================================================

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    if (value instanceof Date) return value.toLocaleDateString();
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") {
        return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return String(value);
};

const formatCurrency = (value: unknown): string => {
    if (typeof value !== "number") return "—";
    return `KES ${value.toLocaleString()}`;
};

// =============================================================================
// SECTION CONFIGS
// =============================================================================

const FOUNDATION_SECTIONS: SectionConfig[] = [
    {
        id: "applicant",
        label: "Applicant Details",
        icon: UserIcon,
        fields: [
            { key: "applicant.firstName", label: "First Name" },
            { key: "applicant.lastName", label: "Last Name" },
            { key: "applicant.gender", label: "Gender" },
            { key: "applicant.email", label: "Email" },
            { key: "applicant.phoneNumber", label: "Phone" },
        ],
    },
    {
        id: "business",
        label: "Business Profile",
        icon: BuildingsIcon,
        fields: [
            { key: "business.name", label: "Business Name" },
            { key: "business.sector", label: "Sector" },
            { key: "business.county", label: "County" },
            { key: "business.city", label: "City / Town" },
            { key: "business.registrationType", label: "Registration" },
            { key: "business.yearsOperational", label: "Years Operational" },
        ],
    },
    {
        id: "commercial",
        label: "Commercial Viability",
        icon: CurrencyDollarIcon,
        fields: [
            { key: "commercialViability.revenueLastYear", label: "Revenue (Last Year)", formatter: formatCurrency },
            { key: "commercialViability.customerCount", label: "Customer Count" },
            { key: "commercialViability.hasExternalFunding", label: "External Funding" },
            { key: "commercialViability.digitizationLevel", label: "Uses Digital Tools?" },
        ],
    },
    {
        id: "market",
        label: "Market Potential",
        icon: ChartLineUpIcon,
        fields: [
            { key: "marketPotential.relativePricing", label: "Pricing Strategy" },
            { key: "marketPotential.productDifferentiation", label: "Product Differentiation" },
            { key: "marketPotential.threatOfSubstitutes", label: "Threat of Substitutes" },
            { key: "marketPotential.easeOfMarketEntry", label: "Entry Barriers" },
        ],
    },
    {
        id: "social",
        label: "Social Impact",
        icon: LeafIcon,
        fields: [
            { key: "socialImpact.environmentalImpact", label: "Environmental Impact" },
            { key: "socialImpact.fullTimeEmployeesTotal", label: "Total Employees" },
            { key: "socialImpact.businessCompliance", label: "Compliance Status" },
        ],
    },
    {
        id: "declaration",
        label: "Declaration",
        icon: HandshakeIcon,
        fields: [
            { key: "declaration.hasSocialSafeguarding", label: "Social Safeguarding" },
            { key: "declaration.confirmTruth", label: "Verified Truth" },
            { key: "declaration.declarationName", label: "Signed By" },
            { key: "declaration.declarationDate", label: "Date" },
        ],
    },
];

const ACCELERATION_SECTIONS: SectionConfig[] = [
    {
        id: "applicant",
        label: "Applicant Details",
        icon: UserIcon,
        fields: [
            { key: "applicant.firstName", label: "First Name" },
            { key: "applicant.lastName", label: "Last Name" },
            { key: "applicant.gender", label: "Gender" },
            { key: "applicant.email", label: "Email" },
            { key: "applicant.phoneNumber", label: "Phone" },
        ],
    },
    {
        id: "business",
        label: "Business Profile",
        icon: BuildingsIcon,
        fields: [
            { key: "business.name", label: "Business Name" },
            { key: "business.sector", label: "Sector" },
            { key: "business.county", label: "County" },
            { key: "business.city", label: "City / Town" },
            { key: "business.registrationType", label: "Registration" },
            { key: "business.yearsOperational", label: "Years Operational" },
        ],
    },
    {
        id: "revenues",
        label: "Revenue & Growth (Sec B)",
        icon: CurrencyDollarIcon,
        fields: [
            { key: "revenues.revenueLastYear", label: "Revenue (Last Year)", formatter: formatCurrency },
            { key: "revenues.averageAnnualRevenueGrowth", label: "Avg Annual Growth" },
            { key: "revenues.futureSalesGrowth", label: "Projected Growth" },
            { key: "revenues.hasExternalFunding", label: "External Funding" },
        ],
    },
    {
        id: "impactPotential",
        label: "Impact Potential (Sec C)",
        icon: ChartLineUpIcon,
        fields: [
            { key: "impactPotential.fullTimeEmployeesTotal", label: "Current Employees" },
            { key: "impactPotential.jobCreationPotential", label: "Job Creation Potential" },
            { key: "impactPotential.projectedInclusion", label: "Projected Inclusion" },
        ],
    },
    {
        id: "scalability",
        label: "Scalability (Sec D)",
        icon: ChartLineUpIcon,
        fields: [
            { key: "scalability.scalabilityPlan", label: "Scalability Plan" },
            { key: "scalability.marketScalePotential", label: "Market Scale Potential" },
            { key: "scalability.marketDifferentiation", label: "Differentiation" },
        ],
    },
    {
        id: "socialImpact",
        label: "Social & Env Impact (Sec E)",
        icon: LeafIcon,
        fields: [
            { key: "socialImpact.socialImpactContribution", label: "Social Contribution" },
            { key: "socialImpact.environmentalImpact", label: "Environmental Impact" },
        ],
    },
    {
        id: "businessModel",
        label: "Business Model (Sec F)",
        icon: BuildingsIcon,
        fields: [
            { key: "businessModel.businessModelUniqueness", label: "Model Innovation" },
            { key: "businessModel.customerValueProposition", label: "Value Proposition" },
        ],
    },
    {
        id: "declaration",
        label: "Declaration",
        icon: HandshakeIcon,
        fields: [
            { key: "declaration.hasSocialSafeguarding", label: "Social Safeguarding" },
            { key: "declaration.confirmTruth", label: "Verified Truth" },
            { key: "declaration.declarationName", label: "Signed By" },
            { key: "declaration.declarationDate", label: "Date" },
        ],
    },
];

// =============================================================================
// COMPONENT
// =============================================================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc: unknown, key: string) => {
        if (acc && typeof acc === "object" && key in acc) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

export function ReviewSubmitSection<T extends FoundationApplicationFormData | AccelerationApplicationFormData>({
    form,
    track,
    onSuccess,
    onClearDraft,
}: ReviewSubmitSectionProps<T>) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(["applicant"]);

    const sections = track === "foundation" ? FOUNDATION_SECTIONS : ACCELERATION_SECTIONS;
    const formValues = form.getValues() as Record<string, unknown>;

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const data = form.getValues();
            const applicantData = data as { applicant?: { firstName?: string; lastName?: string } };
            const applicantName = `${applicantData.applicant?.firstName || "Unknown"} ${applicantData.applicant?.lastName || "Applicant"}`;

            await generateBireApplicationDocx({
                formData: data as FoundationApplicationFormData | AccelerationApplicationFormData,
                track,
                applicantName,
            });

            toast.success("Application downloaded successfully!", {
                description: "Your application has been saved as a DOCX file.",
            });
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download application. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmit = async () => {
        if (!termsAccepted || !privacyAccepted) {
            toast.error("Please accept the terms and privacy policy to continue");
            return;
        }

        setIsSubmitting(true);

        try {
            const data = form.getValues();

            let response;
            if (track === "foundation") {
                response = await submitFoundationApplication(data as FoundationApplicationFormData);
            } else {
                response = await submitAccelerationApplication(data as AccelerationApplicationFormData);
            }

            if (!response.success) {
                toast.error(response.error || "Submission failed. Please try again.");
                setIsSubmitting(false);
                return;
            }

            if (onClearDraft) {
                onClearDraft();
            }

            toast.success("Application submitted successfully!", {
                description: "You will receive a confirmation email shortly.",
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-brand-green to-brand-blue text-white mb-4">
                    <FileTextIcon className="w-6 h-6" weight="duotone" />
                    <h2 className="text-xl font-bold">Review Your Application</h2>
                </div>
                <p className="text-slate-600 max-w-xl mx-auto">
                    Please review all information carefully before submitting.
                </p>
            </div>

            {/* Sections Review */}
            <div className="space-y-4">
                {sections.map((section) => {
                    const isExpanded = expandedSections.includes(section.id);
                    const Icon = section.icon;

                    return (
                        <Collapsible
                            key={section.id}
                            open={isExpanded}
                            onOpenChange={() => toggleSection(section.id)}
                        >
                            <motion.div
                                initial={false}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                            >
                                <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-brand-blue" weight="duotone" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-slate-900">{section.label}</h3>
                                                <p className="text-xs text-slate-500">{section.fields.length} fields</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircleIcon className="w-5 h-5 text-green-500" weight="fill" />
                                            {isExpanded ? (
                                                <CaretUpIcon className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <CaretDownIcon className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="px-4 pb-4 border-t border-slate-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                            {section.fields.map((field) => {
                                                const value = getNestedValue(formValues, field.key);
                                                const displayValue = field.formatter
                                                    ? field.formatter(value)
                                                    : formatValue(value);

                                                return (
                                                    <div key={field.key} className="space-y-1">
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                            {field.label}
                                                        </p>
                                                        <p className="text-sm text-slate-900 font-medium">
                                                            {displayValue}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </motion.div>
                        </Collapsible>
                    );
                })}
            </div>

            {/* Terms & Conditions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-700">
                    <WarningIcon className="w-5 h-5" weight="fill" />
                    <h3 className="font-semibold">Terms & Conditions</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                            className="mt-1 h-5 w-5 border-2 border-slate-400 data-[state=checked]:bg-brand-blue data-[state=checked]:border-brand-blue transition-all shrink-0"
                        />
                        <Label htmlFor="terms" className="text-base text-slate-700 cursor-pointer group-hover:text-slate-900 transition-colors flex-1 leading-relaxed">
                            I confirm that all information provided is accurate and complete, and I agree to use the grant funds solely for the business purpose stated. Read our{" "}
                            <Link href="/terms-and-privacy" target="_blank" className="text-brand-blue underline hover:text-brand-blue-dark inline-block">
                                Terms & Privacy Policy
                            </Link>.
                        </Label>
                    </div>

                    <div className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                            id="privacy"
                            checked={privacyAccepted}
                            onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                            className="mt-1 h-5 w-5 border-2 border-slate-400 data-[state=checked]:bg-brand-blue data-[state=checked]:border-brand-blue transition-all shrink-0"
                        />
                        <Label htmlFor="privacy" className="text-base text-slate-700 cursor-pointer group-hover:text-slate-900 transition-colors flex-1 leading-relaxed">
                            I agree to the{" "}
                            <Link href="/terms-and-privacy" target="_blank" className="text-brand-blue underline hover:text-brand-blue-dark inline-block">
                                BIRE Project Privacy Policy
                            </Link>{" "}
                            and allow Hand in Hand Eastern Africa to process my data for the purpose of this application.
                        </Label>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Download Button */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="gap-2 px-6 py-6 text-lg font-semibold rounded-xl border-2 border-brand-blue text-brand-blue"
                >
                    {isDownloading ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 animate-spin" />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <DownloadIcon className="w-5 h-5" weight="fill" />
                            Download Application
                        </>
                    )}
                </Button>

                {/* Submit Button */}
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !termsAccepted || !privacyAccepted}
                    className={cn(
                        "gap-2 px-8 py-6 text-lg font-semibold rounded-xl transition-all",
                        termsAccepted && privacyAccepted
                            ? "bg-gradient-to-r from-brand-green to-brand-green-dark hover:shadow-lg hover:shadow-brand-green/20"
                            : "bg-slate-300 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <PaperPlaneTiltIcon className="w-5 h-5" weight="fill" />
                            Submit Application
                        </>
                    )}
                </Button>
            </div>

            {/* Track Badge */}
            <div className="text-center">
                <span
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                        track === "foundation"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                    )}
                >
                    {track === "foundation" ? "Foundation Track" : "Acceleration Track"}
                </span>
            </div>
        </div>
    );
}
