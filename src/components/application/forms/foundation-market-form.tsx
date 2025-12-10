"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    TargetIcon,
    ScalesIcon,
    SparkleIcon,
    ShieldCheckIcon,
} from "@phosphor-icons/react";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FoundationMarketPotentialFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// ... (imports)

// ... (interface)

export function FoundationMarketPotentialForm({ form }: FoundationMarketPotentialFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TargetIcon className="w-8 h-8 text-orange-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SECTION D: MARKET POTENTIAL</h2>
                <p className="text-slate-500 mt-2">D1 - D4: Pricing, Differentiation, Substitutes, Entry Barriers</p>
            </div>

            {/* Relative Pricing */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <ScalesIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D1. Relative Pricing</CardTitle>
                            <CardDescription>How is your product/service priced vs. competitors?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="marketPotential.relativePricing"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Your Pricing Strategy</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select pricing comparison" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="lower">Lower than competitors (Competitive Strategy)</SelectItem>
                                        <SelectItem value="equal">Equal to competitors (Competitive Strategy)</SelectItem>
                                        <SelectItem value="higher">Higher than competitors</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Scoring Guide: Competitive (Lower/Equal), Higher
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="marketPotential.relativePricingReason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Explanation</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Explain your pricing strategy..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Product Differentiation */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <SparkleIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D2. Product Differentiation</CardTitle>
                            <CardDescription>How unique is your product or service compared to what is currently available?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="marketPotential.productDifferentiation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Uniqueness Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select differentiation level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">New / Very Unique</SelectItem>
                                        <SelectItem value="relatively_new">Relatively New</SelectItem>
                                        <SelectItem value="similar">Existing / Similar to others</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="marketPotential.productDifferentiationDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe what makes your product/service unique..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Threat of Substitutes */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <ShieldCheckIcon className="w-5 h-5 text-red-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D3. Threat of Substitutes</CardTitle>
                            <CardDescription>Are there other products/services that can easily replace yours?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="marketPotential.threatOfSubstitutes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Competition Intensity</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select threat level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Low (No direct substitute)</SelectItem>
                                        <SelectItem value="moderate">Moderate substitute available</SelectItem>
                                        <SelectItem value="high">High (Many substitutes)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="marketPotential.competitorOverview"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Competitor Overview</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Provide a brief overview of competitors/substitutes..."
                                        className="min-h-[80px] rounded-xl"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Ease of Market Entry */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TargetIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">D4. Ease of Market Entry</CardTitle>
                            <CardDescription>How easy is it for new competitors to start a similar business?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="marketPotential.easeOfMarketEntry"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Entry Barrier</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select ease of entry" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Low (Difficult to copy)</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="high">High (Easy to start)</SelectItem>
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
