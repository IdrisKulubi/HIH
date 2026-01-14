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
            className="space-y-10 pb-12"
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
                <h2 className="text-2xl font-bold text-slate-900">SECTION D: SCALABILITY & MARKET POSITION</h2>
                <p className="text-slate-500 mt-2">D1 - D4: Market Differentiation, Competitive Advantage, Technology & Sales</p>
            </div>

            {/* D1. Market Differentiation */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <TargetIcon className="w-5 h-5 text-indigo-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D1. Market Differentiation</CardTitle>
                            <CardDescription>How differentiated is your product/service?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.marketDifferentiation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Differentiation Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select differentiation level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="truly_unique">Truly unique</SelectItem>
                                        <SelectItem value="probably_better">Probably better than competition</SelectItem>
                                        <SelectItem value="undifferentiated">Undifferentiated / similar</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scalability.marketDifferentiationDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Explain your key competitive strengths</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe what makes your product/service unique compared to competitors..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* D2. Competitive Advantage */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <HeartIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D2. Competitive Advantage</CardTitle>
                            <CardDescription>What level of competitive advantage do you currently have?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.competitiveAdvantage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Competitive Advantage Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select advantage level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High (strong IP, technology, networks, production advantage, cost barriers)</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scalability.competitiveAdvantageSource"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Describe the sources of your competitive advantage</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Explain your IP, technology, networks, production advantages, cost barriers, etc..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* D3. Technology Integration */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <RocketLaunchIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D3. Technology Integration / Focus</CardTitle>
                            <CardDescription>What level of technology and innovation does your business apply?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.technologyIntegration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Technology & Innovation Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select technology level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High innovation & advanced technology use</SelectItem>
                                        <SelectItem value="moderate">Moderate innovation & basic technology use</SelectItem>
                                        <SelectItem value="low">Low innovation & minimal technology use</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scalability.technologyIntegrationDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Describe how you use technology and innovation</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe digital tools, automation, data systems, or new methods you use..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* D4. Sales & Marketing Integration */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <MegaphoneIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D4. Sales & Marketing Integration</CardTitle>
                            <CardDescription>How well do your sales and marketing activities work together?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="scalability.salesMarketingIntegration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Sales & Marketing Alignment</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select alignment level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="fully_integrated">Fully integrated</SelectItem>
                                        <SelectItem value="aligned">Aligned but not integrated</SelectItem>
                                        <SelectItem value="not_aligned">Not aligned</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scalability.salesMarketingApproach"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Describe your sales channels and marketing approach</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Do you have a sales team? Use social media? Run promotions? Follow up with customers?..."
                                        className="min-h-[100px] rounded-xl"
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
