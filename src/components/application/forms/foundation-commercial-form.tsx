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
import { Switch } from "@/components/ui/switch";
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
                <h2 className="text-2xl font-bold text-slate-900">Commercial Viability</h2>
                <p className="text-slate-500 mt-2">Section C: Proof of Sales & Customer Base</p>
            </div>

            {/* Revenue Last Year */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Revenue (Last Financial Year)</CardTitle>
                            <CardDescription>Total annual sales from the past year</CardDescription>
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
                            <CardTitle className="text-lg">Customer Base</CardTitle>
                            <CardDescription>Who are your customers?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="commercialViability.customerCount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Number of Customers (Last 12 Months)</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="Approximately how many customers?"
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
                                <FormLabel className="text-slate-700">Key Customer Segments</FormLabel>
                                <FormDescription>Describe your main types of customers</FormDescription>
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
                            <CardTitle className="text-lg">External Fundraising</CardTitle>
                            <CardDescription>Access to financial services</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="commercialViability.hasExternalFunding"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-slate-700 font-medium">
                                        Has your business received external funding?
                                    </FormLabel>
                                    <FormDescription className="text-slate-500 text-sm">
                                        Loans, grants, or equity financing
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </FormControl>
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
                                        <FormLabel className="text-slate-700">Funding Details</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="List funders/amounts and purpose (including in-kind support)..."
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
                            <CardTitle className="text-lg">Digitization</CardTitle>
                            <CardDescription>Use of digital tools and platforms</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="commercialViability.digitizationLevel"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Does the business use digital tools/platforms?</FormLabel>
                                <FormDescription>
                                    e.g., social media, e-commerce, digital payments to access info/markets
                                </FormDescription>
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
                                                placeholder="Explain why you are not using digital tools..."
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

// === BUSINESS MODEL FORM (10 marks) ===

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
                <h2 className="text-2xl font-bold text-slate-900">Business Model</h2>
                <p className="text-slate-500 mt-2">Section B: Business Model Maturity</p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Business Model Description</CardTitle>
                    <CardDescription>
                        How innovative is your business model? (How the business makes money)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="businessModel.businessModelInnovation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Innovation Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select description" />
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
