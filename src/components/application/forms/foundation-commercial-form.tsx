"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    CurrencyDollarIcon,
    UsersIcon,
    HandCoinsIcon,
    TrendUpIcon,
    DevicesIcon,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FoundationCommercialViabilityFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// ... (imports)

// ... (interface)

export function FoundationCommercialViabilityForm({ form }: FoundationCommercialViabilityFormProps) {
    const hasExternalFunding = form.watch("commercialViability.hasExternalFunding");
    const digitizationLevel = form.watch("commercialViability.digitizationLevel");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendUpIcon className="w-8 h-8 text-emerald-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION C: COMMERCIAL VIABILITY</h2>
                <p className="text-slate-500 mt-2">Proof of Sales, Customer Base, Fundraising, Digitization</p>
            </div>

            {/* Revenue Last Year */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C1. Proof of Sales — Revenue Level</CardTitle>
                            <CardDescription>What was your total revenue for the last financial year?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="commercialViability.revenueLastYear"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Total Revenue (KES)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">KES</span>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            placeholder="Enter amount"
                                            className="pl-12 h-12 rounded-xl"
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </FormControl>
                                
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Customer Count */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <UsersIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C2. Customer Base</CardTitle>
                            <CardDescription>How many customers did you serve in the past 12 months?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="commercialViability.customerCount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Number of Customers</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="Enter number of customers"
                                        className="h-12 rounded-xl"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                </FormControl>
                              
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="commercialViability.keyCustomerSegments"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Describe your key customer segments.</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="e.g. Urban youth, Smallholder farmers..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* External Funding */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <HandCoinsIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C3. External Fundraising/Access to Financial Services</CardTitle>
                            <CardDescription>Has your business received external funding (loans, grants, equity financing etc)?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="commercialViability.hasExternalFunding"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={(val) => field.onChange(val === "true")}
                                        defaultValue={field.value !== undefined ? String(field.value) : undefined}
                                        className="flex flex-col space-y-1"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="true" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                Yes
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="false" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                No
                                            </FormLabel>
                                            
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {hasExternalFunding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <FormField
                                control={form.control}
                                name="commercialViability.externalFundingDetails"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">If yes, list funders/amounts and purpose.</FormLabel>
                                        <FormDescription>
                                            This also includes in kind support such as assistance to develop business plans, Capacity building, please specify if this is the case.
                                        </FormDescription>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Enter details..."
                                                className="min-h-[100px] rounded-xl"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            {/* Digitization */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <DevicesIcon className="w-5 h-5 text-indigo-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C4. DIGITIZATION</CardTitle>
                            <CardDescription>Does the business use digital tools and platforms (e.g., social media, e-commerce) to access information and market its products or services?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="commercialViability.digitizationLevel"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={(val) => field.onChange(val === "true")}
                                        defaultValue={field.value !== undefined ? String(field.value) : undefined}
                                        className="flex flex-col space-y-1"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="true" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                Yes
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="false" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                No 
                                            </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {digitizationLevel === false && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <FormField
                                control={form.control}
                                name="commercialViability.digitizationReason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">If No, why?</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Explain why..."
                                                className="min-h-[80px] rounded-xl"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// === BUSINESS MODEL FORM ===

interface FoundationBusinessModelFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function FoundationBusinessModelForm({ form }: FoundationBusinessModelFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendUpIcon className="w-8 h-8 text-indigo-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION B: BUSINESS MODEL</h2>
                <p className="text-slate-500 mt-2">B1. Business Model Maturity</p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">B1. Business Model Maturity</CardTitle>
                    <CardDescription>
                        Describe your business model. (How does the business make money.)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="businessModel.businessModelInnovation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Select description</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select business model type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="innovative_concept">
                                            Innovative concept
                                        </SelectItem>
                                        <SelectItem value="relatively_innovative">
                                            Relatively Innovative
                                        </SelectItem>
                                        <SelectItem value="existing">
                                            Existing / Well-established
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}
