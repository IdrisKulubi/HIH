"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    UsersThreeIcon,
    BriefcaseIcon,
    RocketLaunchIcon,
    TargetIcon,
    MegaphoneIcon,
    HeartIcon,
} from "@phosphor-icons/react";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// === IMPACT POTENTIAL FORM ===
interface AccelerationImpactFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// ... (imports)

// ... (interface)

export function AccelerationImpactForm({ form }: AccelerationImpactFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UsersThreeIcon className="w-8 h-8 text-purple-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION C: IMPACT POTENTIAL </h2>
                <p className="text-slate-500 mt-2">C1 - C2: Job Creation & Inclusion</p>
            </div>

            {/* Current Special Groups Employed - Data Collection Only */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <UsersThreeIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Current Employment Data</CardTitle>
                            <CardDescription>Number of women, youth, and PWD currently employed</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="impactPotential.fullTimeEmployeesTotal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Total Full-time Employees</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            placeholder="Total count"
                                            className="h-12 rounded-xl"
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-900">Breakdown (Current)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="impactPotential.fullTimeEmployeesWomen"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-500 uppercase font-semibold">Women</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min="0"
                                                className="h-10 rounded-lg"
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="impactPotential.fullTimeEmployeesYouth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-500 uppercase font-semibold">Youth</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min="0"
                                                className="h-10 rounded-lg"
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="impactPotential.fullTimeEmployeesPwd"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-500 uppercase font-semibold">PWD</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min="0"
                                                className="h-10 rounded-lg"
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* C1. Job Creation Potential */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <BriefcaseIcon className="w-5 h-5 text-green-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C1. Job Creation Potential</CardTitle>
                            <CardDescription>How many new full-time jobs will you create in the next 12-24 months?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="impactPotential.jobCreationPotential"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Projected New Jobs</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select potential" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">&gt; 10 new jobs</SelectItem>
                                        <SelectItem value="moderate">5 - 10 new jobs</SelectItem>
                                        <SelectItem value="low">1 - 4 new jobs</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* C2. Inclusivity */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                            <HeartIcon className="w-5 h-5 text-rose-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">C2. Women / Youth / PWD Jobs</CardTitle>
                            <CardDescription>What percentage of these new jobs will be for women, youth, or PWD?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="impactPotential.projectedInclusion"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Projected Inclusion Percentage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select percentage" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="above_50">&gt; 50%</SelectItem>
                                        <SelectItem value="30_50">30% - 50%</SelectItem>
                                        <SelectItem value="below_30">&lt; 30%</SelectItem>
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

// === SCALABILITY FORM ===
interface AccelerationScalabilityFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function AccelerationScalabilityForm({ form }: AccelerationScalabilityFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <RocketLaunchIcon className="w-8 h-8 text-indigo-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION D: SCALABILITY</h2>
                <p className="text-slate-500 mt-2">D1 - D2: Scalability Strategy & Market Potential</p>
            </div>

            {/* D1. Scalability Strategy */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <TargetIcon className="w-5 h-5 text-indigo-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D1. Scalability Strategy </CardTitle>
                            <CardDescription>Do you have a clear plan for scaling your business?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.scalabilityPlan"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Scalability Plan</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select description" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="clear_plan">Clear, actionable plan</SelectItem>
                                        <SelectItem value="some_idea">Some idea</SelectItem>
                                        <SelectItem value="no_plan">No plan</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Context fields */}
                    <FormField
                        control={form.control}
                        name="scalability.marketDifferentiationDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Detailed Strategy Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe your plan to scale..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* D2. Market Potential */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MegaphoneIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D2. Market Potential for Scale</CardTitle>
                            <CardDescription>Is the market large enough to support significant growth?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.marketScalePotential"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Market Size</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select market potential" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="large_growing">Large & Growing</SelectItem>
                                        <SelectItem value="stable">Stable</SelectItem>
                                        <SelectItem value="small_niche">Small / Niche</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Context fields */}
                    <FormField
                        control={form.control}
                        name="scalability.salesMarketingApproach"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Sales & Marketing Approach</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe your sales and marketing approach..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}
