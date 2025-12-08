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
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FoundationMarketPotentialFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

const ScoringInfo = ({ maxPoints, description }: { maxPoints: number; description: string }) => (
    <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs bg-brand-blue/5 text-brand-blue border-brand-blue/20">
            Max {maxPoints} pts
        </Badge>
        <span className="text-xs text-slate-500">{description}</span>
    </div>
);

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
                <h2 className="text-2xl font-bold text-slate-900">Market Potential</h2>
                <p className="text-slate-500 mt-2">Section D: Maximum 30 Marks</p>
            </div>

            {/* Relative Pricing */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <ScalesIcon className="w-5 h-5 text-emerald-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Relative Pricing</CardTitle>
                            <CardDescription>How does your pricing compare to competitors?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="marketPotential.relativePricing"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Your Pricing Strategy</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select pricing comparison" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="lower">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">7 pts</Badge>
                                                Lower than competitors
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="equal">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">4 pts</Badge>
                                                Equal to competitors
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="higher">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                                Higher than competitors
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={7} description="Based on competitive pricing" />
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
                            <CardTitle className="text-lg">Product Differentiation</CardTitle>
                            <CardDescription>How unique is your product or service?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="marketPotential.productDifferentiation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Uniqueness Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select differentiation level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">8 pts</Badge>
                                                New / Unique product
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="relatively_new">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">5 pts</Badge>
                                                Relatively new
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="existing">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">2 pts</Badge>
                                                Similar to existing products
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={8} description="Based on product uniqueness" />
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
                            <CardTitle className="text-lg">Threat of Substitutes</CardTitle>
                            <CardDescription>How crowded is your market space?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="marketPotential.threatOfSubstitutes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Competition Intensity</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select competition level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">7 pts</Badge>
                                                Low competition
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="moderate">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">4 pts</Badge>
                                                Moderate competition
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="high">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">0 pts</Badge>
                                                High competition
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={7} description="Less competition = more points" />
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
                            <CardTitle className="text-lg">Ease of Market Entry</CardTitle>
                            <CardDescription>How easy is it for others to enter your market?</CardDescription>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select entry barrier" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">8 pts</Badge>
                                                Low ease (High barriers)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="moderate">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">5 pts</Badge>
                                                Moderate ease
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="high">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                                High ease (Low barriers)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={8} description="Higher barriers = more points" />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}
