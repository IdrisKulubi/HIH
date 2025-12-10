"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { EligibilitySection } from "@/components/home/EligibilitySection";
import { FAQSection } from "@/components/home/FAQSection";
import { PartnerLogosSection } from "@/components/home/PartnerLogosSection";
import { Footer } from "@/components/home/Footer";
import { ValuePropositionSection } from "@/components/home/ValuePropositionSection";
import { TrackSelectionSection } from "@/components/home/TrackSelectionSection";
import { JourneySection } from "@/components/home/JourneySection";
import { ImpactStatsSection } from "@/components/home/ImpactStatsSection";
import { ApplicationPrepSection } from "@/components/home/ApplicationPrepSection";
import { FloatingCTA } from "@/components/home/FloatingCTA";

export default function Home() {
  return (
    <div className="relative font-sans text-gray-900">
      <HeroSection />

      <ImpactStatsSection />

      <ValuePropositionSection />

      <TrackSelectionSection />

      <JourneySection />

      <EligibilitySection />

      <ApplicationPrepSection />

      <PartnerLogosSection />

      <FAQSection />

      <Footer />
      <FloatingCTA />
    </div>
  );
}
