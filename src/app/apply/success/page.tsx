"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircleIcon, HouseIcon, UserIcon, ClockIcon, CheckIcon, EnvelopeSimpleIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function ApplicationSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />

            <div className="max-w-3xl w-full mx-auto space-y-8 relative z-10">

                {/* Main Success Custom Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-8 md:p-12 text-center flex flex-col items-center"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 pointer-events-none" />
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 opacity-80" />

                    {/* Animated Checkmark */}
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                            delay: 0.2
                        }}
                        className="w-24 h-24 bg-gradient-to-tr from-emerald-50 to-teal-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-emerald-100/50"
                    >
                        <CheckCircleIcon weight="fill" className="w-12 h-12 text-emerald-500" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight"
                    >
                        Application Received
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed font-light"
                    >
                        Thank you for applying to <span className="font-semibold text-emerald-700">Hand in Hand</span>. Your journey has effectively begun.
                    </motion.p>
                </motion.div>

                {/* Next Steps Timeline - Custom Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    <BespokeStepCard
                        icon={<ClockIcon weight="duotone" className="w-8 h-8 text-blue-500" />}
                        title="Review"
                        step="01"
                        description="Evaluation of eligibility and business model against criteria."
                        delay={0.8}
                    />
                    <BespokeStepCard
                        icon={<EnvelopeSimpleIcon weight="duotone" className="w-8 h-8 text-purple-500" />}
                        title="Notification"
                        step="02"
                        description="Email update regarding your status within 5-7 days."
                        delay={0.9}
                    />
                    <BespokeStepCard
                        icon={<CheckIcon weight="duotone" className="w-8 h-8 text-orange-500" />}
                        title="Onboarding"
                        step="03"
                        description="Invitation to the accelerator dashboard for successful applicants."
                        delay={1.0}
                    />
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
                >
                    <Link href="/profile">
                        <Button size="lg" className="w-full sm:w-auto px-8 h-14 rounded-full text-base font-semibold shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all transform hover:scale-[1.02]">
                            <UserIcon weight="bold" className="mr-2 w-5 h-5" />
                            Go to Profile
                            <CaretRightIcon weight="bold" className="ml-2 w-4 h-4 opacity-70" />
                        </Button>
                    </Link>

                    <Link href="/">
                        <Button variant="ghost" size="lg" className="w-full sm:w-auto px-8 h-14 rounded-full text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50">
                            <HouseIcon weight="bold" className="mr-2 w-5 h-5" />
                            Return Home
                        </Button>
                    </Link>
                </motion.div>

            </div>
        </div>
    );
}

function BespokeStepCard({ icon, title, step, description, delay }: { icon: React.ReactNode, title: string, step: string, description: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 font-bold text-4xl text-slate-900 group-hover:scale-110 transition-transform duration-500 select-none">
                {step}
            </div>

            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-slate-100 transition-colors duration-300">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                {description}
            </p>
        </motion.div>
    );
}
