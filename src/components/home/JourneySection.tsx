import { ScrollReveal } from "@/components/ui/scroll-reveal";

const steps = [
    {
        number: "01",
        title: "Application",
        description: "Submit your details online. Our system automatically assigns you to the Foundation or Acceleration track.",
        align: "left"
    },
    {
        number: "02",
        title: "Screening",
        description: "Our team reviews eligibility & compliance documentation.",
        align: "center"
    },
    {
        number: "03",
        title: "Selection",
        description: "Scoring, Due Diligence, and site visits for shortlisted candidates.",
        align: "right"
    },
    {
        number: "04",
        title: "Onboarding",
        description: "Successful applicants sign agreements and join the cohort.",
        align: "left"
    },
    {
        number: "05",
        title: "Growth (12 Months)",
        description: "Training, Advisory, and Grant disbursement milestones.",
        align: "center"
    },
    {
        number: "06",
        title: "Graduation",
        description: "Join the Alumni Network & access investor deal rooms.",
        align: "right"
    }
];

export function JourneySection() {
    return (
        <section className="py-24 relative z-10">
            <div className="container mx-auto px-4">
                <ScrollReveal>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-brand-blue font-bold tracking-wide uppercase text-sm">The Process</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                            Your Journey with BIRE
                        </h2>
                    </div>
                </ScrollReveal>

                <div className="relative max-w-6xl mx-auto">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[50%] left-0 w-full h-1 bg-gray-200/50 -translate-y-1/2 z-0"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8 relative z-10">
                        {steps.map((step, index) => (
                            <ScrollReveal key={index} delay={index * 0.1}>
                                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-md border border-white/20 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300 h-full">
                                    <div className="w-12 h-12 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-lg mb-4 shadow-lg ring-4 ring-brand-blue/10 group-hover:bg-brand-red group-hover:text-white transition-colors">
                                        {step.number}
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-600 leading-snug">
                                        {step.description}
                                    </p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
