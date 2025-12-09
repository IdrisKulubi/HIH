"use server";

/**
 * BIRE Programme Scoring Engine
 * 
 * Implements track-specific scoring based on BIRE selection criteria:
 * - Foundation Track: 100 pts (4 categories) - 70 pass mark
 * - Acceleration Track: 100 pts (5 categories) - 70 pass mark
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScoringBreakdown {
    category: string;
    maxPoints: number;
    earnedPoints: number;
    details: { criterion: string; points: number; maxPoints: number }[];
}

export interface TrackScore {
    track: "foundation" | "acceleration";
    totalScore: number;
    maxScore: number;
    passThreshold: number;
    isPassing: boolean;
    breakdown: ScoringBreakdown[];
}

// ============================================================================
// FOUNDATION TRACK SCORING (100 pts total, 70 pass mark)
// ============================================================================

/**
 * Score a Foundation Track application
 * 
 * Categories:
 * - Commercial Viability: 20 pts
 * - Business Model: 10 pts  
 * - Market Potential: 30 pts
 * - Social Impact: 40 pts
 */
export function scoreFoundationTrack(business: {
    revenueLastYear?: string | number | null;
    customerCount?: number | null;
    hasExternalFunding?: boolean | null;
    businessModelInnovation?: string | null;
    relativePricing?: string | null;
    productDifferentiation?: string | null;
    threatOfSubstitutes?: string | null;
    easeOfMarketEntry?: string | null;
    environmentalImpact?: string | null;
    specialGroupsEmployed?: number | null; // Compatibility legacy
    fullTimeEmployeesWomen?: number | null;
    fullTimeEmployeesYouth?: number | null;
    fullTimeEmployeesPwd?: number | null;
    businessCompliance?: string | null;
}): TrackScore {
    const breakdown: ScoringBreakdown[] = [];

    // === COMMERCIAL VIABILITY (20 pts) ===
    const commercialDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Revenue scoring: >2M (10), 1M-2M (5), 500k-1M (2)
    const revenue = typeof business.revenueLastYear === 'string'
        ? parseFloat(business.revenueLastYear)
        : (business.revenueLastYear ?? 0);
    let revenueScore = 0;
    if (revenue > 2000000) revenueScore = 10;
    else if (revenue >= 1000000) revenueScore = 5;
    else if (revenue >= 500000) revenueScore = 2;
    commercialDetails.push({ criterion: "Revenue (Last Year)", points: revenueScore, maxPoints: 10 });

    // Customer count: >401 (10), 200-400 (5), 1-200 (2)
    const customers = business.customerCount ?? 0;
    let customerScore = 0;
    if (customers > 400) customerScore = 10;
    else if (customers >= 200) customerScore = 5;
    else if (customers >= 1) customerScore = 2;
    commercialDetails.push({ criterion: "Number of Customers", points: customerScore, maxPoints: 10 });

    // External funding: Yes (10), No (5) - Note: Having external funding shows investor confidence
    const fundingScore = business.hasExternalFunding ? 10 : 5;
    commercialDetails.push({ criterion: "External Funding Received", points: fundingScore, maxPoints: 10 });

    const commercialTotal = revenueScore + customerScore + fundingScore;
    breakdown.push({
        category: "Commercial Viability",
        maxPoints: 20,
        earnedPoints: Math.min(commercialTotal, 20), // Cap at 20
        details: commercialDetails
    });

    // === BUSINESS MODEL (10 pts) ===
    const businessModelDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Innovation: New (10), Relatively New (5), Existing (2)
    let innovationScore = 0;
    switch (business.businessModelInnovation) {
        case "innovative_concept":
        case "new": innovationScore = 10; break;
        case "relatively_innovative":
        case "relatively_new": innovationScore = 5; break;
        case "existing": innovationScore = 2; break;
    }
    businessModelDetails.push({ criterion: "Business Model Innovation", points: innovationScore, maxPoints: 10 });

    breakdown.push({
        category: "Business Model",
        maxPoints: 10,
        earnedPoints: innovationScore,
        details: businessModelDetails
    });

    // === MARKET POTENTIAL (30 pts) ===
    const marketDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Relative Pricing: Lower (7), Equal (4), Higher (1)
    let pricingScore = 0;
    switch (business.relativePricing) {
        case "lower": pricingScore = 7; break;
        case "equal": pricingScore = 4; break;
        case "higher": pricingScore = 1; break;
    }
    marketDetails.push({ criterion: "Relative Pricing", points: pricingScore, maxPoints: 7 });

    // Product Differentiation: New (8), Relatively new (5), Existing (2)
    let diffScore = 0;
    switch (business.productDifferentiation) {
        case "new": diffScore = 8; break;
        case "relatively_new": diffScore = 5; break;
        case "existing":
        case "similar": diffScore = 2; break;
    }
    marketDetails.push({ criterion: "Product Differentiation", points: diffScore, maxPoints: 8 });

    // Threat of Substitutes: Low (7), Moderate (4), High (0)
    let substituteScore = 0;
    switch (business.threatOfSubstitutes) {
        case "low": substituteScore = 7; break;
        case "moderate": substituteScore = 4; break;
        case "high": substituteScore = 0; break;
    }
    marketDetails.push({ criterion: "Threat of Substitutes", points: substituteScore, maxPoints: 7 });

    // Ease of Market Entry: Low (8), Moderate (5), High (1)
    let entryScore = 0;
    switch (business.easeOfMarketEntry) {
        case "low": entryScore = 8; break;
        case "moderate": entryScore = 5; break;
        case "high": entryScore = 1; break;
    }
    marketDetails.push({ criterion: "Ease of Market Entry", points: entryScore, maxPoints: 8 });

    const marketTotal = pricingScore + diffScore + substituteScore + entryScore;
    breakdown.push({
        category: "Market Potential",
        maxPoints: 30,
        earnedPoints: marketTotal,
        details: marketDetails
    });

    // === SOCIAL IMPACT (40 pts) ===
    const socialDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Environmental Impact: Clearly Defined (15), Neutral (10), Not Defined (5)
    let envScore = 0;
    switch (business.environmentalImpact) {
        case "clearly_defined": envScore = 15; break;
        case "neutral":
        case "minimal": envScore = 10; break;
        case "not_defined": envScore = 5; break;
    }
    socialDetails.push({ criterion: "Environmental Impact", points: envScore, maxPoints: 15 });

    // Special Groups Employed: >10 (15), 6-9 (10), 5 (5)
    // Calculate from components if available, else default to specialGroupsEmployed (legacy)
    const breakdownSum = (business.fullTimeEmployeesWomen ?? 0) +
        (business.fullTimeEmployeesYouth ?? 0) +
        (business.fullTimeEmployeesPwd ?? 0);
    const specialGroups = breakdownSum > 0 ? breakdownSum : (business.specialGroupsEmployed ?? 0);

    let groupsScore = 0;
    if (specialGroups > 10) groupsScore = 15;
    else if (specialGroups >= 6) groupsScore = 10;
    else if (specialGroups >= 5) groupsScore = 5;
    socialDetails.push({ criterion: "Special Groups Employed (Women/Youth/PWD)", points: groupsScore, maxPoints: 15 });

    // Business Compliance: Fully Compliant (10), Partially Compliant (3), Not clear (1)
    let complianceScore = 0;
    switch (business.businessCompliance) {
        case "fully_compliant": complianceScore = 10; break;
        case "partially_compliant": complianceScore = 3; break;
        case "not_clear": complianceScore = 1; break;
    }
    socialDetails.push({ criterion: "Business Compliance", points: complianceScore, maxPoints: 10 });

    const socialTotal = envScore + groupsScore + complianceScore;
    breakdown.push({
        category: "Social Impact",
        maxPoints: 40,
        earnedPoints: socialTotal,
        details: socialDetails
    });

    // === CALCULATE TOTAL ===
    const totalScore = breakdown.reduce((sum, cat) => sum + cat.earnedPoints, 0);
    const maxScore = 100;
    const passThreshold = 70;

    return {
        track: "foundation",
        totalScore,
        maxScore,
        passThreshold,
        isPassing: totalScore >= passThreshold,
        breakdown
    };
}

// ============================================================================
// ACCELERATION TRACK SCORING (100 pts total, 70 pass mark)
// ============================================================================

/**
 * Score an Acceleration Track application
 * 
 * Categories:
 * - Revenues & Growth: 20 pts
 * - Impact Potential: 20 pts
 * - Scalability: 20 pts
 * - Social & Environmental Impact: 20 pts
 * - Business Model: 20 pts
 */
export function scoreAccelerationTrack(business: {
    revenueLastYear?: string | number | null;
    yearsOperational?: number | null;
    futureSalesGrowth?: string | null;
    hasExternalFunding?: boolean | null;
    currentSpecialGroupsEmployed?: number | null; // Legacy
    fullTimeEmployeesWomen?: number | null;
    fullTimeEmployeesYouth?: number | null;
    fullTimeEmployeesPwd?: number | null;
    jobCreationPotential?: string | null;
    marketDifferentiation?: string | null;
    competitiveAdvantage?: string | null;
    offeringFocus?: string | null;
    salesMarketingIntegration?: string | null;
    socialImpactContribution?: string | null; // Renamed from socialImpactHousehold (partially)
    socialImpactHousehold?: string | null; // Check both
    supplierInvolvement?: string | null;
    environmentalImpact?: string | null;
    businessModelUniqueness?: string | null;
    customerValueProposition?: string | null;
    competitiveAdvantageStrength?: string | null;
}): TrackScore {
    const breakdown: ScoringBreakdown[] = [];

    // === REVENUES & GROWTH (20 pts) ===
    const revenueDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Revenue: >5M (5), 3.5M-5M (3), 3M-3.5M (1)
    const revenue = typeof business.revenueLastYear === 'string'
        ? parseFloat(business.revenueLastYear)
        : (business.revenueLastYear ?? 0);
    let revScore = 0;
    if (revenue > 5000000) revScore = 5;
    else if (revenue >= 3500000) revScore = 3;
    else if (revenue >= 3000000) revScore = 1;
    revenueDetails.push({ criterion: "Annual Revenue", points: revScore, maxPoints: 5 });

    // Years of Operation: >4 years (5), >3 years (3), 2 years (1)
    const years = business.yearsOperational ?? 0;
    let yearsScore = 0;
    if (years > 4) yearsScore = 5;
    else if (years > 3) yearsScore = 3;
    else if (years >= 2) yearsScore = 1;
    revenueDetails.push({ criterion: "Years of Operation", points: yearsScore, maxPoints: 5 });

    // Future Sales Growth: High (5), Moderate (3), Low (1)
    let growthScore = 0;
    switch (business.futureSalesGrowth) {
        case "high": growthScore = 5; break;
        case "moderate": growthScore = 3; break;
        case "low": growthScore = 1; break;
    }
    revenueDetails.push({ criterion: "Future Sales Growth Potential", points: growthScore, maxPoints: 5 });

    // Funds Raised: Yes (5), No (1)
    const fundsScore = business.hasExternalFunding ? 5 : 1;
    revenueDetails.push({ criterion: "External Funds Raised", points: fundsScore, maxPoints: 5 });

    const revenueTotal = revScore + yearsScore + growthScore + fundsScore;
    breakdown.push({
        category: "Revenues & Growth",
        maxPoints: 20,
        earnedPoints: revenueTotal,
        details: revenueDetails
    });

    // === IMPACT POTENTIAL (20 pts) ===
    const impactDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Current Special Groups Employed: >10 (10), 6-9 (6), 5 (3)
    const breakdownSum = (business.fullTimeEmployeesWomen ?? 0) +
        (business.fullTimeEmployeesYouth ?? 0) +
        (business.fullTimeEmployeesPwd ?? 0);
    const currentGroups = breakdownSum > 0 ? breakdownSum : (business.currentSpecialGroupsEmployed ?? 0);

    let currentGroupsScore = 0;
    if (currentGroups > 10) currentGroupsScore = 10;
    else if (currentGroups >= 6) currentGroupsScore = 6;
    else if (currentGroups >= 5) currentGroupsScore = 3;
    impactDetails.push({ criterion: "Current Youth/Women/PWD Employed", points: currentGroupsScore, maxPoints: 10 });

    // Job Creation Potential: High (10), Moderate (6), Low (3)
    let jobScore = 0;
    switch (business.jobCreationPotential) {
        case "high": jobScore = 10; break;
        case "moderate": jobScore = 6; break;
        case "low": jobScore = 3; break;
    }
    impactDetails.push({ criterion: "Job Creation Potential", points: jobScore, maxPoints: 10 });

    const impactTotal = currentGroupsScore + jobScore;
    breakdown.push({
        category: "Impact Potential",
        maxPoints: 20,
        earnedPoints: impactTotal,
        details: impactDetails
    });

    // === SCALABILITY (20 pts) ===
    const scalabilityDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Market Differentiation: Truly Unique (5), Provably Better (3), Undifferentiated (1)
    let diffScore = 0;
    switch (business.marketDifferentiation) {
        case "truly_unique": diffScore = 5; break;
        case "provably_better": diffScore = 3; break;
        case "undifferentiated": diffScore = 1; break;
    }
    scalabilityDetails.push({ criterion: "Market Differentiation", points: diffScore, maxPoints: 5 });

    // Competitive Advantage: High (5), Moderate (3), Low (1)
    let advScore = 0;
    switch (business.competitiveAdvantage) {
        case "high": advScore = 5; break;
        case "moderate": advScore = 3; break;
        case "low": advScore = 1; break;
    }
    scalabilityDetails.push({ criterion: "Competitive Advantage", points: advScore, maxPoints: 5 });

    // Offering Focus: Outcome Focused (5), Solution Focused (3), Feature Focused (1)
    let focusScore = 0;
    switch (business.offeringFocus) {
        case "outcome_focused": focusScore = 5; break;
        case "solution_focused": focusScore = 3; break;
        case "feature_focused": focusScore = 1; break;
    }
    scalabilityDetails.push({ criterion: "Offering Focus", points: focusScore, maxPoints: 5 });

    // Sales & Marketing Integration: Fully Integrated (5), Aligned (3), No Alignment (1)
    let integrationScore = 0;
    switch (business.salesMarketingIntegration) {
        case "fully_integrated": integrationScore = 5; break;
        case "aligned": integrationScore = 3; break;
        case "not_aligned": // fallthrough or different key
        case "no_alignment": integrationScore = 1; break;
        case "not_aligned": integrationScore = 1; break; // handle both cases
    }
    scalabilityDetails.push({ criterion: "Sales & Marketing Integration", points: integrationScore, maxPoints: 5 });

    const scalabilityTotal = diffScore + advScore + focusScore + integrationScore;
    breakdown.push({
        category: "Scalability",
        maxPoints: 20,
        earnedPoints: scalabilityTotal,
        details: scalabilityDetails
    });

    // === SOCIAL & ENVIRONMENTAL IMPACT (20 pts) ===
    const socialDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Social Impact: High (6), Moderate (4), None (0)
    // Map new socialImpactContribution to scores
    let householdScore = 0;
    const socialImpactVal = business.socialImpactContribution || business.socialImpactHousehold;
    switch (socialImpactVal) {
        case "high": householdScore = 6; break;
        case "moderate": householdScore = 4; break;
        case "none": householdScore = 0; break;
    }
    socialDetails.push({ criterion: "Social Impact Score", points: householdScore, maxPoints: 6 });

    // Supplier Involvement: Direct (6), Network (3), None (1)
    let supplierScore = 0;
    switch (business.supplierInvolvement) {
        case "direct_engagement": supplierScore = 6; break;
        case "network_engagement":
        case "network_based": supplierScore = 3; break;
        case "none": supplierScore = 1; break;
    }
    socialDetails.push({ criterion: "Supplier Involvement", points: supplierScore, maxPoints: 6 });

    // Environmental Impact: High (6), Moderate (4), Low (0)
    // Map "clearly_defined", "minimal", "not_defined" to Scoring
    let envScore = 0;
    switch (business.environmentalImpact) {
        case "high":
        case "clearly_defined": envScore = 6; break;
        case "moderate":
        case "minimal": envScore = 4; break;
        case "low":
        case "not_defined": envScore = 0; break;
    }
    socialDetails.push({ criterion: "Environmental Impact", points: envScore, maxPoints: 6 });

    const socialTotal = householdScore + supplierScore + envScore;
    // Note: Max is 18 from criteria, but category max is 20. Add 2 buffer points if all maxed
    const adjustedSocialTotal = Math.min(socialTotal + (socialTotal >= 18 ? 2 : 0), 20);
    breakdown.push({
        category: "Social & Environmental Impact",
        maxPoints: 20,
        earnedPoints: adjustedSocialTotal,
        details: socialDetails
    });

    // === BUSINESS MODEL (20 pts) ===
    const businessModelDetails: { criterion: string; points: number; maxPoints: number }[] = [];

    // Uniqueness: High (7), Moderate (3), Low (1)
    let uniqueScore = 0;
    switch (business.businessModelUniqueness) {
        case "high": uniqueScore = 7; break;
        case "moderate": uniqueScore = 3; break;
        case "low": uniqueScore = 1; break;
    }
    businessModelDetails.push({ criterion: "Business Model Uniqueness", points: uniqueScore, maxPoints: 7 });

    // Customer Value Proposition: High (7), Moderate (3), Low (1)
    let valueScore = 0;
    switch (business.customerValueProposition) {
        case "high": valueScore = 7; break;
        case "moderate": valueScore = 3; break;
        case "low": valueScore = 1; break;
    }
    businessModelDetails.push({ criterion: "Customer Value Proposition", points: valueScore, maxPoints: 7 });

    // Competitive Advantage Strength: High (6), Moderate (3), Low (1)
    let strengthScore = 0;
    switch (business.competitiveAdvantageStrength) {
        case "high": strengthScore = 6; break;
        case "moderate": strengthScore = 3; break;
        case "low": strengthScore = 1; break;
    }
    businessModelDetails.push({ criterion: "Competitive Advantage Strength", points: strengthScore, maxPoints: 6 });

    const businessModelTotal = uniqueScore + valueScore + strengthScore;
    breakdown.push({
        category: "Business Model",
        maxPoints: 20,
        earnedPoints: businessModelTotal,
        details: businessModelDetails
    });

    // === CALCULATE TOTAL ===
    const totalScore = breakdown.reduce((sum, cat) => sum + cat.earnedPoints, 0);
    const maxScore = 100;
    const passThreshold = 70;

    return {
        track: "acceleration",
        totalScore,
        maxScore,
        passThreshold,
        isPassing: totalScore >= passThreshold,
        breakdown
    };
}

// ============================================================================
// UNIFIED SCORING FUNCTION
// ============================================================================

/**
 * Score an application based on its track
 */
export function scoreApplication(
    track: "foundation" | "acceleration",
    business: Record<string, unknown>
): TrackScore {
    if (track === "foundation") {
        return scoreFoundationTrack(business as Parameters<typeof scoreFoundationTrack>[0]);
    } else {
        return scoreAccelerationTrack(business as Parameters<typeof scoreAccelerationTrack>[0]);
    }
}
