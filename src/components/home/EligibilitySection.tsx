import { UsersThree, Sparkle, Sun, Heart, SealCheck } from "@phosphor-icons/react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const eligibilityCriteria = [
  {
    icon: <UsersThree className="w-6 h-6" weight="duotone" />,
    title: "Women-Led Enterprises",
    description:
      "We aim for 50% participation from women entrepreneurs. We're committed to closing the gender gap in business leadership.",
    color: "bg-pink-50/90 border-pink-200 text-pink-600",
  },
  {
    icon: <Sparkle className="w-6 h-6" weight="duotone" />,
    title: "Youth-Led Ventures",
    description:
      "40% of our cohort will be dynamic youth entrepreneurs (18-35 years) driving innovation in the MSE sector.",
    color: "bg-purple-50/90 border-purple-200 text-purple-600",
  },
  {
    icon: <Sun className="w-6 h-6" weight="duotone" />,
    title: "Climate-Smart Business",
    description:
      "Enterprises using green energy, sustainable sourcing, circular economy models, or climate adaptation strategies.",
    color: "bg-green-50/90 border-green-200 text-green-600",
  },
  {
    icon: <Heart className="w-6 h-6" weight="duotone" />,
    title: "PWD Inclusion",
    description:
      "We strongly encourage Persons with Disabilities to apply. Our program is designed to be accessible and inclusive.",
    color: "bg-amber-50/90 border-amber-200 text-amber-600",
  },
];

const checklist = [
  "Registered Micro or Small Enterprise (MSE)",
  "Operating in Kenya",
  "Legal Business Entity",
  "Operational for at least 6 months"
];

export function EligibilitySection() {
  return (
    <section
      id="eligibility"
      className="py-24 relative z-10"
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div>
                <span className="text-brand-blue font-bold tracking-wide uppercase text-sm mb-2 block">Who We Are Looking For</span>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Eligibility & <span className="text-brand-blue">Inclusivity</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  We are looking for registered Micro and Small Enterprises (MSEs) operating in Kenya. We prioritize inclusivity and sustainable business practices.
                </p>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-sm mb-8">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <SealCheck className="w-6 h-6 text-green-600" weight="fill" />
                    Basic Requirements
                  </h3>
                  <ul className="space-y-3">
                    {checklist.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 gap-6">
              {eligibilityCriteria.map((criteria, index) => (
                <ScrollReveal key={index} delay={0.2 + (index * 0.1)}>
                  <div className={`p-6 rounded-2xl border ${criteria.color} backdrop-blur-sm shadow-sm hover:-translate-y-1 transition-transform duration-300 h-full`}>
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                      {criteria.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {criteria.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {criteria.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
