"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    UsersThreeIcon,
    BriefcaseIcon,
    RocketLaunchIcon,
    TargetIcon,
    MegaphoneIcon,
    LaptopIcon,
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
                <h2 className="text-2xl font-bold text-slate-900">Impact Potential</h2>
                <p className="text-slate-500 mt-2">Section C: Job Creation Potential</p>
            </div>

            {/* Current Special Groups Employed */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <UsersThreeIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Current Employment</CardTitle>
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
                        <h4 className="text-sm font-medium text-slate-900">Breakdown</h4>
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

            {/* Job Creation Potential */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <BriefcaseIcon className="w-5 h-5 text-green-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Job Creation Potential</CardTitle>
                            <CardDescription>Potential to create new jobs in 12-24 months</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="impactPotential.jobCreationPotential"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Future Job Creation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select potential" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High Potential (&gt;5 new jobs)</SelectItem>
                                        <SelectItem value="moderate">Moderate (2-5 new jobs)</SelectItem>
                                        <SelectItem value="low">Low (1-2 new jobs)</SelectItem>
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
                <h2 className="text-2xl font-bold text-slate-900">Scalability Strategy</h2>
                <p className="text-slate-500 mt-2">Section D: Growth & Competitive Advantage</p>
            </div>

            {/* Market Differentiation */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <TargetIcon className="w-5 h-5 text-indigo-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Market Positioning</CardTitle>
                            <CardDescription>Differentiation and competitive advantage</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.marketDifferentiation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Product Differentiation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select differentiation" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="truly_unique">Truly Unique</SelectItem>
                                        <SelectItem value="provably_better">Provably Better</SelectItem>
                                        <SelectItem value="undifferentiated">Undifferentiated / Similar</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="scalability.competitiveAdvantage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Level of Competitive Advantage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select advantage level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High Advantage (Difficult to replicate)</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="low">Low (Easy to replicate)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="scalability.competitiveAdvantageBarriers"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Barriers to Entry (Explanation)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Explain what makes it difficult for others to copy you..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Sales & Technology */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <MegaphoneIcon className="w-5 h-5 text-orange-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Strategy & Execution</CardTitle>
                            <CardDescription>Sales, marketing, and technology</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.salesMarketingApproach"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Sales & Marketing Approach</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select approach" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="fully_integrated">Fully Integrated Strategy</SelectItem>
                                        <SelectItem value="aligned">Aligned Sales & Marketing</SelectItem>
                                        <SelectItem value="no_alignment">Ad-hoc / No defined alignment</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="scalability.technologyIntegration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Technology Integration</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select tech integration" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="core_to_business">Core to Business (Tech-enabled)</SelectItem>
                                        <SelectItem value="support_function">Support Function</SelectItem>
                                        <SelectItem value="minimal_use">Minimal Use</SelectItem>
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
