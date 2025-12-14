"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    ApplicationTrack,
    EligibilityStatus,
    ScreeningFormData,
    EligibilityResult
} from "@/lib/types/application";
import {
    BuildingsIcon,
    ArrowRightIcon,
    WarningIcon,
    CheckCircleIcon,
    XCircleIcon,
    CurrencyDollarIcon,
    UsersIcon,
    BriefcaseIcon,
    ScrollIcon,
    ClockIcon,
    ChartLineUpIcon
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function EligibilityScreening() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<ScreeningFormData>>({});
    const [result, setResult] = useState<EligibilityResult | null>(null);

    const updateFormData = (key: keyof ScreeningFormData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const calculateEligibility = (): EligibilityResult => {
        const reasons: string[] = [];

        // 1. Registration Check
        if (formData.registeredInKenya === 'no' || formData.businessType === 'unregistered') {
            reasons.push("Business must be registered in Kenya to participate.");
            return { status: EligibilityStatus.DISQUALIFIED, reasons };
        }

        // 2. Operational Years Check - Removed as filter, just data collection now
        // No longer disqualifies applicants based on years of operation

        // 3. Financial Records Check
        if (formData.hasFinancialRecords === 'no') {
            reasons.push("We require at least 1 year of financial records (e.g. books, bank/M-PESA statements).");
            return { status: EligibilityStatus.DISQUALIFIED, reasons };
        }

        // 4. Revenue Check - Low revenue goes to Observation Track (data collection)
        if (formData.annualRevenue === 'less_than_500k') {
            return { status: EligibilityStatus.ELIGIBLE, track: ApplicationTrack.OBSERVATION };
        }

        // --- ELIGIBLE: DETERMINE TRACK ---

        // Acceleration Track Criteria
        if (
            formData.yearsInOperation === 'more_than_2' &&
            formData.annualRevenue === 'more_than_3m' &&
            (formData.employees === '5_to_20' || formData.employees === 'more_than_20') &&
            formData.hasAuditedAccounts === 'yes'
        ) {
            return { status: EligibilityStatus.ELIGIBLE, track: ApplicationTrack.ACCELERATION };
        }

        // Foundation Track
        return { status: EligibilityStatus.ELIGIBLE, track: ApplicationTrack.FOUNDATION };
    };

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            const eligibility = calculateEligibility();
            setResult(eligibility);
        }
    };

    const handleProceed = () => {
        if (result?.track) {
            // OBSERVATION track uses foundation form but passes flag to mark it as observation-only
            if (result.track === ApplicationTrack.ACCELERATION) {
                router.push("/apply/acceleration");
            } else if (result.track === ApplicationTrack.OBSERVATION) {
                router.push("/apply/foundation?observation=true"); // Flag for observation
            } else {
                router.push("/apply/foundation");
            }
        }
    };

    if (result) {
        return (
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-2xl overflow-hidden p-8 md:p-12 text-center"
                >
                    {result.status === EligibilityStatus.ELIGIBLE ? (
                        <>
                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-slow">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" weight="fill" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">You&#39;re Eligible!</h2>
                            <p className="text-slate-500 mb-8 max-w-lg mx-auto text-lg">
                                We&#39;ve matched you to a specialized support track based on your business stage.
                            </p>

                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 mb-8 text-left relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    {result.track === ApplicationTrack.ACCELERATION ? <ChartLineUpIcon size={120} /> : <BuildingsIcon size={120} />}
                                </div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold uppercase tracking-wider mb-3">
                                    Recommended Track
                                </span>
                                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                                    {result.track === ApplicationTrack.ACCELERATION
                                        ? "Acceleration Track"
                                        : "Foundation Track"}
                                </h3>
                                <p className="text-slate-600 text-lg">
                                    {result.track === ApplicationTrack.ACCELERATION
                                        ? "Designed for scaling businesses ready for rapid growth and investment readiness."
                                        : "Tailored for early-stage businesses building robust operational foundations."}
                                </p>
                            </div>

                            <Button onClick={handleProceed} className="w-full h-14 rounded-full text-lg bg-brand-blue hover:bg-brand-blue-dark text-white shadow-xl hover:shadow-2xl hover:shadow-brand-blue/30 transition-all duration-300">
                                Start Application <ArrowRightIcon className="ml-2 w-5 h-5" weight="bold" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                <XCircleIcon className="w-12 h-12 text-red-600" weight="fill" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Not Eligible</h2>
                            <p className="text-slate-500 mb-8 text-lg">
                                Your business doesn&#39;t meet the current program criteria.
                            </p>

                            <div className="bg-red-50/50 text-left rounded-2xl p-6 mb-8 space-y-4">
                                {result.reasons?.map((reason, idx) => (
                                    <div key={idx} className="flex items-start gap-4 text-red-700">
                                        <WarningIcon className="w-6 h-6 flex-shrink-0 mt-0.5" weight="bold" />
                                        <span className="font-medium">{reason}</span>
                                    </div>
                                ))}
                            </div>

                            <Button variant="outline" onClick={() => window.location.reload()} className="w-full h-12 rounded-full border-slate-200">
                                Restart Screening
                            </Button>
                        </>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Progress Dots */}
            <div className="flex justify-center mb-12 gap-3">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={cn(
                            "h-2 rounded-full transition-all duration-500",
                            step >= s ? "w-12 bg-brand-blue" : "w-2 bg-slate-200"
                        )}
                    />
                ))}
            </div>

            <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-12"
            >
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {step === 1 && "Legal & Structure"}
                        {step === 2 && "Operations & Team"}
                        {step === 3 && "Financial Health"}
                    </h2>
                    <p className="text-lg text-slate-500">
                        {step === 1 && "First, verify your business registration status."}
                        {step === 2 && "Tell us about your operational history and size."}
                        {step === 3 && "Finally, let's look at your financial maturity."}
                    </p>
                </div>

                <div className="space-y-8">
                    {step === 1 && (
                        <>
                            <QuestionSection title="Is your business registered in Kenya?">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectionCard
                                        icon={<CheckCircleIcon size={32} weight="fill" className="text-brand-blue" />}
                                        label="Yes, Registered"
                                        subLabel="I have a Certificate"
                                        selected={formData.registeredInKenya === 'yes'}
                                        onClick={() => updateFormData('registeredInKenya', 'yes')}
                                    />
                                    <SelectionCard
                                        icon={<XCircleIcon size={32} weight="fill" className="text-slate-400" />}
                                        label="No, Not Yet"
                                        subLabel="Still informal"
                                        selected={formData.registeredInKenya === 'no'}
                                        onClick={() => updateFormData('registeredInKenya', 'no')}
                                    />
                                </div>
                            </QuestionSection>

                            {formData.registeredInKenya === 'yes' && (
                                <QuestionSection title="What is your registration type?">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['limited', 'partnership', 'cooperative', 'cbo', 'sole'].map((type) => (
                                            <SelectionPill
                                                key={type}
                                                label={type.replace('_', ' ')}
                                                selected={formData.businessType === type}
                                                onClick={() => updateFormData('businessType', type as any)}
                                            />
                                        ))}
                                    </div>
                                </QuestionSection>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <QuestionSection title="Years of Operation">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SelectionCard
                                        icon={<ClockIcon size={28} weight="duotone" className="text-brand-blue" />}
                                        label="< 1 Year"
                                        selected={formData.yearsInOperation === 'less_than_1'}
                                        onClick={() => updateFormData('yearsInOperation', 'less_than_1')}
                                    />
                                    <SelectionCard
                                        icon={<ClockIcon size={28} weight="duotone" className="text-purple-500" />}
                                        label="1 - 2 Years"
                                        selected={formData.yearsInOperation === '1_to_2'}
                                        onClick={() => updateFormData('yearsInOperation', '1_to_2')}
                                    />
                                    <SelectionCard
                                        icon={<ClockIcon size={28} weight="duotone" className="text-green-500" />}
                                        label="> 2 Years"
                                        selected={formData.yearsInOperation === 'more_than_2'}
                                        onClick={() => updateFormData('yearsInOperation', 'more_than_2')}
                                    />
                                </div>
                            </QuestionSection>

                            <QuestionSection title="Full-Time Employees">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SelectionCard
                                        icon={<UsersIcon size={28} weight="duotone" className="text-brand-blue" />}
                                        label="1 - 4"
                                        subLabel="Micro Team"
                                        selected={formData.employees === '1_to_4'}
                                        onClick={() => updateFormData('employees', '1_to_4')}
                                    />
                                    <SelectionCard
                                        icon={<UsersIcon size={28} weight="duotone" className="text-purple-500" />}
                                        label="5 - 20"
                                        subLabel="Small Team"
                                        selected={formData.employees === '5_to_20'}
                                        onClick={() => updateFormData('employees', '5_to_20')}
                                    />
                                    <SelectionCard
                                        icon={<UsersIcon size={28} weight="duotone" className="text-green-500" />}
                                        label="20+"
                                        subLabel="Medium Team"
                                        selected={formData.employees === 'more_than_20'}
                                        onClick={() => updateFormData('employees', 'more_than_20')}
                                    />
                                </div>
                            </QuestionSection>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <QuestionSection title="Annual Revenue (Last Financial Year)">
                                <div className="grid grid-cols-1 gap-3">
                                    <SelectionCard
                                        icon={<CurrencyDollarIcon size={28} weight="duotone" className="text-slate-500" />}
                                        label="Below KES 500k"
                                        selected={formData.annualRevenue === 'less_than_500k'}
                                        onClick={() => updateFormData('annualRevenue', 'less_than_500k')}
                                        horizontal
                                    />
                                    <SelectionCard
                                        icon={<CurrencyDollarIcon size={28} weight="duotone" className="text-brand-blue" />}
                                        label="KES 500k - 3M"
                                        selected={formData.annualRevenue === '500k_to_3m'}
                                        onClick={() => updateFormData('annualRevenue', '500k_to_3m')}
                                        horizontal
                                    />
                                    <SelectionCard
                                        icon={<CurrencyDollarIcon size={28} weight="duotone" className="text-green-500" />}
                                        label="Above KES 3M"
                                        selected={formData.annualRevenue === 'more_than_3m'}
                                        onClick={() => updateFormData('annualRevenue', 'more_than_3m')}
                                        horizontal
                                    />
                                </div>
                            </QuestionSection>

                            <QuestionSection title="Financial Records">
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectionCard
                                        icon={<ScrollIcon size={28} weight="duotone" className="text-brand-blue" />}
                                        label="Yes"
                                        subLabel="I have records"
                                        selected={formData.hasFinancialRecords === 'yes'}
                                        onClick={() => updateFormData('hasFinancialRecords', 'yes')}
                                    />
                                    <SelectionCard
                                        icon={<XCircleIcon size={28} weight="duotone" className="text-slate-400" />}
                                        label="No"
                                        subLabel="No records yet"
                                        selected={formData.hasFinancialRecords === 'no'}
                                        onClick={() => updateFormData('hasFinancialRecords', 'no')}
                                    />
                                </div>
                            </QuestionSection>

                            <QuestionSection title="Audited Accounts?">
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectionCard
                                        icon={<BriefcaseIcon size={28} weight="duotone" className="text-brand-blue" />}
                                        label="Yes"
                                        subLabel="Audited by CPA"
                                        selected={formData.hasAuditedAccounts === 'yes'}
                                        onClick={() => updateFormData('hasAuditedAccounts', 'yes')}
                                    />
                                    <SelectionCard
                                        icon={<XCircleIcon size={28} weight="duotone" className="text-slate-400" />}
                                        label="No"
                                        subLabel="Not audited"
                                        selected={formData.hasAuditedAccounts === 'no'}
                                        onClick={() => updateFormData('hasAuditedAccounts', 'no')}
                                    />
                                </div>
                            </QuestionSection>
                        </>
                    )}
                </div>

                <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full px-6"
                    >
                        Back
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={
                            (step === 1 && (!formData.registeredInKenya || (formData.registeredInKenya === 'yes' && !formData.businessType))) ||
                            (step === 2 && (!formData.yearsInOperation || !formData.employees)) ||
                            (step === 3 && (!formData.annualRevenue || !formData.hasFinancialRecords || !formData.hasAuditedAccounts))
                        }
                        className="bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full px-8 h-12 shadow-lg hover:shadow-xl hover:shadow-brand-blue/30 transition-all"
                    >
                        {step === 3 ? "Check Eligibility" : "Continue"}
                    </Button>
                </div>

            </motion.div>
        </div>
    );
}

// --- MICRO COMPONENTS ---

function QuestionSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {children}
        </div>
    );
}

function SelectionCard({
    icon,
    label,
    subLabel,
    selected,
    onClick,
    horizontal = false
}: {
    icon: React.ReactNode,
    label: string,
    subLabel?: string,
    selected: boolean,
    onClick: () => void,
    horizontal?: boolean
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group hover:shadow-md",
                horizontal ? "flex items-center gap-4 p-4" : "flex flex-col items-center justify-center p-6 text-center gap-3",
                selected
                    ? "bg-brand-blue/5 border-brand-blue shadow-sm"
                    : "bg-white border-slate-100 hover:border-slate-200"
            )}
        >
            <div className={cn("transition-transform duration-300 group-hover:scale-110", selected ? "scale-110" : "")}>
                {icon}
            </div>
            <div className={horizontal ? "text-left" : ""}>
                <div className={cn("font-bold transition-colors", selected ? "text-brand-blue" : "text-slate-700")}>{label}</div>
                {subLabel && <div className="text-xs text-slate-400 font-medium mt-1">{subLabel}</div>}
            </div>

            {selected && (
                <div className="absolute top-3 right-3 text-brand-blue animate-in fade-in zoom-in">
                    <CheckCircleIcon weight="fill" size={20} />
                </div>
            )}
        </div>
    );
}

function SelectionPill({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-all capitalize",
                selected
                    ? "bg-brand-blue border-brand-blue text-white shadow-lg"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
        >
            {label}
        </div>
    );
}
