"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    BuildingsIcon,
    MapPinIcon,
    CalendarIcon,
    FileTextIcon,
    UploadIcon,
    CheckCircleIcon,
} from "@phosphor-icons/react";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UploadButton } from "@/utils/uploadthing";
import { toast } from "sonner";

// Kenya counties list
const KENYA_COUNTIES = [
    "baringo", "bomet", "bungoma", "busia", "elgeyo_marakwet", "embu", "garissa", "homa_bay", "isiolo", "kajiado",
    "kakamega", "kericho", "kiambu", "kilifi", "kirinyaga", "kisii", "kisumu", "kitui", "kwale", "laikipia",
    "lamu", "machakos", "makueni", "mandera", "marsabit", "meru", "migori", "mombasa", "muranga", "nairobi",
    "nakuru", "nandi", "narok", "nyamira", "nyandarua", "nyeri", "samburu", "siaya", "taita_taveta", "tana_river",
    "tharaka_nithi", "trans_nzoia", "turkana", "uasin_gishu", "vihiga", "wajir", "west_pokot"
];

const SECTORS = [
    { value: "agriculture_and_agribusiness", label: "Agriculture & Agribusiness" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "renewable_energy", label: "Renewable Energy" },
    { value: "water_management", label: "Water Management" },
    { value: "waste_management", label: "Waste Management" },
    { value: "forestry", label: "Forestry" },
    { value: "tourism", label: "Tourism" },
    { value: "transport", label: "Transport" },
    { value: "construction", label: "Construction" },
    { value: "ict", label: "ICT" },
    { value: "trade", label: "Trade" },
    { value: "healthcare", label: "Healthcare" },
    { value: "education", label: "Education" },
    { value: "other", label: "Other" },
];

interface BusinessEligibilityFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function BusinessEligibilityForm({ form }: BusinessEligibilityFormProps) {
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isUploadingCert, setIsUploadingCert] = useState(false);
    const [isUploadingRecords, setIsUploadingRecords] = useState(false);
    const [isUploadingAudit, setIsUploadingAudit] = useState(false);

    const selectedSector = form.watch("business.sector");

    const inputClass = (fieldName: string) =>
        cn(
            "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200",
            focusedField === fieldName && "ring-2 ring-brand-blue/20 border-brand-blue"
        );

    const formatCountyName = (county: string) => {
        return county.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BuildingsIcon className="w-8 h-8 text-brand-blue" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION 1 — Business Profile</h2>
                <p className="text-slate-500 mt-2">Registration, legality, and operational details</p>
            </div>

            {/* Business Name */}
            <FormField
                control={form.control}
                name="business.name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <BuildingsIcon className="w-4 h-4 text-brand-blue" />
                            Business Name
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                placeholder="Enter your business name"
                                className={inputClass("name")}
                                onFocus={() => setFocusedField("name")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Location & Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="business.county"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-brand-blue" />
                                County of Business Operation:
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className={inputClass("county")}>
                                        <SelectValue placeholder="Select county" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[300px]">
                                    {KENYA_COUNTIES.map((county) => (
                                        <SelectItem key={county} value={county}>
                                            {formatCountyName(county)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="business.city"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-brand-blue" />
                                Town / City:
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="e.g. Nairobi, Mombasa, Kisumu"
                                    className={inputClass("city")}
                                    onFocus={() => setFocusedField("city")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="business.sector"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium">Sector/Valuechain:</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className={inputClass("sector")}>
                                        <SelectValue placeholder="Select your sector" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {SECTORS.map((sector) => (
                                        <SelectItem key={sector.value} value={sector.value}>
                                            {sector.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedSector === "other" && (
                    <FormField
                        control={form.control}
                        name="business.sectorOther"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium">Specify Sector</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="Enter your sector"
                                        className={inputClass("sectorOther")}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            {/* Description */}
            <FormField
                control={form.control}
                name="business.description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Briefly describe your business:</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                placeholder="Describe what your business does..."
                                className="min-h-[120px] rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                                onFocus={() => setFocusedField("description")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-sm">
                            Minimum 5 characters
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Problem Solved */}
            <FormField
                control={form.control}
                name="business.problemSolved"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Describe the customer problem you solve:</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                placeholder="What problem does your business solve for customers?"
                                className="min-h-[120px] rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                                onFocus={() => setFocusedField("problemSolved")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-sm">
                            Minimum 5  characters
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Section 1: Business Registration */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">SECTION 1 — Business Registration & Legality</h3>

                {/* Is Registered Toggle */}
                <FormField
                    control={form.control}
                    name="business.isRegistered"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium">
                                Is your business registered in Kenya? <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => field.onChange(true)}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                                        field.value === true
                                            ? "bg-green-50 border-green-500 text-green-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    <CheckCircleIcon className="w-5 h-5" weight={field.value === true ? "fill" : "regular"} />
                                    Yes, Registered
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange(false)}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                                        field.value === false
                                            ? "bg-red-50 border-red-500 text-red-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    No, Not Yet
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Registration Type */}
                <FormField
                    control={form.control}
                    name="business.registrationType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium">What is your legal registration type?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className={inputClass("registrationType")}>
                                        <SelectValue placeholder="Select registration type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="limited_company">Limited Company</SelectItem>
                                    <SelectItem value="partnership">Partnership</SelectItem>
                                    <SelectItem value="cooperative">Cooperative</SelectItem>
                                    <SelectItem value="self_help_group_cbo">Self-Help Group / CBO</SelectItem>
                                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="pt-4 border-t border-slate-200">
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2 mb-3">
                        <UploadIcon className="w-4 h-4 text-brand-blue" />
                        Upload your registration certificate <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormDescription className="mb-3 text-xs text-slate-500">(Mandatory for both tracks)</FormDescription>

                    {form.watch("business.registrationCertificateUrl") ? (
                        <div className="relative flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 group">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" weight="fill" />
                            <div className="flex-1 min-w-0">
                                <span className="text-green-700 font-medium block">Certificate uploaded</span>
                                <a
                                    href={form.watch("business.registrationCertificateUrl")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 text-sm hover:underline truncate block"
                                >
                                    View document ↗
                                </a>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("business.registrationCertificateUrl", "");
                                    toast.info("Certificate removed. You can upload a new one.");
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all opacity-100 group-hover:opacity-100"
                                title="Remove document"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <UploadButton
                            endpoint="registrationCertificateUploader"
                            onClientUploadComplete={(res) => {
                                if (res?.[0]) {
                                    form.setValue("business.registrationCertificateUrl", res[0].url);
                                    toast.success("Certificate uploaded successfully!");
                                }
                                setIsUploadingCert(false);
                            }}
                            onUploadError={(error) => {
                                toast.error(`Upload failed: ${error.message}`);
                                setIsUploadingCert(false);
                            }}
                            onUploadBegin={() => setIsUploadingCert(true)}
                            appearance={{
                                button: cn(
                                    "w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-medium",
                                    isUploadingCert && "opacity-50 cursor-not-allowed"
                                ),
                                allowedContent: "text-slate-500 text-sm",
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Section 2: Years of Operation */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">SECTION 2 — Years of Operation</h3>
                <FormField
                    control={form.control}
                    name="business.yearsOperational"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium">
                                How long has your business been operational?
                            </FormLabel>
                            <Select
                                onValueChange={(val) => field.onChange(parseInt(val))}
                                defaultValue={field.value?.toString()}
                            >
                                <FormControl>
                                    <SelectTrigger className={inputClass("yearsOperational")}>
                                        <SelectValue placeholder="Select years operational" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="0">Less than 1 year</SelectItem>
                                    <SelectItem value="1">1–2 years</SelectItem>
                                    <SelectItem value="3">More than 2 years</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Section 3: Financial Records */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">SECTION 3 — Books of Accounts (Financial Records)</h3>

                {/* Has Financial Records Toggle */}
                <FormField
                    control={form.control}
                    name="business.hasFinancialRecords"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex flex-col gap-1">
                                <span>Do you have at least 1 year (latest 12 months) of books of accounts/ bank statements or Mpesa statements? <span className="text-red-500">*</span></span>
                            </FormLabel>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => field.onChange(true)}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                                        field.value === true
                                            ? "bg-green-50 border-green-500 text-green-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    <CheckCircleIcon className="w-5 h-5" weight={field.value === true ? "fill" : "regular"} />
                                    Yes, I have records
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange(false)}
                                    className={cn(
                                        "flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                                        field.value === false
                                            ? "bg-red-50 border-red-500 text-red-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    No, not yet
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Upload Financial Records (only show if they have records) */}
                {form.watch("business.hasFinancialRecords") && (
                    <div className="pt-4">
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2 mb-3">
                            <UploadIcon className="w-4 h-4 text-brand-blue" />
                            Upload your financial records (optional)
                        </FormLabel>
                        {form.watch("business.financialRecordsUrl") ? (
                            <div className="relative flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 group">
                                <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" weight="fill" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-green-700 font-medium block">Detailed records uploaded</span>
                                    <a
                                        href={form.watch("business.financialRecordsUrl")}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 text-sm hover:underline truncate block"
                                    >
                                        View document ↗
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setValue("business.financialRecordsUrl", "");
                                        toast.info("Records removed.");
                                    }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all opacity-100 group-hover:opacity-100"
                                    title="Remove document"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <UploadButton
                                endpoint="businessOverviewUploader"
                                onClientUploadComplete={(res) => {
                                    if (res?.[0]) {
                                        form.setValue("business.financialRecordsUrl", res[0].url);
                                        toast.success("Financial records uploaded!");
                                    }
                                    setIsUploadingRecords(false);
                                }}
                                onUploadError={(error) => {
                                    toast.error(`Upload failed: ${error.message}`);
                                    setIsUploadingRecords(false);
                                }}
                                onUploadBegin={() => setIsUploadingRecords(true)}
                                appearance={{
                                    button: cn(
                                        "w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-medium",
                                        isUploadingRecords && "opacity-50 cursor-not-allowed"
                                    ),
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Audited Accounts */}
                <div className="pt-4 border-t border-slate-200">
                    <FormLabel className="text-slate-700 font-medium flex flex-col gap-1 mb-3">
                        <span>Do you have 1 year of audited financial statements?</span>
                    </FormLabel>

                    {form.watch("business.auditedAccountsUrl") ? (
                        <div className="relative flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 group">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" weight="fill" />
                            <div className="flex-1 min-w-0">
                                <span className="text-green-700 font-medium block">Audited statements uploaded</span>
                                <a
                                    href={form.watch("business.auditedAccountsUrl")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 text-sm hover:underline truncate block"
                                >
                                    View document ↗
                                </a>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("business.auditedAccountsUrl", "");
                                    toast.info("Audited statements removed.");
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all opacity-100 group-hover:opacity-100"
                                title="Remove document"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <UploadButton
                            endpoint="auditedAccountsUploader"
                            onClientUploadComplete={(res) => {
                                if (res?.[0]) {
                                    form.setValue("business.auditedAccountsUrl", res[0].url);
                                    toast.success("Audited statements uploaded!");
                                }
                                setIsUploadingAudit(false);
                            }}
                            onUploadError={(error) => {
                                toast.error(`Upload failed: ${error.message}`);
                                setIsUploadingAudit(false);
                            }}
                            onUploadBegin={() => setIsUploadingAudit(true)}
                            appearance={{
                                button: cn(
                                    "w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-medium",
                                    isUploadingAudit && "opacity-50 cursor-not-allowed"
                                ),
                            }}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
