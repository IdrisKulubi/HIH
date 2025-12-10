"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    CurrencyDollarIcon,
    CalendarIcon,
    TrendUpIcon,
    HandCoinsIcon,
    ChartLineUpIcon,
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

interface AccelerationRevenuesFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// ... (imports)

// ... (interface)

export function AccelerationRevenuesForm({ form }: AccelerationRevenuesFormProps) {
    const hasExternalFunding = form.watch("revenues.hasExternalFunding");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendUpIcon className="w-8 h-8 text-brand-orange" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION B: REVENUE & GROWTH </h2>
                <p className="text-slate-500 mt-2">B1 - B4: Financial Performance & Growth Strategy</p>
            </div>

            {/* Revenue Last Year */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">B1. Annual Revenue</CardTitle>
                            <CardDescription>What was your total revenue for the last financial year?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="revenues.revenueLastYear"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Revenue (KES)</FormLabel>
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
                                <FormDescription className="text-xs text-slate-500">
                                    Scoring Guide: &gt;5M, 3M-5M, &lt;3M. Minimum requirement: KES 3M.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>


            {/* Growth History */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ChartLineUpIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">B2. Revenue Growth</CardTitle>
                            <CardDescription>What is your average annual revenue growth rate over the last 3 years?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="revenues.yearsOperational"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Years Operational</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="1"
                                        placeholder="Enter years"
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
                        name="revenues.averageAnnualRevenueGrowth"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Average Annual Growth Rate</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select growth rate" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="above_20">&gt; 20%</SelectItem>
                                        <SelectItem value="10_20">10% - 20%</SelectItem>
                                        <SelectItem value="below_10">&lt; 10%</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="revenues.growthHistory"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Transformation / Growth Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Briefly describe your growth history over the years..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>


            {/* Future Sales Growth */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendUpIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">B3. Future Sales Growth</CardTitle>
                            <CardDescription>What is your projected sales growth for the next 12 months?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="revenues.futureSalesGrowth"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Projected Growth</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select projected growth" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High (&gt;20%)</SelectItem>
                                        <SelectItem value="moderate">Moderate (10-20%)</SelectItem>
                                        <SelectItem value="low">Low (&lt;10%)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="revenues.futureSalesGrowthReason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Basis for Projection</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Explain the basis for your growth projection (e.g., new contracts, market expansion)..."
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
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <HandCoinsIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">B4. External Fundraising</CardTitle>
                            <CardDescription>Have you raised external capital?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="revenues.hasExternalFunding"
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
                                name="revenues.externalFundingDetails"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Funding Details</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="List your funders, amounts, and purpose..."
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
        </motion.div>
    );
}
