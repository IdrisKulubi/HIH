"use client";

import { useState } from "react";
import { type UseFormReturn, type Path } from "react-hook-form";
import { motion } from "framer-motion";
import { UserIcon } from "@phosphor-icons/react";
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
import { cn } from "@/lib/utils";

import { ApplicantFormData } from "../schemas/bire-application-schema";

interface ApplicantDetailsFormProps<T extends { applicant: ApplicantFormData }> {
    form: UseFormReturn<T>;
}

export function ApplicantDetailsForm<T extends { applicant: ApplicantFormData }>({ form }: ApplicantDetailsFormProps<T>) {
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const inputClass = (fieldName: string) =>
        cn(
            "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200",
            focusedField === fieldName && "ring-2 ring-brand-blue/20 border-brand-blue"
        );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-8 h-8 text-brand-blue" weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">A1. Applicant Information</h2>
                <p className="text-slate-500 mt-2">Enter your personal details</p>
            </div>

            {/* Name Section */}
            <div>
                <FormLabel className="text-slate-700 font-medium mb-4 block text-base">
                    Full Name of Applicant / Majority Shareholder / Founder:
                </FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name={"applicant.firstName" as Path<T>}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium text-sm">First Name</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        value={field.value as string}
                                        placeholder="First name"
                                        className={inputClass("firstName")}
                                        onFocus={() => setFocusedField("firstName")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name={"applicant.lastName" as Path<T>}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium text-sm">Last Name</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        value={field.value as string}
                                        placeholder="Last name"
                                        className={inputClass("lastName")}
                                        onFocus={() => setFocusedField("lastName")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* Shareholders Section */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <FormLabel className="text-slate-700 font-medium block text-base">
                    Please indicate the composition of your shareholders (Number of women, youth and PWD)
                </FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name={"applicant.shareholdersWomen" as Path<T>}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-600">Women</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        value={field.value as number}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        className={inputClass("shareholdersWomen")}
                                        onFocus={() => setFocusedField("shareholdersWomen")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={"applicant.shareholdersYouth" as Path<T>}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-600">Youth</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        value={field.value as number}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        className={inputClass("shareholdersYouth")}
                                        onFocus={() => setFocusedField("shareholdersYouth")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={"applicant.shareholdersPwd" as Path<T>}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-600">PWD</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        value={field.value as number}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        className={inputClass("shareholdersPwd")}
                                        onFocus={() => setFocusedField("shareholdersPwd")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* ID/Passport Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name={"applicant.idPassportNumber" as Path<T>}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                National ID / Passport Number:
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value as string}
                                    placeholder="Enter ID or Passport Number"
                                    className={inputClass("idPassportNumber")}
                                    onFocus={() => setFocusedField("idPassportNumber")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={"applicant.dob" as Path<T>}
                    render={({ field }) => {
                        // Destructure value to avoid spreading Date object to Input
                        const { value, ...fieldProps } = field;
                        return (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                    Date of Birth:
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        {...fieldProps}
                                        type="date"
                                        value={value ? new Date(value as Date).toISOString().split('T')[0] : ""}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className={inputClass("dob")}
                                        onFocus={() => setFocusedField("dob")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        );
                    }}
                />
            </div>

            {/* Gender */}
            <FormField
                control={form.control}
                name={"applicant.gender" as Path<T>}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            Gender:
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                            <FormControl>
                                <SelectTrigger className={inputClass("gender")}>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone Number */}
                <FormField
                    control={form.control}
                    name={"applicant.phoneNumber" as Path<T>}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                Phone Number:
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value as string}
                                    type="tel"
                                    placeholder="Phone Number"
                                    className={inputClass("phoneNumber")}
                                    onFocus={() => setFocusedField("phoneNumber")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Alternate Phone Number */}
                <FormField
                    control={form.control}
                    name={"applicant.alternatePhoneNumber" as Path<T>}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                Alternate Phone Number:
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value as string}
                                    type="tel"
                                    placeholder="Alternate Phone Number"
                                    className={inputClass("alternatePhoneNumber")}
                                    onFocus={() => setFocusedField("alternatePhoneNumber")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Email */}
            <FormField
                control={form.control}
                name={"applicant.email" as Path<T>}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            Email Address:
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value as string}
                                type="email"
                                placeholder="Email Address"
                                className={inputClass("email")}
                                onFocus={() => setFocusedField("email")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>
    );
}
