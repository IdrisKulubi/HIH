import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CaretDownIcon, QuestionIcon } from "@phosphor-icons/react";
import { SupportModal } from "@/components/support/support-modal";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const faqs = [
  {
    question: "What is the BIRE Programme?",
    answer: "The Building Inclusive & Resilient Enterprises (BIRE) Programme is a partnership between Hand in Hand Eastern Africa and the Embassy of Sweden. It supports Kenyan MSEs with funding, mentorship, and market access to build resilience and inclusivity."
  },
  {
    question: "Which track should I apply for?",
    answer: "Apply for the **Foundation Phase** (Track 1) if you are an early-stage business verifying your model (Revenue < KES 3M). Apply for the **Acceleration Phase** (Track 2) if you are a growth-ready enterprise looking to scale and export (Revenue > KES 3M)."
  },
  {
    question: "Who is eligible to apply?",
    answer: "We welcome registered Micro and Small Enterprises (MSEs) in Kenya. We have specific targets for Women-Led (50%), Youth-Led (40%), and businesses including Persons with Disabilities. Your business must be operational for at least 6 months."
  },
  {
    question: "What kind of support is provided?",
    answer: "Participants receive business training, one-on-one coaching, access to innovation grants (Foundation) or matching funds (Acceleration), and links to larger markets and investors."
  },
  {
    question: "Is there an application fee?",
    answer: "No, applying to the BIRE Programme is completely free. We will never ask you for money to process your application."
  },
  {
    question: "What are the selection criteria?",
    answer: "We look at your business model, commercial viability, social impact (jobs created, inclusivity), and potential for growth. Climate-smart businesses are highly encouraged."
  },
  {
    question: "How long is the program?",
    answer: "The program runs for approximately 12 months, including the simplified onboarding, training/advisory phase, and graduation."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const openSupportModal = () => {
    setIsSupportModalOpen(true);
  };

  const closeSupportModal = () => {
    setIsSupportModalOpen(false);
  };

  return (
    <section className="py-24 relative z-10 overflow-hidden">
      {/* Background Elements - updated to be subtle on top of global canvas */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D0AB]/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0B5FBA]/10 rounded-full blur-3xl -z-10"></div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div>
              <span className="inline-block px-4 py-2 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-semibold mb-6 border border-brand-blue/20">
                Frequently Asked Questions
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-brand-blue">
                Got Questions?
              </span>
              <br />
              <span className="text-slate-800">We Have Answers</span>
            </h2>

            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Find answers to the most common questions about the BIRE Programme.
              Can&apos;t find what you&apos;re looking for? Contact our team directly.
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto">
          {faqs.map((faq, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="mb-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50/50 transition-colors duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors duration-200">
                        <QuestionIcon className="w-5 h-5 text-brand-blue" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 group-hover:text-brand-blue transition-colors">
                        {faq.question}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="shrink-0"
                    >
                      <CaretDownIcon className="w-5 h-5 text-slate-500 group-hover:text-brand-blue transition-colors" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <div className="pl-14">
                            <div className="w-full h-px bg-brand-blue/20 mb-4"></div>
                            <p className="text-slate-600 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={0.5}>
          <div className="text-center mt-16">
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Still have questions? Our team is here to help you navigate the application process.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                onClick={openSupportModal}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/80 border-2 border-brand-blue text-brand-blue font-semibold hover:bg-brand-blue hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <QuestionIcon className="w-5 h-5" />
                <span>Contact Support</span>
              </motion.button>

              <motion.a
                href="/apply"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand-blue text-white font-semibold hover:bg-brand-blue/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Start Your Application</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.a>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={closeSupportModal}
        defaultCategory="general_inquiry"
        defaultSubject="Question about BIRE Programme"
        context="FAQ Section - User has questions about the application process"
      />
    </section>
  );
}
