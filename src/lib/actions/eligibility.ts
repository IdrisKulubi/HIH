/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { eligibilityResults } from "../../../db/schema";
import { revalidatePath } from "next/cache";
import db from "../../../db/drizzle";
import { scoreFoundationTrack, scoreAccelerationTrack, TrackScore } from "./bire-scoring";

// ============================================================================
// BIRE ELIGIBILITY CHECK
// ============================================================================

/**
 * Check eligibility and calculate scores for a BIRE application.
 * Uses track-specific scoring based on Foundation or Acceleration track.
 */
export async function checkEligibility(applicationId: number) {
  try {
    // Fetch application, applicant, and business data
    const application = await db.query.applications.findFirst({
      where: (applications, { eq }) => eq(applications.id, applicationId),
      with: {
        business: {
          with: {
            applicant: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const { business } = application;
    const { applicant } = business;
    const track = application.track as "foundation" | "acceleration" | null;

    // Check mandatory eligibility criteria
    const mandatoryCriteria = checkMandatoryCriteria(business);

    // Calculate track-specific scores
    let trackScore: TrackScore;
    if (track === "acceleration") {
      trackScore = scoreAccelerationTrack(business);
    } else {
      // Default to foundation if track is null or foundation
      trackScore = scoreFoundationTrack(business);
    }

    // Determine overall eligibility
    const isEligible = mandatoryCriteria.isEligible && trackScore.isPassing;

    // Map breakdown to legacy score fields for database compatibility
    const scoreMapping = mapBreakdownToLegacyFields(trackScore, applicant);

    // Extract category totals from breakdown for direct UI display
    const getCategoryScore = (name: string) =>
      trackScore.breakdown.find(b => b.category.toLowerCase().includes(name.toLowerCase()))?.earnedPoints ?? 0;

    // Map to UI display categories (Innovation, Viability, Alignment, Org Capacity)
    // Each bire-scoring category maps to exactly ONE UI category to ensure sum = totalScore
    // 
    // FOUNDATION TRACK (100 pts total):
    //   - Business Model (10 pts) -> Innovation (creativity/uniqueness of business model)
    //   - Commercial Viability (20 pts) -> Viability (revenue, customers, funding)
    //   - Market Potential (30 pts) -> Alignment (market fit, differentiation, competitive position)
    //   - Social Impact (40 pts) -> Org. Capacity (environmental impact, employment, compliance)
    //
    // ACCELERATION TRACK (100 pts total):
    //   - Revenues & Growth (20 pts) -> Viability
    //   - Impact Potential (20 pts) -> Org. Capacity
    //   - Scalability (20 pts) -> Alignment
    //   - Social & Environmental Impact (20 pts) -> Org. Capacity (combined)
    //   - Business Model (20 pts) -> Innovation

    let innovationTotal: number;
    let viabilityTotal: number;
    let alignmentTotal: number;
    let orgCapacityTotal: number;

    if (track === "acceleration") {
      innovationTotal = getCategoryScore("business model");
      viabilityTotal = getCategoryScore("revenues");
      alignmentTotal = getCategoryScore("scalability");
      // Combine Impact Potential + Social & Environmental for Org Capacity
      orgCapacityTotal = getCategoryScore("impact potential") + getCategoryScore("social");
    } else {
      // Foundation track
      innovationTotal = getCategoryScore("business model");
      viabilityTotal = getCategoryScore("commercial");
      alignmentTotal = getCategoryScore("market");
      orgCapacityTotal = getCategoryScore("social");
    }

    // Create or update eligibility result
    const [eligibilityResult] = await db
      .insert(eligibilityResults)
      .values({
        applicationId,
        isEligible,
        ageEligible: mandatoryCriteria.ageEligible,
        registrationEligible: mandatoryCriteria.registrationEligible,
        revenueEligible: mandatoryCriteria.revenueEligible,
        businessPlanEligible: mandatoryCriteria.businessPlanEligible,
        impactEligible: mandatoryCriteria.impactEligible,
        commercialViabilityScore: String(scoreMapping.viabilityScore),
        businessModelScore: String(scoreMapping.innovationScore),
        marketPotentialScore: String(scoreMapping.marketPotentialScore),
        socialImpactScore: String(scoreMapping.climateAdaptationScore),
        revenueGrowthScore: String(scoreMapping.managementCapacityScore),
        scalabilityScore: String(scoreMapping.jobCreationScore),
        totalScore: String(trackScore.totalScore),
        systemScore: String(trackScore.totalScore), // Preserve initial system score
        // Category totals for direct UI display
        innovationTotal: String(innovationTotal),
        viabilityTotal: String(viabilityTotal),
        alignmentTotal: String(alignmentTotal),
        orgCapacityTotal: String(orgCapacityTotal),
      })
      .onConflictDoUpdate({
        target: eligibilityResults.applicationId,
        set: {
          isEligible,
          ageEligible: mandatoryCriteria.ageEligible,
          registrationEligible: mandatoryCriteria.registrationEligible,
          revenueEligible: mandatoryCriteria.revenueEligible,
          businessPlanEligible: mandatoryCriteria.businessPlanEligible,
          impactEligible: mandatoryCriteria.impactEligible,
          commercialViabilityScore: String(scoreMapping.viabilityScore),
          businessModelScore: String(scoreMapping.innovationScore),
          marketPotentialScore: String(scoreMapping.marketPotentialScore),
          socialImpactScore: String(scoreMapping.climateAdaptationScore),
          revenueGrowthScore: String(scoreMapping.managementCapacityScore),
          scalabilityScore: String(scoreMapping.jobCreationScore),
          totalScore: String(trackScore.totalScore),
          systemScore: String(trackScore.totalScore), // Preserve initial system score
          // Category totals for direct UI display
          innovationTotal: String(innovationTotal),
          viabilityTotal: String(viabilityTotal),
          alignmentTotal: String(alignmentTotal),
          orgCapacityTotal: String(orgCapacityTotal),
          updatedAt: new Date(),
        },
      })
      .returning();

    revalidatePath(`/admin/applications/${applicationId}`);

    return {
      success: true,
      data: {
        eligibilityResult,
        trackScore,
      },
    };
  } catch (error) {
    console.error("Error checking eligibility:", error);

    return {
      success: false,
      message: "Failed to check eligibility",
    };
  }
}

// ============================================================================
// MANDATORY CRITERIA CHECK
// ============================================================================

/**
 * Check if business meets mandatory eligibility criteria for BIRE
 */
function checkMandatoryCriteria(business: any): {
  isEligible: boolean;
  ageEligible: boolean;
  registrationEligible: boolean;
  revenueEligible: boolean;
  businessPlanEligible: boolean;
  impactEligible: boolean;
} {
  // BIRE Mandatory: Business must be registered in Kenya
  // We track this but it doesn't disqualify
  const registrationEligible = business.isRegistered === true;

  // BIRE: Age check removed per requirements ("anyone of age can apply")
  // We set this to true to ensure it doesn't flag as a failure
  const ageEligible = true;

  // BIRE Mandatory: Revenue (Tracking only)
  const revenue = typeof business.revenueLastYear === 'string'
    ? parseFloat(business.revenueLastYear)
    : (business.revenueLastYear ?? 0);
  const revenueEligible = revenue >= 500000;

  // BIRE Mandatory: Records (Tracking only)
  const businessPlanEligible = business.hasFinancialRecords === true;

  // BIRE: Impact (Tracking only)
  const impactEligible =
    (business.description?.length ?? 0) > 50 &&
    (business.problemSolved?.length ?? 0) > 50;

  // Overall eligibility: System does not fail anyone, just compiles info
  // As per "system does not fail anyone it just shows the total it compiled"
  const isEligible = true;

  return {
    isEligible,
    ageEligible,
    registrationEligible,
    revenueEligible,
    businessPlanEligible,
    impactEligible,
  };
}

// ============================================================================
// LEGACY FIELD MAPPING
// ============================================================================

/**
 * Map BIRE track scoring breakdown to legacy database fields
 */
function mapBreakdownToLegacyFields(
  trackScore: TrackScore,
  applicant: any
): {
  marketPotentialScore: number;
  innovationScore: number;
  climateAdaptationScore: number;
  jobCreationScore: number;
  viabilityScore: number;
  managementCapacityScore: number;
  locationBonus: number;
  genderBonus: number;
} {
  const breakdown = trackScore.breakdown;

  // Find categories by name
  const findCategory = (name: string) =>
    breakdown.find(b => b.category.toLowerCase().includes(name.toLowerCase()));

  if (trackScore.track === "foundation") {
    // Foundation track mapping
    const commercial = findCategory("Commercial");
    const businessModel = findCategory("Business Model");
    const market = findCategory("Market");
    const social = findCategory("Social");

    return {
      marketPotentialScore: market?.earnedPoints ?? 0,
      innovationScore: businessModel?.earnedPoints ?? 0,
      climateAdaptationScore: social?.earnedPoints ?? 0,
      jobCreationScore: 0, // Not directly in Foundation
      viabilityScore: commercial?.earnedPoints ?? 0,
      managementCapacityScore: 0, // Not directly in Foundation
      locationBonus: 5, // Kenya-based (always qualifies)
      genderBonus: applicant?.gender === "female" ? 5 : 0,
    };
  } else {
    // Acceleration track mapping
    const revenues = findCategory("Revenues");
    const impact = findCategory("Impact Potential");
    const scalability = findCategory("Scalability");
    const socialEnv = findCategory("Social & Environmental");
    const businessModel = findCategory("Business Model");

    return {
      marketPotentialScore: scalability?.earnedPoints ?? 0,
      innovationScore: businessModel?.earnedPoints ?? 0,
      climateAdaptationScore: socialEnv?.earnedPoints ?? 0,
      jobCreationScore: impact?.earnedPoints ?? 0,
      viabilityScore: revenues?.earnedPoints ?? 0,
      managementCapacityScore: 0, // Could be derived from business model
      locationBonus: 5, // Kenya-based (always qualifies)
      genderBonus: applicant?.gender === "female" ? 5 : 0,
    };
  }
}
