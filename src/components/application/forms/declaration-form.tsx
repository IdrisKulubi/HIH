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

interface DeclarationFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function DeclarationForm({ form }: DeclarationFormProps) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-700">Declaration</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                    Please review and certify your application details.
                </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-6">
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
                                <FormLabel className="text-zinc-900 dark:text-zinc-50">
                                    Social Safeguarding Guidelines
                                </FormLabel>
                                <FormDescription className="text-zinc-500 dark:text-zinc-400">
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
                                <FormLabel className="text-zinc-900 dark:text-zinc-50">
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
                                <FormLabel className="text-zinc-900 dark:text-zinc-50">Full Name (Signature)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your full name" {...field} className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800" />
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
                                <FormLabel className="text-zinc-900 dark:text-zinc-50">Date</FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        value={field.value ? new Date(field.value).toLocaleDateString() : new Date().toLocaleDateString()}
                                        disabled
                                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
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
