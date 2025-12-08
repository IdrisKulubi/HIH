import { Money, GraduationCap, UsersThree } from "@phosphor-icons/react";
import Image from "next/image";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const features = [
    {
        title: "Access to Finance",
        description: "Unlock catalytic funding to de-risk your business. We offer Innovation Grants, Matching Grants, and links to commercial investors to fuel your growth.",
        icon: Money,
        image: "/images/smes/finance.webp",
    },
    {
        title: "Expert Business Advisory",
        description: "Get tailored mentorship, technical training, and coaching on governance, compliance, and digitization to make your business investor-ready.",
        icon: GraduationCap,
        image: "/images/smes/advice.jpg",
    },
    {
        title: "Market Access & Networks",
        description: "Connect with larger buyers, join cooperatives, and access new markets. We bridge the gap between small enterprises and big opportunities.",
        icon: UsersThree,
        image: "/images/smes/networks.jpg",
    },
];

export function ValuePropositionSection() {
    return (
        <section className="py-24 relative z-10">
            <div className="container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Why Join the BIRE Programme?
                        </h2>
                        <p className="text-xl text-gray-600">
                            We provide holistic support to help your enterprise scale, adapt, and thrive in a competitive market.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {features.map((feature, index) => (
                        <ScrollReveal key={index} delay={index * 0.2}>
                            <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl hover:shadow-brand-blue/20 hover:border-brand-blue/50 transition-all duration-300 h-full flex flex-col">
                                {/* Image Container */}
                                <div className="relative h-56 w-full overflow-hidden">
                                    <Image
                                        src={feature.image}
                                        alt={feature.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>

                                    {/* Icon Overlay */}
                                    <div className="absolute bottom-4 left-6 p-2 bg-white/90 backdrop-blur-md rounded-lg shadow-sm">
                                        <feature.icon className="w-6 h-6 text-brand-blue" weight="duotone" />
                                    </div>
                                </div>

                                {/* Content Container */}
                                <div className="p-8 flex-1 flex flex-col bg-white relative">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-brand-blue transition-colors duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed text-base flex-1">
                                        {feature.description}
                                    </p>

                                   
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
