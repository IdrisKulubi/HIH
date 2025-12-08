"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    UsersThreeIcon,
    BriefcaseIcon,
    RocketLaunchIcon,
    TargetIcon,
    MegaphoneIcon,
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
import { Badge } from "@/components/ui/badge";

const ScoringInfo = ({ maxPoints, description }: { maxPoints: number; description: string }) => (
    <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs bg-brand-orange/10 text-brand-orange border-brand-orange/20">
            Max {maxPoints} pts
        </Badge>
        <span className="text-xs text-slate-500">{description}</span>
    </div>
);

// === IMPACT POTENTIAL FORM (20 marks) ===
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
                <p className="text-slate-500 mt-2">Section C: Maximum 20 Marks</p>
            </div>

            {/* Current Special Groups Employed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <UsersThreeIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Current Jobs Created</h3>
                        <p className="text-sm text-slate-500">Women, youth & PWD currently employed</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="impactPotential.currentSpecialGroupsEmployed"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Total Employees (Women, Youth, PWD)</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    placeholder="Enter count"
                                    className="h-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                            </FormControl>
                            <ScoringInfo
                                maxPoints={10}
                                description=">10 = 10pts, 6-9 = 6pts, 5 = 3pts"
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Job Creation Potential */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <BriefcaseIcon className="w-5 h-5 text-green-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Job Creation Potential</h3>
                        <p className="text-sm text-slate-500">Potential to create new jobs in 12-24 months</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="impactPotential.jobCreationPotential"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Future Job Creation</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select potential" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">10 pts</Badge>
                                            High Potential (&gt;5 new jobs)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="moderate">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">6 pts</Badge>
                                            Moderate (2-5 new jobs)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="low">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">3 pts</Badge>
                                            Low (1-2 new jobs)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={10} description="Based on projected job creation" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </motion.div>
    );
}

// === SCALABILITY FORM (20 marks) ===
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
                <h2 className="text-2xl font-bold text-slate-900">Scalability</h2>
                <p className="text-slate-500 mt-2">Section D: Maximum 20 Marks</p>
            </div>

            {/* Market Differentiation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Market Differentiation</h3>
                    <p className="text-sm text-slate-500">How differentiated is your product?</p>
                </div>
                <FormField
                    control={form.control}
                    name="scalability.marketDifferentiation"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select differentiation" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="truly_unique">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">5 pts</Badge>
                                            Truly Unique
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="provably_better">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Provably Better
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="undifferentiated">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            Undifferentiated
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={5} description="Based on uniqueness" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Competitive Advantage */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Competitive Advantage</h3>
                    <p className="text-sm text-slate-500">Level of competitive advantage</p>
                </div>
                <FormField
                    control={form.control}
                    name="scalability.competitiveAdvantage"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select advantage level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">5 pts</Badge>
                                            High Advantage
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="moderate">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Moderate
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="low">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            Low
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={5} description="Based on barriers to entry" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Offering Focus */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TargetIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Offering Focus</h3>
                        <p className="text-sm text-slate-500">How does your offering address customer outcomes?</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="scalability.offeringFocus"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select focus type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="outcome_focused">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">5 pts</Badge>
                                            Outcome Focused
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="solution_focused">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Solution Focused
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="feature_focused">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            Feature Focused
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={5} description="Customer outcome orientation" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Sales & Marketing Integration */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <MegaphoneIcon className="w-5 h-5 text-orange-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Sales & Marketing Integration</h3>
                        <p className="text-sm text-slate-500">Alignment of your sales and marketing</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="scalability.salesMarketingIntegration"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select integration level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="fully_integrated">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">5 pts</Badge>
                                            Fully Integrated
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="aligned">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Aligned
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="no_alignment">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            No Alignment
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={5} description="Sales/marketing alignment" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </motion.div>
    );
}

