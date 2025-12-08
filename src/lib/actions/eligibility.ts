/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { eligibilityResults } from "../../../db/schema";
import { revalidatePath } from "next/cache";
import db from "../../../db/drizzle";

// Function to calculate age from date of birth
function getAge(birthDate: Date | string): number {
  const today = new Date();
  
  // Convert string date to Date object if needed
  const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDifference = today.getMonth() - birthDateObj.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age;
}

// Check if applicant meets the mandatory criteria
function checkMandatoryCriteria(
  application: any,
  applicant: any,
  business: any,
): {
  isEligible: boolean;
  ageEligible: boolean;
  registrationEligible: boolean;
  revenueEligible: boolean;
  businessPlanEligible: boolean;
  impactEligible: boolean;
} {
  // Age criteria: Between 18-35 years
  const age = getAge(applicant.dateOfBirth);
  const ageEligible = age >= 18 && age <= 35;
  
  // Business registration criteria: Business must be legally registered
  const registrationEligible = business.isRegistered;
  
  // Revenue generation criteria: Business must have generated revenues over 2 years
  const revenueEligible = business.revenueLastTwoYears > 0;
  
  // Business Plan criteria: Must have a SMART business plan
  // This would require a more complex evaluation, for now we'll assume it's based on
  // completeness of the business description and problem statement
  const businessPlanEligible = 
    business.description?.length > 100 && 
    business.problemSolved?.length > 100;
  
  // Impact criteria: Must demonstrate direct impact in food security or infrastructure
  // This would be evaluated from the climate adaptation section
  const impactEligible = 
    business.climateAdaptationContribution?.length > 100 &&
    business.climateExtremeImpact?.length > 100;
  
  // Overall eligibility requires all mandatory criteria to be met
  const isEligible = 
    ageEligible && 
    registrationEligible && 
    revenueEligible && 
    businessPlanEligible && 
    impactEligible;
  
  return {
    isEligible,
    ageEligible,
    registrationEligible,
    revenueEligible,
    businessPlanEligible,
    impactEligible,
  };
}

// Score evaluation criteria (if all mandatory criteria are met)
function scoreEvaluationCriteria(
  application: any,
  applicant: any,
  business: any,
): {
  marketPotentialScore: number;
  innovationScore: number;
  climateAdaptationScore: number;
  jobCreationScore: number;
  viabilityScore: number;
  managementCapacityScore: number;
  locationBonus: number;
  genderBonus: number;
  totalScore: number;
} {
  // Market potential (0-10)
  const marketPotentialScore = Math.min(10, Math.floor(business.customerCountLastSixMonths / 100));
  
  // Innovation level (0-10)
  // Complex evaluation would be needed here, for now we use a placeholder
  const innovationScore = 5; // Placeholder
  
  // Climate adaptation impact (0-20)
  // Complex evaluation would be needed here, for now we use a placeholder
  const climateAdaptationScore = 10; // Placeholder
  
  // Job creation potential (0-10)
  const totalEmployees = 
    business.fullTimeEmployeesMale + 
    business.fullTimeEmployeesFemale + 
    business.partTimeEmployeesMale + 
    business.partTimeEmployeesFemale;
  const jobCreationScore = Math.min(10, totalEmployees);
  
  // Financial viability (0-10)
  // Complex evaluation would be needed here, for now we use a placeholder
  const viabilityScore = 5; // Placeholder
  
  // Management capacity (0-10)
  // Complex evaluation would be needed here, for now we use a placeholder
  const managementCapacityScore = 5; // Placeholder
  
  // Location bonus (0-5)
  // Preference for focus countries
  const focusCountries = ["ghana", "kenya", "nigeria", "rwanda", "tanzania"];
  const locationBonus = focusCountries.includes(business.country) ? 5 : 0;
  
  // Gender balance bonus (0-5)
  // Aim for 50% women-led enterprises
  const isWomanLed = applicant.gender === "female";
  const genderBonus = isWomanLed ? 5 : 0;
  
  // Calculate total score (max 100)
  const totalScore = 
    marketPotentialScore +
    innovationScore +
    climateAdaptationScore +
    jobCreationScore +
    viabilityScore +
    managementCapacityScore +
    locationBonus +
    genderBonus;
  
  return {
    marketPotentialScore,
    innovationScore,
    climateAdaptationScore,
    jobCreationScore,
    viabilityScore,
    managementCapacityScore,
    locationBonus,
    genderBonus,
    totalScore,
  };
}

// Main eligibility check function
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
    
    // Check mandatory criteria
    const mandatoryCriteria = checkMandatoryCriteria(application, applicant, business);
    
    // If all mandatory criteria are met, score evaluation criteria
    let evaluationScores = {
      marketPotentialScore: 0,
      innovationScore: 0,
      climateAdaptationScore: 0,
      jobCreationScore: 0,
      viabilityScore: 0,
      managementCapacityScore: 0,
      locationBonus: 0,
      genderBonus: 0,
      totalScore: 0,
    };
    
    if (mandatoryCriteria.isEligible) {
      evaluationScores = scoreEvaluationCriteria(application, applicant, business);
    }
    
    // Create or update eligibility result
    const [eligibilityResult] = await db
      .insert(eligibilityResults)
      .values({
        applicationId,
        isEligible: mandatoryCriteria.isEligible,
        ageEligible: mandatoryCriteria.ageEligible,
        registrationEligible: mandatoryCriteria.registrationEligible,
        revenueEligible: mandatoryCriteria.revenueEligible,
        businessPlanEligible: mandatoryCriteria.businessPlanEligible,
        impactEligible: mandatoryCriteria.impactEligible,
        marketPotentialScore: evaluationScores.marketPotentialScore,
        innovationScore: evaluationScores.innovationScore,
        climateAdaptationScore: evaluationScores.climateAdaptationScore,
        jobCreationScore: evaluationScores.jobCreationScore,
        viabilityScore: evaluationScores.viabilityScore,
        managementCapacityScore: evaluationScores.managementCapacityScore,
        locationBonus: evaluationScores.locationBonus,
        genderBonus: evaluationScores.genderBonus,
        totalScore: evaluationScores.totalScore,
        // TODO: Add evaluator ID once authentication is implemented
      })
      .onConflictDoUpdate({
        target: eligibilityResults.applicationId,
        set: {
          isEligible: mandatoryCriteria.isEligible,
          ageEligible: mandatoryCriteria.ageEligible,
          registrationEligible: mandatoryCriteria.registrationEligible,
          revenueEligible: mandatoryCriteria.revenueEligible,
          businessPlanEligible: mandatoryCriteria.businessPlanEligible,
          impactEligible: mandatoryCriteria.impactEligible,
          marketPotentialScore: evaluationScores.marketPotentialScore,
          innovationScore: evaluationScores.innovationScore,
          climateAdaptationScore: evaluationScores.climateAdaptationScore,
          jobCreationScore: evaluationScores.jobCreationScore,
          viabilityScore: evaluationScores.viabilityScore,
          managementCapacityScore: evaluationScores.managementCapacityScore,
          locationBonus: evaluationScores.locationBonus,
          genderBonus: evaluationScores.genderBonus,
          totalScore: evaluationScores.totalScore,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    revalidatePath(`/admin/applications/${applicationId}`);
    
    return {
      success: true,
      data: {
        eligibilityResult,
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