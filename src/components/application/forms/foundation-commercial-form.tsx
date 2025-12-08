"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    CurrencyDollarIcon,
    UsersIcon,
    HandCoinsIcon,
    TrendUpIcon,
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
import { Badge } from "@/components/ui/badge";

interface FoundationCommercialViabilityFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

// Scoring display for transparency
const ScoringInfo = ({ maxPoints, description }: { maxPoints: number; description: string }) => (
    <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs bg-brand-blue/5 text-brand-blue border-brand-blue/20">
            Max {maxPoints} pts
        </Badge>
        <span className="text-xs text-slate-500">{description}</span>
    </div>
);

export function FoundationCommercialViabilityForm({ form }: FoundationCommercialViabilityFormProps) {
    const hasExternalFunding = form.watch("commercialViability.hasExternalFunding");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendUpIcon className="w-8 h-8 text-emerald-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Commercial Viability</h2>
                <p className="text-slate-500 mt-2">Section B: Maximum 20 Marks</p>
            </div>

            {/* Revenue Last Year */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Revenue Last Financial Year</CardTitle>
                            <CardDescription>Total annual sales from the past year</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="commercialViability.revenueLastYear"
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
                                <ScoringInfo
                                    maxPoints={10}
                                    description=">2M = 10pts, 1-2M = 5pts, 500K-1M = 2pts"
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Customer Count */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <UsersIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Number of Customers</CardTitle>
                            <CardDescription>Customers benefiting from your product in the past 12 months</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="commercialViability.customerCount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Customer Count</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="Enter number of customers"
                                        className="h-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <ScoringInfo
                                    maxPoints={10}
                                    description=">401 = 10pts, 200-400 = 5pts, 1-200 = 2pts"
                                />
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
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <HandCoinsIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">External Fundraising</CardTitle>
                            <CardDescription>Have you received funding from external organizations?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="commercialViability.hasExternalFunding"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-slate-700 font-medium">
                                        Received external funding?
                                    </FormLabel>
                                    <FormDescription className="text-slate-500 text-sm">
                                        Loans, grants, or investments from external sources
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <ScoringInfo
                        maxPoints={10}
                        description="Yes = 10pts, No = 5pts"
                    />

                    {hasExternalFunding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            <FormField
                                control={form.control}
                                name="commercialViability.fundingDetails"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Funding Details</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="List your funders and amounts received..."
                                                className="min-h-[100px] rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
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

// === BUSINESS MODEL FORM (10 marks) ===

interface FoundationBusinessModelFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function FoundationBusinessModelForm({ form }: FoundationBusinessModelFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendUpIcon className="w-8 h-8 text-indigo-600" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Business Model</h2>
                <p className="text-slate-500 mt-2">Section C: Maximum 10 Marks</p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Business Model Innovation</CardTitle>
                    <CardDescription>
                        How innovative is your business model? How does your business make money?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="businessModel.businessModelInnovation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Innovation Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select innovation level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">10 pts</Badge>
                                                Innovative / New Concept
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="relatively_new">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">5 pts</Badge>
                                                Relatively Innovative
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="existing">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">2 pts</Badge>
                                                Existing / Well-established
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo
                                    maxPoints={10}
                                    description="Based on uniqueness of your business model"
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}
