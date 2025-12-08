"use client";

import { motion } from "framer-motion";
import { Lightbulb, UsersThree, RocketLaunch, Trophy, CurrencyDollar } from "@phosphor-icons/react";

const features = [
  {
    icon: <Lightbulb className="w-8 h-8" weight="duotone" />,
    title: "Innovation Support",
    description: "Up to $30,000 in funding plus dedicated mentorship from industry experts to develop and scale your climate solution.",
    color: "gca-blue"
  },
  {
    icon: <UsersThree className="w-8 h-8" weight="duotone" />,
    title: "Dragon's Den Pitch Event",
    description: "Exclusive platform to present your solution to investors, partners, and stakeholders in a high-visibility national event.",
    color: "gca-blue"
  },
  {
    icon: <RocketLaunch className="w-8 h-8" weight="duotone" />,
    title: "Accelerated Growth",
    description: "12-month comprehensive program with workshops, technical assistance, and milestone-based support to fast-track your growth.",
    color: "gca-blue"
  },
  {
    icon: <Trophy className="w-8 h-8" weight="duotone" />,
    title: "Networking Opportunities",
    description: "Access to exclusive investor networks, partnership opportunities, and connections with fellow climate entrepreneurs across Africa.",
    color: "gca-green"
  },
  {
    icon: <CurrencyDollar className="w-8 h-8" weight="duotone" />,
    title: "Investment Connections",
    description: "Direct access to our partner investor network and opportunities for follow-on funding to scale your impact.",
    color: "gca-blue"
  },
  {
    icon: <CurrencyDollar className="w-8 h-8" weight="duotone" />,
    title: "Scale-Up Support",
    description: "Comprehensive scaling assistance including strategic partnerships, market expansion guidance, and access to follow-on investment opportunities.",
    color: "gca-green"
  }
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0B5FBA]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00D0AB]/5 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-[#0B5FBA]/10 to-[#00D0AB]/10 text-[#0B5FBA] text-sm font-semibold mb-6 border border-[#0B5FBA]/20">
              Program Benefits
            </span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-[#0B5FBA]">
              What You&apos;ll Get
            </span>
          </h2>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            The In-Country YouthADAPT Challenge offers comprehensive support to transform your climate innovation
            from concept to market-ready solution with measurable impact.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          {features.map((feature, index) => {
            const isGcaBlue = feature.color === "gca-blue";
            const isGcaGreen = feature.color === "gca-green";

            return (
              <motion.div
                key={index}
                className="group relative"
                variants={fadeIn}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`
                  relative p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden
                  ${isGcaBlue ? 'hover:border-[#0B5FBA]/20' : ''}
                  ${isGcaGreen ? 'hover:border-[#00D0AB]/20' : ''}
                `}>
                  {/* Background Gradient */}
                  <div className={`
                    absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${isGcaBlue ? 'bg-gradient-to-br from-[#0B5FBA]/5 to-transparent' : ''}
                    ${isGcaGreen ? 'bg-gradient-to-br from-[#00D0AB]/5 to-transparent' : ''}
                  `}></div>

                  {/* Icon */}
                  <div className={`
                    relative w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300
                    ${isGcaBlue ? 'bg-gradient-to-br from-[#0B5FBA]/10 to-[#0B5FBA]/20' : ''}
                    ${isGcaGreen ? 'bg-gradient-to-br from-[#00D0AB]/10 to-[#00D0AB]/20' : ''}
                  `}>
                    <div className={`
                      ${isGcaBlue ? 'text-[#0B5FBA]' : ''}
                      ${isGcaGreen ? 'text-[#00D0AB]' : ''}
                    `}>
                      {feature.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>


                </div>
              </motion.div>
            );
          })}
        </motion.div>


      </div>
    </section>
  );
} 