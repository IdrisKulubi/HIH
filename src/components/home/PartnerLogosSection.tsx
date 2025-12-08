import Image from "next/image";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function PartnerLogosSection() {
  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-brand-blue">Our Partners</h2>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl py-8 px-8 border border-white/20 shadow-sm max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-20">
              {/* Implemented By */}
              <div className="text-center">
                <span className="block text-xs font-bold text-brand-blue uppercase tracking-widest mb-6">Implemented By</span>
                <div className="flex items-center justify-center gap-8">
                  {/* Hand in Hand Logo */}
                  <div className="relative h-24 w-56">
                    <Image
                      src="/logos/hand.png"
                      alt="Hand in Hand Eastern Africa"
                      fill
                      className="object-contain mix-blend-multiply"
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-px h-20 bg-gray-200"></div>

              {/* Supported By */}
              <div className="text-center">
                <span className="block text-xs font-bold text-brand-blue uppercase tracking-widest mb-6">Supported By</span>
                <div className="flex items-center justify-center gap-8">
                  {/* Embassy of Sweden Logo */}
                  <div className="relative h-24 w-56">
                    <Image
                      src="/logos/sweden.png"
                      alt="Embassy of Sweden Nairobi"
                      fill
                      className="object-contain mix-blend-multiply"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}