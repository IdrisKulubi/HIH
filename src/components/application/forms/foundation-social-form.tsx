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

interface FoundationSocialImpactFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

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
                <p className="text-slate-500 mt-2">Section E: Environmental & Social Responsibility</p>
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
                            <CardDescription>To what level does your business conserve the environment?</CardDescription>
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
                                        <SelectItem value="clearly_defined">Clearly Defined (recycling, solar, etc.)</SelectItem>
                                        <SelectItem value="minimal">Minimal</SelectItem>
                                        <SelectItem value="not_defined">Not Defined</SelectItem>
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
                                <FormLabel className="text-slate-700">Provide Examples</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe your environmental conservation practices..."
                                        className="min-h-[100px] rounded-xl"
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
                            <CardTitle className="text-lg">Inclusion of Special Groups</CardTitle>
                            <CardDescription>How many women,youth ,and  PWD employees do you currently employ?</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="socialImpact.fullTimeEmployeesTotal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700">Total Full-time Employees</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="0"
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
                        <h4 className="text-sm font-medium text-slate-900">Breakdown (Women, Youth, PWD)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="socialImpact.fullTimeEmployeesWomen"
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
                                name="socialImpact.fullTimeEmployeesYouth"
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
                                name="socialImpact.fullTimeEmployeesPwd"
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
                                        <SelectItem value="fully_compliant">Fully Compliant (licenses, tax, permits)</SelectItem>
                                        <SelectItem value="partially_compliant">Partially Compliant</SelectItem>
                                        <SelectItem value="not_clear">Not Clear / Non-compliant</SelectItem>
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
