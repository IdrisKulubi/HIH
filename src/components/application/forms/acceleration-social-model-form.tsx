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
    HandshakeIcon,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// === SOCIAL IMPACT FORM ===
interface AccelerationSocialImpactFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// ... (imports)

// ... (interface)

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
                <h2 className="text-2xl font-bold text-slate-900">SECTION E: SOCIAL & ENVIRONMENTAL IMPACT</h2>
                <p className="text-slate-500 mt-2">E1 - E3: Social Impact, Environment & Supplier Involvement </p>
            </div>

            {/* E1. Social Contribution */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                            <HeartIcon className="w-5 h-5 text-rose-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">E1. How strongly does your business contribute to social and economic improvements? </CardTitle>
                            <CardDescription> (Examples: new jobs created, higher farmer earnings, women/youth participation)</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="socialImpact.socialImpactContribution"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Impact Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select impact level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High (Significant income improvement)</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="none">Low / None</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="socialImpact.socialImpactContributionDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Explain your social and economic impact</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe how your business creates jobs, improves incomes, supports women/youth participation, etc..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* E2. Environmental Impact */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <LeafIcon className="w-5 h-5 text-green-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">E2. Environmental Impact</CardTitle>
                            <CardDescription>Environmental conservation practices</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="socialImpact.environmentalImpact"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Impact Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select environmental impact level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="clearly_defined">High (Positive impact)</SelectItem>
                                        <SelectItem value="minimal">Moderate</SelectItem>
                                        <SelectItem value="not_defined">Low / None</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="socialImpact.environmentalImpactDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe your environmental practices..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* E3. Supplier Involvement - 6 Marks */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <TruckIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">E3. Supplier Involvement </CardTitle>
                            <CardDescription>How do you engage suppliers?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="socialImpact.supplierInvolvement"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Supplier Engagement</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select engagement type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="direct_engagement">Direct engagement </SelectItem>
                                        <SelectItem value="network_based">Network-based engagement </SelectItem>
                                        <SelectItem value="none">No clear engagement </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="socialImpact.supplierSupportDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Describe how you support suppliers</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe how you support suppliers (training, contracts, aggregation, standards)..."
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

// === BUSINESS MODEL FORM ===
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
                <h2 className="text-2xl font-bold text-slate-900">SECTION F: BUSINESS MODEL</h2>
                <p className="text-slate-500 mt-2">F1 - F3: Uniqueness, Value Proposition & Competitive Advantage </p>
            </div>

            {/* F1. Business Model Innovation */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <LightbulbIcon className="w-5 h-5 text-amber-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">F1. Model Innovation</CardTitle>
                            <CardDescription>How innovative is your business model?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="businessModel.businessModelUniqueness"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Uniqueness Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select uniqueness level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">Disruptive / New</SelectItem>
                                        <SelectItem value="moderate">Incremental Innovation</SelectItem>
                                        <SelectItem value="low">Standard / Imitative</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="businessModel.businessModelUniquenessDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe what makes your business model unique..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* F2. Value Proposition */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <StarIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">F2. Value Proposition</CardTitle>
                            <CardDescription>How strong is your customer value proposition?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="businessModel.customerValueProposition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Strength of Proposition</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select strength level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">Strong (Must have)</SelectItem>
                                        <SelectItem value="moderate">Moderate (Nice to have)</SelectItem>
                                        <SelectItem value="low">Weak</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* F3. Competitive Advantage Strength - 6 Marks */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <ShieldCheckIcon className="w-5 h-5 text-teal-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">F3. Competitive Advantage Strength </CardTitle>
                            <CardDescription>Rate the strength of your competitive advantage. Explain barriers that protect your competitive position.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="businessModel.competitiveAdvantageStrength"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Competitive Advantage Strength</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select strength level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="moderate">Moderate </SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="businessModel.competitiveAdvantageBarriers"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Explain barriers protecting your competitive position</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe the barriers that protect your competitive position (e.g., patents, exclusive partnerships, unique expertise, brand recognition)..."
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
