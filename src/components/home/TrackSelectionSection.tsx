import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, ArrowRight } from "@phosphor-icons/react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const tracks = [
    {
        title: "Foundation Phase",
        icon: "🌱",
        description: "For early-stage entrepreneurs validating their business models.",
        focus: "Formalization, Product Validation, Basic Market Access",
        revenue: "KES 500k – 3M/year",
        benefits: [
            "Incubation support & Mentorship",
            "Small Innovation Grants",
            "Business formalization"
        ],
        selection: "500 Enterprises",
        buttonText: "Apply for Foundation",
        href: "/apply/foundation", // We'll need to route this correctly
        variant: "outline",
        color: "border-green-500 text-green-700 bg-green-50",
        hover: "hover:bg-green-100 hover:text-green-800",
        badge: "Early Stage"
    },
    {
        title: "Acceleration Phase",
        icon: "🚀",
        description: "For growth-ready enterprises ready to scale up and export.",
        focus: "Investment Readiness, Export/Regional Markets, Supply Chain",
        revenue: "Revenue > KES 3M/year",
        benefits: [
            "Advanced Business Advisory",
            "Blended Finance & Matching Grants",
            "Investor Deal Rooms"
        ],
        selection: "200 Enterprises",
        buttonText: "Apply for Acceleration",
        href: "/apply/acceleration", // We'll need to route this correctly
        variant: "default",
        color: "bg-[#1da1db] text-white",
        hover: "hover:bg-[#004C97]",
        badge: "Growth Stage"
    }
];

export function TrackSelectionSection() {
    return (
        <section className="py-24 relative z-10" id="tracks">
            <div className="container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-brand-blue font-semibold tracking-wide uppercase text-sm">Our Tracks</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
                            Two distinct tracks for growth.
                        </h2>
                        <p className="text-xl text-gray-600">
                            We support 700 enterprises across two phases. Validated by our system based on your business stage.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {tracks.map((track, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index === 0 ? -100 : 100 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.2 }}
                            className="relative bg-white/90 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-white/20 flex flex-col h-full"
                        >
                            <div className="absolute top-6 right-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${index === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                    }`}>
                                    {track.badge}
                                </span>
                            </div>


                            <h3 className="text-3xl font-bold text-gray-900 mb-2">{track.title}</h3>
                            <p className="text-lg text-gray-600 mb-6 font-medium">{track.description}</p>

                            <div className="space-y-6 flex-grow mb-8">
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Target Revenue</div>
                                    <div className="font-semibold text-gray-900">{track.revenue}</div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Key Benefits</div>
                                    <ul className="space-y-2">
                                        {track.benefits.map((benefit, i) => (
                                            <li key={i} className="flex items-start gap-2 text-gray-700">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" weight="bold" />
                                                <span>{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 mt-auto">
                                <div className="text-center mt-3 text-sm text-gray-400">
                                    Selection: <span className="font-medium text-gray-600">{track.selection}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
