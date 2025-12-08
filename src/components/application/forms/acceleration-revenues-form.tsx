"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    CurrencyDollarIcon,
    CalendarIcon,
    TrendUpIcon,
    HandCoinsIcon,
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
import { Badge } from "@/components/ui/badge";

interface AccelerationRevenuesFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

const ScoringInfo = ({ maxPoints, description }: { maxPoints: number; description: string }) => (
    <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs bg-brand-orange/10 text-brand-orange border-brand-orange/20">
            Max {maxPoints} pts
        </Badge>
        <span className="text-xs text-slate-500">{description}</span>
    </div>
);

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
                <p className="text-slate-500 mt-2">Section B: Maximum 20 Marks</p>
            </div>

            {/* Revenue Last Year */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Annual Revenue</h3>
                        <p className="text-sm text-slate-500">Total revenue for last financial year</p>
                    </div>
                </div>
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
                                        className="pl-12 h-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </FormControl>
                            <ScoringInfo
                                maxPoints={5}
                                description=">5M = 5pts, 3.5-5M = 3pts, 3-3.5M = 1pt"
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Years of Operation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Years of Operation</h3>
                        <p className="text-sm text-slate-500">How long has your business been operational?</p>
                    </div>
                </div>
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
                                    className="h-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                            </FormControl>
                            <ScoringInfo
                                maxPoints={5}
                                description=">4 years = 5pts, 3-4 years = 3pts, 2 years = 1pt"
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Future Sales Growth */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendUpIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Projected Sales Growth</h3>
                        <p className="text-sm text-slate-500">Expected sales growth in next 6-12 months</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="revenues.futureSalesGrowth"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Growth Potential</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select growth potential" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">5 pts</Badge>
                                            High Growth Potential
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="moderate">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Moderate Growth
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="low">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            Low Growth
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={5} description="Based on projected growth" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* External Funding */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <HandCoinsIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Funds Raised</h3>
                        <p className="text-sm text-slate-500">Have you received external funding?</p>
                    </div>
                </div>

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
                                    className="data-[state=checked]:bg-brand-orange data-[state=unchecked]:bg-slate-300"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <ScoringInfo maxPoints={5} description="Yes = 5pts, No = 1pt" />

                {hasExternalFunding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                    >
                        <FormField
                            control={form.control}
                            name="revenues.fundingDetails"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Funding Details</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="List your funders and amounts..."
                                            className="min-h-[100px] rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

