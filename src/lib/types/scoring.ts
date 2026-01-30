// Types for scoring system
export interface ScoringLevel {
  level: string;
  points: number;
  description: string;
}

export interface ScoringCriteriaData {
  id?: number;
  category: string;
  name: string;
  description?: string;
  maxPoints: number;
  weightage?: number;
  scoringLevels: ScoringLevel[];
  evaluationType?: 'manual' | 'auto' | 'hybrid';
  sortOrder?: number;
  isRequired?: boolean;
  track?: 'foundation' | 'acceleration';
}

export interface ScoringConfigurationData {
  id?: number;
  name: string;
  description?: string;
  version: string;
  totalMaxScore: number;
  passThreshold: number;
  criteria: ScoringCriteriaData[];
}

// =============================================================================
// BIRE PROGRAMME - FOUNDATION TRACK SCORING (100 Marks)
// =============================================================================
export const FOUNDATION_SCORING_CONFIG: ScoringConfigurationData = {
  name: "BIRE Programme - Foundation Track",
  description: "Scoring criteria for Foundation Phase - Early-stage ventures with revenues KES 500k-3M",
  version: "1.0",
  totalMaxScore: 100,
  passThreshold: 60,
  criteria: [
    // Commercial Viability (30 Marks)
    {
      category: "Commercial Viability",
      name: "Proof of Sales (Last 1 year revenue)",
      description: "Evaluate the business revenue over the last year",
      maxPoints: 10,
      scoringLevels: [
        { level: "> KES 2M", points: 10, description: "Revenue above 2 million KES" },
        { level: "KES 1M - 2M", points: 5, description: "Revenue between 1-2 million KES" },
        { level: "KES 500k - 1M", points: 2, description: "Revenue between 500k-1M KES" }
      ],
      evaluationType: "manual",
      sortOrder: 1,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Commercial Viability",
      name: "Number of Customers",
      description: "Evaluate the customer base size",
      maxPoints: 10,
      scoringLevels: [
        { level: "> 401 customers", points: 10, description: "Large customer base" },
        { level: "200 - 400 customers", points: 5, description: "Medium customer base" },
        { level: "1 - 200 customers", points: 2, description: "Small customer base" }
      ],
      evaluationType: "manual",
      sortOrder: 2,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Commercial Viability",
      name: "External Fundraising (Received)",
      description: "Has the business received external funding",
      maxPoints: 5,
      scoringLevels: [
        { level: "Yes", points: 5, description: "Has received external funding" },
        { level: "No", points: 1, description: "No external funding received" }
      ],
      evaluationType: "manual",
      sortOrder: 3,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Commercial Viability",
      name: "Digitization",
      description: "Use of digital tools and platforms",
      maxPoints: 5,
      scoringLevels: [
        { level: "Yes", points: 5, description: "Uses digital tools for information/marketing" },
        { level: "No", points: 1, description: "No digital tools used" }
      ],
      evaluationType: "manual",
      sortOrder: 3.5,
      isRequired: true,
      track: "foundation"
    },

    // Business Model (10 Marks)
    {
      category: "Business Model",
      name: "Business Model Description",
      description: "Evaluate the innovation level of the business model",
      maxPoints: 10,
      scoringLevels: [
        { level: "New", points: 10, description: "Innovative new business model" },
        { level: "Relatively New", points: 5, description: "Some innovation in the model" },
        { level: "Existing", points: 2, description: "Traditional/existing business model" }
      ],
      evaluationType: "manual",
      sortOrder: 4,
      isRequired: true,
      track: "foundation"
    },

    // Market Potential (30 Marks)
    {
      category: "Market Potential",
      name: "Relative Pricing",
      description: "Compare pricing to competitors",
      maxPoints: 7,
      scoringLevels: [
        { level: "Lower", points: 7, description: "Priced lower than competitors" },
        { level: "Equal", points: 4, description: "Similar pricing to competitors" },
        { level: "Higher", points: 1, description: "Priced higher than competitors" }
      ],
      evaluationType: "manual",
      sortOrder: 5,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Market Potential",
      name: "Product Differentiation",
      description: "Evaluate product uniqueness in the market",
      maxPoints: 8,
      scoringLevels: [
        { level: "New", points: 8, description: "Unique product/service in the market" },
        { level: "Relatively New", points: 5, description: "Some unique features" },
        { level: "Existing", points: 2, description: "Similar to existing products" }
      ],
      evaluationType: "manual",
      sortOrder: 6,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Market Potential",
      name: "Threat of Substitutes",
      description: "Assess the risk of substitute products",
      maxPoints: 7,
      scoringLevels: [
        { level: "Low", points: 7, description: "Few or no substitutes available" },
        { level: "Moderate", points: 4, description: "Some substitutes exist" },
        { level: "High", points: 0, description: "Many substitutes available" }
      ],
      evaluationType: "manual",
      sortOrder: 7,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Market Potential",
      name: "Ease of Market Entry",
      description: "Evaluate barriers for competitors to enter",
      maxPoints: 8,
      scoringLevels: [
        { level: "Low", points: 8, description: "High barriers to entry for competitors" },
        { level: "Moderate", points: 5, description: "Some barriers exist" },
        { level: "High", points: 1, description: "Easy for competitors to enter" }
      ],
      evaluationType: "manual",
      sortOrder: 8,
      isRequired: true,
      track: "foundation"
    },

    // Social Impact (30 Marks)
    {
      category: "Social Impact",
      name: "Environmental Impact",
      description: "Evaluate environmental sustainability focus",
      maxPoints: 10,
      scoringLevels: [
        { level: "Clearly Defined", points: 10, description: "Strong positive environmental impact" },
        { level: "Neutral", points: 5, description: "Minimal environmental impact" },
        { level: "Not Defined", points: 0, description: "No clear environmental consideration" }
      ],
      evaluationType: "manual",
      sortOrder: 9,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Social Impact",
      name: "Special Groups Employed (Women, Youth, PWD)",
      description: "Number of women, youth, or persons with disabilities employed",
      maxPoints: 10,
      scoringLevels: [
        { level: "> 10 employees", points: 10, description: "More than 10 from special groups" },
        { level: "6 - 9 employees", points: 6, description: "6-9 from special groups" },
        { level: "5 employees", points: 3, description: "5 from special groups" }
      ],
      evaluationType: "manual",
      sortOrder: 10,
      isRequired: true,
      track: "foundation"
    },
    {
      category: "Social Impact",
      name: "Business Compliance",
      description: "Evaluate regulatory compliance status",
      maxPoints: 10,
      scoringLevels: [
        { level: "Fully Compliant", points: 10, description: "All regulatory requirements met" },
        { level: "Partially Compliant", points: 5, description: "Some compliance gaps" },
        { level: "Not Clear", points: 1, description: "Compliance status unclear" }
      ],
      evaluationType: "manual",
      sortOrder: 11,
      isRequired: true,
      track: "foundation"
    }
  ]
};

// =============================================================================
// BIRE PROGRAMME - ACCELERATION TRACK SCORING (100 Marks)
// =============================================================================
export const ACCELERATION_SCORING_CONFIG: ScoringConfigurationData = {
  name: "BIRE Programme - Acceleration Track",
  description: "Scoring criteria for Acceleration Phase - Ventures with revenues above KES 3M demonstrating growth traction",
  version: "1.0",
  totalMaxScore: 100,
  passThreshold: 60,
  criteria: [
    // Revenues & Growth (20 Marks)
    {
      category: "Revenues & Growth",
      name: "Revenue",
      description: "Evaluate annual revenue",
      maxPoints: 5,
      scoringLevels: [
        { level: "> KES 5M", points: 5, description: "Revenue above 5 million KES" },
        { level: "KES 3.5M - 5M", points: 3, description: "Revenue between 3.5-5 million KES" },
        { level: "KES 3M - 3.5M", points: 1, description: "Revenue between 3-3.5 million KES" }
      ],
      evaluationType: "manual",
      sortOrder: 1,
      isRequired: true
    },
    {
      category: "Revenues & Growth",
      name: "Years of Operation",
      description: "Evaluate business operational history",
      maxPoints: 5,
      scoringLevels: [
        { level: "> 4 years", points: 5, description: "More than 4 years operational" },
        { level: "> 3 years", points: 3, description: "More than 3 years operational" },
        { level: "2 years", points: 1, description: "2 years operational" }
      ],
      evaluationType: "manual",
      sortOrder: 2,
      isRequired: true
    },
    {
      category: "Revenues & Growth",
      name: "Future Potential Sales Growth",
      description: "Evaluate projected growth potential",
      maxPoints: 5,
      scoringLevels: [
        { level: "High", points: 5, description: "Strong projected growth" },
        { level: "Moderate", points: 3, description: "Moderate projected growth" },
        { level: "Low", points: 1, description: "Low projected growth" }
      ],
      evaluationType: "manual",
      sortOrder: 3,
      isRequired: true
    },
    {
      category: "Revenues & Growth",
      name: "Funds Raised",
      description: "Has the business raised external funds",
      maxPoints: 5,
      scoringLevels: [
        { level: "Yes", points: 5, description: "Has raised external funds" },
        { level: "No", points: 1, description: "No external funds raised" }
      ],
      evaluationType: "manual",
      sortOrder: 4,
      isRequired: true
    },

    // Impact Potential (20 Marks)
    {
      category: "Impact Potential",
      name: "Current Youth/Women/PWD Employed",
      description: "Number of special groups currently employed",
      maxPoints: 10,
      scoringLevels: [
        { level: "> 10 employees", points: 10, description: "More than 10 from special groups" },
        { level: "6 - 9 employees", points: 6, description: "6-9 from special groups" },
        { level: "5 employees", points: 3, description: "5 from special groups" }
      ],
      evaluationType: "manual",
      sortOrder: 5,
      isRequired: true
    },
    {
      category: "Impact Potential",
      name: "Potential to Create New Jobs (Women/PWD/Youth)",
      description: "Evaluate job creation potential for special groups",
      maxPoints: 10,
      scoringLevels: [
        { level: "High", points: 10, description: "Strong potential for job creation" },
        { level: "Moderate", points: 6, description: "Moderate job creation potential" },
        { level: "Low", points: 3, description: "Limited job creation potential" }
      ],
      evaluationType: "manual",
      sortOrder: 6,
      isRequired: true
    },

    // Scalability (20 Marks)
    {
      category: "Scalability",
      name: "Market Differentiation",
      description: "Evaluate product/service uniqueness",
      maxPoints: 5,
      scoringLevels: [
        { level: "Truly Unique", points: 5, description: "One-of-a-kind offering" },
        { level: "Probably Better", points: 3, description: "Better than competitors" },
        { level: "Undifferentiated", points: 1, description: "Similar to competitors" }
      ],
      evaluationType: "manual",
      sortOrder: 7,
      isRequired: true
    },
    {
      category: "Scalability",
      name: "Competitive Advantage",
      description: "Evaluate competitive positioning",
      maxPoints: 5,
      scoringLevels: [
        { level: "High", points: 5, description: "Strong competitive position" },
        { level: "Moderate", points: 3, description: "Some competitive advantages" },
        { level: "Low", points: 1, description: "Weak competitive position" }
      ],
      evaluationType: "manual",
      sortOrder: 8,
      isRequired: true
    },
    {
      category: "Scalability",
      name: "Offering Focus",
      description: "Evaluate business offering approach",
      maxPoints: 5,
      scoringLevels: [
        { level: "Outcome Focused", points: 5, description: "Focus on customer outcomes" },
        { level: "Solution Focused", points: 3, description: "Focus on solutions" },
        { level: "Feature Focused", points: 1, description: "Focus on features" }
      ],
      evaluationType: "manual",
      sortOrder: 9,
      isRequired: true
    },
    {
      category: "Scalability",
      name: "Sales & Marketing Integration",
      description: "Evaluate sales and marketing alignment",
      maxPoints: 5,
      scoringLevels: [
        { level: "Fully Integrated", points: 5, description: "Sales and marketing fully aligned" },
        { level: "Aligned", points: 3, description: "Some alignment exists" },
        { level: "No Alignment", points: 1, description: "No coordination between sales/marketing" }
      ],
      evaluationType: "manual",
      sortOrder: 10,
      isRequired: true
    },

    // Social & Environmental Impact (20 Marks)
    {
      category: "Social & Environmental Impact",
      name: "Social Impact (Household Income)",
      description: "Evaluate impact on household income improvement",
      maxPoints: 7,
      scoringLevels: [
        { level: "High", points: 7, description: "Significant income improvement" },
        { level: "Moderate", points: 4, description: "Some income improvement" },
        { level: "None", points: 0, description: "No measurable impact" }
      ],
      evaluationType: "manual",
      sortOrder: 11,
      isRequired: true
    },
    {
      category: "Social & Environmental Impact",
      name: "Supplier Involvement",
      description: "Evaluate engagement with suppliers",
      maxPoints: 6,
      scoringLevels: [
        { level: "Direct Engagement", points: 6, description: "Direct engagement with suppliers" },
        { level: "Network Based", points: 3, description: "Network-based supplier engagement" },
        { level: "None", points: 1, description: "No supplier engagement" }
      ],
      evaluationType: "manual",
      sortOrder: 12,
      isRequired: true
    },
    {
      category: "Social & Environmental Impact",
      name: "Environmental Impact",
      description: "Evaluate environmental sustainability",
      maxPoints: 7,
      scoringLevels: [
        { level: "High", points: 7, description: "Strong positive environmental impact" },
        { level: "Moderate", points: 4, description: "Some environmental consideration" },
        { level: "Low", points: 0, description: "Minimal environmental focus" }
      ],
      evaluationType: "manual",
      sortOrder: 13,
      isRequired: true
    },

    // Business Model (20 Marks)
    {
      category: "Business Model",
      name: "Uniqueness",
      description: "Evaluate business model uniqueness",
      maxPoints: 7,
      scoringLevels: [
        { level: "High", points: 7, description: "Highly unique business model" },
        { level: "Moderate", points: 3, description: "Some unique elements" },
        { level: "Low", points: 1, description: "Common business model" }
      ],
      evaluationType: "manual",
      sortOrder: 14,
      isRequired: true
    },
    {
      category: "Business Model",
      name: "Customer Value Proposition",
      description: "Evaluate strength of value proposition",
      maxPoints: 7,
      scoringLevels: [
        { level: "High", points: 7, description: "Strong value proposition" },
        { level: "Moderate", points: 3, description: "Adequate value proposition" },
        { level: "Low", points: 1, description: "Weak value proposition" }
      ],
      evaluationType: "manual",
      sortOrder: 15,
      isRequired: true
    },
    {
      category: "Business Model",
      name: "Competitive Advantage Strength",
      description: "Evaluate sustainability of competitive advantage",
      maxPoints: 6,
      scoringLevels: [
        { level: "High", points: 6, description: "Strong barriers to competition" },
        { level: "Moderate", points: 3, description: "Some protection" },
        { level: "Low", points: 1, description: "Easily replicated" }
      ],
      evaluationType: "manual",
      sortOrder: 16,
      isRequired: true,
      track: "acceleration"
    }
  ]
};

// =============================================================================
// COMBINED DEFAULT CONFIGURATION
// =============================================================================
export const COMBINED_DEFAULT_CONFIG: ScoringConfigurationData = {
  name: "BIRE Programme - Scoring Config v1",
  description: "Standard scoring configuration for both Foundation and Acceleration tracks",
  version: "1.0",
  totalMaxScore: 100,
  passThreshold: 60,
  criteria: [
    ...FOUNDATION_SCORING_CONFIG.criteria.map(c => ({ ...c, track: "foundation" as const })),
    ...ACCELERATION_SCORING_CONFIG.criteria.map(c => ({ ...c, track: "acceleration" as const }))
  ]
};

// Default BIRE Programme scoring configuration
export const DEFAULT_BIRE_SCORING_CONFIG = COMBINED_DEFAULT_CONFIG;

// Backwards compatibility alias (deprecated - use DEFAULT_BIRE_SCORING_CONFIG)
export const DEFAULT_KCIC_SCORING_CONFIG = DEFAULT_BIRE_SCORING_CONFIG;

// Helper to get config by track
export function getScoringConfigByTrack(track: 'foundation' | 'acceleration'): ScoringConfigurationData {
  return track === 'acceleration' ? ACCELERATION_SCORING_CONFIG : FOUNDATION_SCORING_CONFIG;
}
