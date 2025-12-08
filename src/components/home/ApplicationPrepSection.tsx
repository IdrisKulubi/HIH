"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { CaretDownIcon, CheckCircleIcon, FileTextIcon, BriefcaseIcon, TrendUpIcon, UsersIcon, CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const prepSteps = [
    {
        id: "basics",
        title: "Business Profile & Contact",
        icon: BriefcaseIcon,
        description: "Basic details about yourself and your enterprise.",
        items: [
            "Applicant ID/Passport & Contact Details",
            "Business Name & County",
            "Sector/Value Chain",
            "Brief Description of Operations",
            "Customer Problem Solved"
        ]
    },
    {
        id: "legal",
        title: "Registration & Compliance",
        icon: FileTextIcon,
        description: "Proof that your business is a legal entity in Kenya.",
        items: [
            "Business Registration Certificate (Mandatory)",
            "KRA PIN (Personal or Business)",
            "Valid Business Permit (Optional but recommended)",
            "Must be registered as: Limited Co, Partnership, Cooperative, or Sole Prop"
        ]
    },
    {
        id: "finance",
        title: "Financial Records",
        icon: TrendUpIcon,
        description: "Documents showing your business performance.",
        items: [
            "1 Year of Books/Bank Statements or M-Pesa Statements",
            "Latest Audited Accounts (Mandatory for Acceleration Track)",
            "Revenue Estimates for the last financial year",
            "Evidence of any external funding received"
        ]
    },
    {
        id: "impact",
        title: "Social Impact & Team",
        icon: UsersIcon,
        description: "Your contribution to employment and the community.",
        items: [
            "Number of Full-time Employees",
            "Breakdown of Women, Youth, and PWDs employed",
            "Environmental conservation practices",
            "Supplier engagement details"
        ]
    }
];

export function ApplicationPrepSection() {
    const [openSection, setOpenSection] = useState<string | null>("basics");

    const toggleSection = (id: string) => {
        setOpenSection(openSection === id ? null : id);
    };

    return (
        <section className="py-24 relative z-10">
            <div className="container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-brand-blue font-bold tracking-wide uppercase text-sm">Get Ready</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
                            Prepare for Your Application
                        </h2>
                        <p className="text-xl text-gray-600">
                            Get ready for success! Here's exactly what you'll need to complete your application. Prepare your responses in advance to make the process smooth.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setOpenSection(null)}
                            className="text-sm text-gray-500 hover:text-brand-blue transition-colors flex items-center gap-2"
                        >
                            Collapse All Sections
                        </button>
                    </div>

                    {prepSteps.map((step, index) => (
                        <ScrollReveal key={step.id} delay={index * 0.1}>
                            <div
                                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${openSection === step.id
                                    ? "bg-white border-brand-blue shadow-lg shadow-brand-blue/10"
                                    : "bg-white/80 border-gray-200 hover:border-brand-blue/30 hover:shadow-md"
                                    }`}
                            >
                                <button
                                    onClick={() => toggleSection(step.id)}
                                    className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${openSection === step.id ? "bg-brand-blue text-white" : "bg-blue-50 text-brand-blue"
                                            }`}>
                                            <step.icon weight={openSection === step.id ? "fill" : "duotone"} />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold transition-colors ${openSection === step.id ? "text-gray-900" : "text-gray-700"
                                                }`}>
                                                {step.title}
                                            </h3>
                                            <p className="text-gray-500 text-sm mt-1 hidden md:block">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transform transition-transform duration-300 ${openSection === step.id ? "rotate-180" : ""}`}>
                                        <CaretDownIcon size={24} className="text-gray-400" />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {openSection === step.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-6 md:p-8 pt-0 border-t border-gray-100">
                                                <div className="md:hidden text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    {step.description}
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {step.items.map((item, i) => (
                                                        <div key={i} className="flex items-start gap-3 text-gray-700 group">
                                                            <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" weight="fill" />
                                                            <span className="text-sm md:text-base leading-relaxed">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
