"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
    UserIcon,
    IdentificationCardIcon,
    PhoneIcon,
    EnvelopeSimpleIcon,
    GenderIntersexIcon,
} from "@phosphor-icons/react";
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

interface ApplicantDetailsFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<any>;
}

export function ApplicantDetailsForm({ form }: ApplicantDetailsFormProps) {
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
                <h2 className="text-2xl font-bold text-slate-900">Applicant Details</h2>
                <p className="text-slate-500 mt-2">Tell us about yourself</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <FormField
                    control={form.control}
                    name="applicant.firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-brand-blue" />
                                First Name
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Enter your first name"
                                    className={inputClass("firstName")}
                                    onFocus={() => setFocusedField("firstName")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Last Name */}
                <FormField
                    control={form.control}
                    name="applicant.lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-brand-blue" />
                                Last Name
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Enter your last name"
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

            {/* ID/Passport Number */}
            <FormField
                control={form.control}
                name="applicant.idPassportNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <IdentificationCardIcon className="w-4 h-4 text-brand-blue" />
                            ID / Passport Number
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                placeholder="Enter your ID or Passport number"
                                className={inputClass("idPassportNumber")}
                                onFocus={() => setFocusedField("idPassportNumber")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Gender */}
            <FormField
                control={form.control}
                name="applicant.gender"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <GenderIntersexIcon className="w-4 h-4 text-brand-blue" />
                            Gender
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className={inputClass("gender")}>
                                    <SelectValue placeholder="Select your gender" />
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
                    name="applicant.phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <PhoneIcon className="w-4 h-4 text-brand-blue" />
                                Phone Number
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="tel"
                                    placeholder="+254 7XX XXX XXX"
                                    className={inputClass("phoneNumber")}
                                    onFocus={() => setFocusedField("phoneNumber")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Email */}
                <FormField
                    control={form.control}
                    name="applicant.email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                                <EnvelopeSimpleIcon className="w-4 h-4 text-brand-blue" />
                                Email Address
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder="you@example.com"
                                    className={inputClass("email")}
                                    onFocus={() => setFocusedField("email")}
                                    onBlur={() => setFocusedField(null)}
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
