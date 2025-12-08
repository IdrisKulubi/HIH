"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    HeartIcon,
    TruckIcon,
    LeafIcon,
    LightbulbIcon,
    StarIcon,
    ShieldCheckIcon,
} from "@phosphor-icons/react";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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

// === SOCIAL IMPACT FORM (20 marks) ===
interface AccelerationSocialImpactFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function AccelerationSocialImpactForm({ form }: AccelerationSocialImpactFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <HeartIcon className="w-8 h-8 text-rose-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Social & Environmental Impact</h2>
                <p className="text-slate-500 mt-2">Section E: Maximum 20 Marks</p>
            </div>

            {/* Social Impact - Household Income */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                        <HeartIcon className="w-5 h-5 text-rose-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Social Impact</h3>
                        <p className="text-sm text-slate-500">Contribution to improved household income</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="socialImpact.socialImpactHousehold"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Household Income Impact</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select impact level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">6 pts</Badge>
                                            High - Improved household income
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="moderate">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">4 pts</Badge>
                                            Moderate improvement
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">0 pts</Badge>
                                            None
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={6} description="Based on income improvement" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Supplier Involvement */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TruckIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Supplier Involvement</h3>
                        <p className="text-sm text-slate-500">How do you engage with suppliers?</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="socialImpact.supplierInvolvement"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Engagement Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select engagement level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="direct_engagement">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">6 pts</Badge>
                                            Direct Engagement
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="network_engagement">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                            Network-based Engagement
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                            No Clear Engagement
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={6} description="Based on supplier engagement" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Environmental Impact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <LeafIcon className="w-5 h-5 text-green-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Environmental Impact</h3>
                        <p className="text-sm text-slate-500">Environmental conservation practices</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="socialImpact.environmentalImpact"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Impact Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select impact level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">6 pts</Badge>
                                            High - Clear environmental benefits
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="moderate">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-700">4 pts</Badge>
                                            Moderate impact
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="low">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-100 text-slate-700">0 pts</Badge>
                                            Low / None
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={6} description="Based on environmental practices" />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="socialImpact.environmentalExamples"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700">Provide Examples</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="Describe your environmental conservation practices..."
                                    className="min-h-[100px] rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </motion.div>
    );
}

// === BUSINESS MODEL FORM (20 marks) ===
interface AccelerationBusinessModelFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function AccelerationBusinessModelForm({ form }: AccelerationBusinessModelFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LightbulbIcon className="w-8 h-8 text-amber-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Business Model</h2>
                <p className="text-slate-500 mt-2">Section F: Maximum 20 Marks</p>
            </div>

            {/* Business Model Uniqueness */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <LightbulbIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Business Model Uniqueness</h3>
                        <p className="text-sm text-slate-500">How unique is your business model?</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="businessModel.businessModelUniqueness"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select uniqueness level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">7 pts</Badge>
                                            High - Truly unique model
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
                                            Low - Common model
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ScoringInfo maxPoints={7} description="Based on model innovation" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Customer Value Proposition */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <StarIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Customer Value Proposition</h3>
                        <p className="text-sm text-slate-500">Strength of your value proposition</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="businessModel.customerValueProposition"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select strength level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">7 pts</Badge>
                                            High - Strong value proposition
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
                            <ScoringInfo maxPoints={7} description="Why customers buy from you" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Competitive Advantage Strength */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Competitive Advantage Strength</h3>
                        <p className="text-sm text-slate-500">Barriers protecting your market position</p>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="businessModel.competitiveAdvantageStrength"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-white text-slate-900 border-slate-200">
                                        <SelectValue placeholder="Select strength level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-700">6 pts</Badge>
                                            High - Strong barriers
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
                            <ScoringInfo maxPoints={6} description="Based on entry barriers" />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </motion.div>
    );
}

