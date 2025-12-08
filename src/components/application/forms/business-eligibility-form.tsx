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
                <h2 className="text-2xl font-bold text-slate-900">Business Profile</h2>
                <p className="text-slate-500 mt-2">Tell us about your business</p>
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

            {/* Registration Status - Always required since eligibility screening confirmed this */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" weight="fill" />
                    <div>
                        <span className="text-green-700 font-medium">Business is registered in Kenya</span>
                        <p className="text-green-600 text-sm">Confirmed during eligibility screening</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2 mb-3">
                        <FileTextIcon className="w-4 h-4 text-brand-blue" />
                        Registration Certificate <span className="text-red-500">*</span>
                    </FormLabel>

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
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all opacity100\0 group-hover:opacity-100"
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

            {/* Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="business.sector"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium">Sector / Value Chain</FormLabel>
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

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="business.county"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-brand-blue" />
                                County
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
                            <FormLabel className="text-slate-700 font-medium">City / Town</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Enter city or town"
                                    className={inputClass("city")}
                                    onFocus={() => setFocusedField("city")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Description */}
            <FormField
                control={form.control}
                name="business.description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Brief Business Description</FormLabel>
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
                            Minimum 50 characters
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
                        <FormLabel className="text-slate-700 font-medium">Customer Problem Solved</FormLabel>
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
                            Minimum 50 characters
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Years Operational */}
            <FormField
                control={form.control}
                name="business.yearsOperational"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-brand-blue" />
                            Years of Operation
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="How many years has your business been operational?"
                                className={inputClass("yearsOperational")}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-sm">
                            Business must be operational for at least 1 year
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Financial Records - Always show since eligibility screening confirmed this */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" weight="fill" />
                    <div>
                        <span className="text-green-700 font-medium">Financial records available</span>
                        <p className="text-green-600 text-sm">Books, bank statements, or M-Pesa statements</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2 mb-3">
                        <UploadIcon className="w-4 h-4 text-brand-blue" />
                        Upload Financial Records <span className="text-red-500">*</span>
                    </FormLabel>

                    {form.watch("business.financialRecordsUrl") ? (
                        <div className="relative flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 group">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" weight="fill" />
                            <div className="flex-1 min-w-0">
                                <span className="text-green-700 font-medium block">Financial records uploaded</span>
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
                                    toast.info("Financial records removed. You can upload new ones.");
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
            </div>

            {/* Audited Accounts - For Acceleration Track (always show since eligibility confirmed) */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <FileTextIcon className="w-6 h-6 text-amber-600" />
                    <div>
                        <span className="text-amber-700 font-medium">Audited Financial Statements</span>
                        <p className="text-amber-600 text-sm">Required for Acceleration Track eligibility</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2 mb-3">
                        <UploadIcon className="w-4 h-4 text-brand-blue" />
                        Upload Audited Statements <span className="text-red-500">*</span>
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
                                    toast.info("Audited statements removed. You can upload new ones.");
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
