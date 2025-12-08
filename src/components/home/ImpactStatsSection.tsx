"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const stats = [
    { value: "700", label: "Enterprises Supported" },
    { value: "12,000+", label: "Jobs Created" },
    { value: "$1M+", label: "Additional Revenue" },
    { value: "47", label: "Counties Covered" },
];

export function ImpactStatsSection() {
    return (
        <section className="py-20 bg-brand-blue text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('/images/pattern.png')] bg-repeat"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-2">Our Impact Ambition (2025 - 2028)</h2>
                    <p className="text-cyan-100">Driving measurable change across the Kenyan economy.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"
                        >
                            <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 font-mono">
                                <AnimatedCounter value={stat.value} duration={2} />
                            </div>
                            <div className="text-sm md:text-base font-medium text-white/90 uppercase tracking-wide">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom fade into next section */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
        </section>
    );
}
