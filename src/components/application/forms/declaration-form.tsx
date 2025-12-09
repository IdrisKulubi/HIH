"use client";

import { UseFormReturn } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FoundationApplicationFormData, AccelerationApplicationFormData } from "../schemas/bire-application-schema";

interface DeclarationFormProps {
    form: UseFormReturn<FoundationApplicationFormData> | UseFormReturn<AccelerationApplicationFormData>;
}

export function DeclarationForm({ form }: DeclarationFormProps) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Declaration</h2>
                <p className="text-slate-600 mt-2">
                    Please review and certify your application details.
                </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                <FormField
                    control={form.control}
                    name="declaration.hasSocialSafeguarding"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Social Safeguarding Guidelines
                                </FormLabel>
                                <FormDescription>
                                    Does the business have inclusive social safeguarding guidelines? (Required)
                                </FormDescription>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="declaration.confirmTruth"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    I certify that all information submitted is true and accurate.
                                </FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <FormField
                        control={form.control}
                        name="declaration.declarationName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name (Signature)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="declaration.declarationDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        value={field.value ? new Date(field.value).toLocaleDateString() : new Date().toLocaleDateString()}
                                        disabled
                                        className="bg-slate-100 text-slate-500"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
