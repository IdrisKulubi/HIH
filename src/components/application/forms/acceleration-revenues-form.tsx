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

interface AccelerationRevenuesFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

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
                <h2 className="text-2xl font-bold text-slate-900">Revenue & Growth</h2>
                <p className="text-slate-500 mt-2">Section B: Financial Performance & Growth Strategy</p>
            </div>

            {/* Revenue Last Year */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Annual Revenue</CardTitle>
                            <CardDescription>Total revenue for last financial year</CardDescription>
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
                                    Must be above KES 3,000,000 to qualify for Acceleration Track.
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
                            <CardTitle className="text-lg">Growth History</CardTitle>
                            <CardDescription>Tell us about your business growth journey</CardDescription>
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
                        name="revenues.growthHistory"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Growth Description</FormLabel>
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
                            <CardTitle className="text-lg">Projected Sales Growth</CardTitle>
                            <CardDescription>Expected sales growth in next 6-12 months</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="revenues.futureSalesGrowth"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Growth Potential</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select growth potential" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High Growth Potential</SelectItem>
                                        <SelectItem value="moderate">Moderate Growth</SelectItem>
                                        <SelectItem value="low">Low Growth</SelectItem>
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
                            <CardTitle className="text-lg">External Fundraising</CardTitle>
                            <CardDescription>Access to capital</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="revenues.hasExternalFunding"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-slate-700 font-medium">
                                        Received external funding?
                                    </FormLabel>
                                    <FormDescription className="text-slate-500 text-sm">
                                        Loans, grants, or investments
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-brand-orange"
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
