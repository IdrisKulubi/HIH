import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";

export function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gray-900 text-white">
      {/* Background Video with overlay */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-brand-blue/90"></div>

        {/* Abstract shapes for visual interest */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#c91e26] opacity-5 -skew-x-12 transform translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-[#c91e26] opacity-5 skew-x-12 transform -translate-x-1/2"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 py-20">
        <motion.div
          className="max-w-5xl mx-auto text-center space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Partnership Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-4"
          >
            <span className="text-sm font-medium text-cyan-50">HiH Eastern Africa,Embassy of Sweden & HiH Sweden</span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]"
            variants={itemVariants}
          >
            Building Inclusive & <br />
            <span className="text-white">Resilient Enterprises</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-cyan-100 max-w-3xl mx-auto leading-relaxed font-light"
            variants={itemVariants}
          >
            Transforming Kenya&apos;s Micro and Small Enterprises through <span className="font-semibold text-white">Funding</span>, <span className="font-semibold text-white">Mentorship</span>, and <span className="font-semibold text-white">Market Access</span>.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full bg-brand-blue text-white hover:bg-brand-blue/90 px-8 py-6 text-lg font-bold shadow-xl shadow-[#c91e26]/20 transition-all duration-300 transform hover:-translate-y-1"
              asChild
            >
              <Link href="/apply" className="flex items-center gap-2">
                Apply Now
                <ArrowRight className="w-5 h-5" weight="bold" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-bold backdrop-blur-sm transition-all duration-300 bg-transparent"
              asChild
            >
              <Link href="#eligibility" className="flex items-center gap-2">
                Check Eligibility
                <CheckCircle className="w-5 h-5" weight="bold" />
              </Link>
            </Button>
          </motion.div>

          {/* Trust Indicators / Stats Preview */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pt-12 border-t border-white/10 mt-12"
          >
            {[
              { label: "Enterprises", value: "700" },
              { label: "Jobs Created", value: "12k+" },
              { label: "Counties", value: "47" },
              { label: "Duration", value: "3 Years" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-cyan-200 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

