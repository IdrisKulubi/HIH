"use client";

import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    LeafIcon,
    UsersThreeIcon,
    ShieldCheckIcon,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FoundationSocialImpactFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

const ScoringInfo = ({ maxPoints, description }: { maxPoints: number; description: string }) => (
    <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs bg-brand-green/10 text-brand-green border-brand-green/20">
            Max {maxPoints} pts
        </Badge>
        <span className="text-xs text-slate-500">{description}</span>
    </div>
);

export function FoundationSocialImpactForm({ form }: FoundationSocialImpactFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LeafIcon className="w-8 h-8 text-brand-green" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Social Impact</h2>
                <p className="text-slate-500 mt-2">Section E: Maximum 40 Marks</p>
            </div>

            {/* Environmental Impact */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <LeafIcon className="w-5 h-5 text-green-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Environmental Impact</CardTitle>
                            <CardDescription>Does your business conserve the environment?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="socialImpact.environmentalImpact"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Environmental Conservation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select environmental impact level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="clearly_defined">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">15 pts</Badge>
                                                Clearly Defined environmental practices
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="neutral">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">10 pts</Badge>
                                                Neutral / Minimal impact
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="not_defined">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">5 pts</Badge>
                                                Not Defined
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={15} description="Clear environmental practices = more points" />
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
                                <FormDescription className="text-slate-500 text-sm">
                                    Examples: renewable energy use, waste reduction, sustainable sourcing, etc.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Special Groups Employed */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <UsersThreeIcon className="w-5 h-5 text-purple-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Special Groups Employed</CardTitle>
                            <CardDescription>Number of women, youth, and PWD employees</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="socialImpact.specialGroupsEmployed"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Total Women, Youth & PWD Employees</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="Enter total count"
                                        className="h-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <ScoringInfo maxPoints={15} description=">10 = 15pts, 6-9 = 10pts, 5 = 5pts" />
                                <FormDescription className="text-slate-500 text-sm">
                                    Combined count of women, youth (18-35), and persons with disabilities
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Business Compliance */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ShieldCheckIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Business Compliance</CardTitle>
                            <CardDescription>Your regulatory and legal compliance status</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="socialImpact.businessCompliance"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700">Compliance Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Select compliance status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="fully_compliant">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700">10 pts</Badge>
                                                Fully Compliant
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="partially_compliant">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-yellow-100 text-yellow-700">3 pts</Badge>
                                                Partially Compliant
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="not_clear">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-slate-100 text-slate-700">1 pt</Badge>
                                                Not Clear
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <ScoringInfo maxPoints={10} description="Full compliance = maximum points" />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}
