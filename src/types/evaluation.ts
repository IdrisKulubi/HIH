// BIRE Programme Evaluation Types - Foundation and Acceleration Tracks

export interface ScoringCriterion {
  id: string;
  name: string;
  maxPoints: number;
  options: {
    value: number;
    label: string;
    description: string;
  }[];
}

export interface ScoringSection {
  id: string;
  name: string;
  maxPoints: number;
  criteria: ScoringCriterion[];
}

// =============================================================================
// FOUNDATION TRACK SCORING (100 Marks Total)
// =============================================================================

export const FOUNDATION_SCORING_SECTIONS: ScoringSection[] = [
  {
    id: 'commercial-viability',
    name: 'Commercial Viability',
    maxPoints: 30,
    criteria: [
      {
        id: 'revenueProof',
        name: 'Proof of Sales (Last 1 year revenue)',
        maxPoints: 10,
        options: [
          { value: 10, label: '> KES 2M', description: 'Strong revenue above 2 million KES' },
          { value: 5, label: 'KES 1M - 2M', description: 'Moderate revenue between 1-2 million KES' },
          { value: 2, label: 'KES 500k - 1M', description: 'Entry-level revenue between 500k-1M KES' }
        ]
      },
      {
        id: 'customerCount',
        name: 'Number of Customers',
        maxPoints: 10,
        options: [
          { value: 10, label: '> 401 customers', description: 'Large customer base' },
          { value: 5, label: '200 - 400 customers', description: 'Medium customer base' },
          { value: 2, label: '1 - 200 customers', description: 'Small customer base' }
        ]
      },
      {
        id: 'externalFunding',
        name: 'External Fundraising (Received loans/grants)',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Yes', description: 'Has received external funding' },
          { value: 1, label: 'No', description: 'No external funding received' }
        ]
      },
      {
        id: 'digitization',
        name: 'Digitization',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Yes', description: 'Uses digital tools for information/marketing' },
          { value: 1, label: 'No', description: 'No digital tools used' }
        ]
      }
    ]
  },
  {
    id: 'business-model',
    name: 'Business Model',
    maxPoints: 10,
    criteria: [
      {
        id: 'businessModelDescription',
        name: 'Business Model Innovation',
        maxPoints: 10,
        options: [
          { value: 10, label: 'Innovative concept', description: 'New and innovative business model' },
          { value: 5, label: 'Relatively innovative', description: 'Some innovation in the model' },
          { value: 2, label: 'Existing/well-established', description: 'Traditional business model' }
        ]
      }
    ]
  },
  {
    id: 'market-potential',
    name: 'Market Potential',
    maxPoints: 30,
    criteria: [
      {
        id: 'relativePricing',
        name: 'Relative Pricing (Compared to competitors)',
        maxPoints: 7,
        options: [
          { value: 7, label: 'Lower', description: 'Priced lower than competitors' },
          { value: 4, label: 'Equal', description: 'Similar pricing to competitors' },
          { value: 1, label: 'Higher', description: 'Priced higher than competitors' }
        ]
      },
      {
        id: 'productDifferentiation',
        name: 'Product Differentiation',
        maxPoints: 8,
        options: [
          { value: 8, label: 'New', description: 'Unique product/service in the market' },
          { value: 5, label: 'Relatively new', description: 'Some unique features' },
          { value: 2, label: 'Existing', description: 'Similar to existing products' }
        ]
      },
      {
        id: 'threatOfSubstitutes',
        name: 'Threat of Substitutes',
        maxPoints: 7,
        options: [
          { value: 7, label: 'Low', description: 'Few or no substitutes available' },
          { value: 4, label: 'Moderate', description: 'Some substitutes exist' },
          { value: 0, label: 'High', description: 'Many substitutes available' }
        ]
      },
      {
        id: 'easeOfEntry',
        name: 'Ease of Market Entry for Competitors',
        maxPoints: 8,
        options: [
          { value: 8, label: 'Low', description: 'High barriers to entry' },
          { value: 5, label: 'Moderate', description: 'Some barriers exist' },
          { value: 1, label: 'High', description: 'Easy for competitors to enter' }
        ]
      }
    ]
  },
  {
    id: 'social-impact',
    name: 'Social Impact',
    maxPoints: 30,
    criteria: [
      {
        id: 'environmentalImpact',
        name: 'Environmental Impact',
        maxPoints: 10,
        options: [
          { value: 10, label: 'Clearly Defined', description: 'Strong positive environmental impact' },
          { value: 5, label: 'Neutral', description: 'Minimal environmental impact' },
          { value: 0, label: 'Not Defined', description: 'No clear environmental consideration' }
        ]
      },
      {
        id: 'specialGroupsEmployed',
        name: 'Special Groups Employed (Women, Youth, PWD)',
        maxPoints: 10,
        options: [
          { value: 10, label: '> 10 employees', description: 'More than 10 from special groups' },
          { value: 6, label: '6 - 9 employees', description: '6-9 from special groups' },
          { value: 3, label: '5 employees', description: '5 from special groups' }
        ]
      },
      {
        id: 'businessCompliance',
        name: 'Business Compliance Status',
        maxPoints: 10,
        options: [
          { value: 10, label: 'Fully Compliant', description: 'All regulatory requirements met' },
          { value: 5, label: 'Partially Compliant', description: 'Some compliance gaps' },
          { value: 1, label: 'Not clear', description: 'Compliance status unclear' }
        ]
      }
    ]
  }
];

// =============================================================================
// ACCELERATION TRACK SCORING (100 Marks Total)
// =============================================================================

export const ACCELERATION_SCORING_SECTIONS: ScoringSection[] = [
  {
    id: 'revenues-growth',
    name: 'Revenues & Growth',
    maxPoints: 20,
    criteria: [
      {
        id: 'annualRevenue',
        name: 'Annual Revenue',
        maxPoints: 5,
        options: [
          { value: 5, label: '> KES 5M', description: 'Revenue above 5 million KES' },
          { value: 3, label: 'KES 3.5M - 5M', description: 'Revenue between 3.5-5 million KES' },
          { value: 1, label: 'KES 3M - 3.5M', description: 'Revenue between 3-3.5 million KES' }
        ]
      },
      {
        id: 'yearsOfOperation',
        name: 'Years of Operation',
        maxPoints: 5,
        options: [
          { value: 5, label: '> 4 years', description: 'More than 4 years operational' },
          { value: 3, label: '> 3 years', description: 'More than 3 years operational' },
          { value: 1, label: '2 years', description: '2 years operational' }
        ]
      },
      {
        id: 'futureSalesGrowth',
        name: 'Future Potential Sales Growth',
        maxPoints: 5,
        options: [
          { value: 5, label: 'High', description: 'Strong projected growth' },
          { value: 3, label: 'Moderate', description: 'Moderate projected growth' },
          { value: 1, label: 'Low', description: 'Low projected growth' }
        ]
      },
      {
        id: 'fundsRaised',
        name: 'External Funds Raised',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Yes', description: 'Has raised external funds' },
          { value: 1, label: 'No', description: 'No external funds raised' }
        ]
      }
    ]
  },
  {
    id: 'impact-potential',
    name: 'Impact Potential',
    maxPoints: 20,
    criteria: [
      {
        id: 'currentSpecialGroupsEmployed',
        name: 'Current Youth/Women/PWD Employed',
        maxPoints: 10,
        options: [
          { value: 10, label: '> 10 employees', description: 'More than 10 from special groups' },
          { value: 6, label: '6 - 9 employees', description: '6-9 from special groups' },
          { value: 3, label: '5 employees', description: '5 from special groups' }
        ]
      },
      {
        id: 'jobCreationPotential',
        name: 'Potential to Create New Jobs (Women/PWD/Youth)',
        maxPoints: 10,
        options: [
          { value: 10, label: 'High', description: 'Strong potential for job creation' },
          { value: 6, label: 'Moderate', description: 'Moderate job creation potential' },
          { value: 3, label: 'Low', description: 'Limited job creation potential' }
        ]
      }
    ]
  },
  {
    id: 'scalability',
    name: 'Scalability',
    maxPoints: 20,
    criteria: [
      {
        id: 'marketDifferentiation',
        name: 'Market Differentiation',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Truly Unique', description: 'One-of-a-kind offering' },
          { value: 3, label: 'Probably Better', description: 'Better than competitors' },
          { value: 1, label: 'Undifferentiated', description: 'Similar to competitors' }
        ]
      },
      {
        id: 'competitiveAdvantage',
        name: 'Competitive Advantage',
        maxPoints: 5,
        options: [
          { value: 5, label: 'High', description: 'Strong competitive position' },
          { value: 3, label: 'Moderate', description: 'Some competitive advantages' },
          { value: 1, label: 'Low', description: 'Weak competitive position' }
        ]
      },
      {
        id: 'offeringFocus',
        name: 'Offering Focus',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Outcome Focused', description: 'Focus on customer outcomes' },
          { value: 3, label: 'Solution Focused', description: 'Focus on solutions' },
          { value: 1, label: 'Feature Focused', description: 'Focus on features' }
        ]
      },
      {
        id: 'salesMarketingIntegration',
        name: 'Sales & Marketing Integration',
        maxPoints: 5,
        options: [
          { value: 5, label: 'Fully Integrated', description: 'Sales and marketing fully aligned' },
          { value: 3, label: 'Aligned', description: 'Some alignment exists' },
          { value: 1, label: 'No Alignment', description: 'No coordination between sales/marketing' }
        ]
      }
    ]
  },
  {
    id: 'social-environmental-impact',
    name: 'Social & Environmental Impact',
    maxPoints: 20,
    criteria: [
      {
        id: 'socialImpact',
        name: 'Social Impact (Household income improvement)',
        maxPoints: 7,
        options: [
          { value: 7, label: 'High', description: 'Significant income improvement' },
          { value: 4, label: 'Moderate', description: 'Some income improvement' },
          { value: 0, label: 'None', description: 'No measurable impact' }
        ]
      },
      {
        id: 'supplierInvolvement',
        name: 'Supplier Involvement',
        maxPoints: 6,
        options: [
          { value: 6, label: 'Direct Engagement', description: 'Direct engagement with suppliers' },
          { value: 3, label: 'Network Based', description: 'Network-based supplier engagement' },
          { value: 1, label: 'None', description: 'No supplier engagement' }
        ]
      },
      {
        id: 'environmentalImpactAcc',
        name: 'Environmental Impact',
        maxPoints: 7,
        options: [
          { value: 7, label: 'High', description: 'Strong positive environmental impact' },
          { value: 4, label: 'Moderate', description: 'Some environmental consideration' },
          { value: 0, label: 'Low', description: 'Minimal environmental focus' }
        ]
      }
    ]
  },
  {
    id: 'business-model-acc',
    name: 'Business Model',
    maxPoints: 20,
    criteria: [
      {
        id: 'businessModelUniqueness',
        name: 'Business Model Uniqueness',
        maxPoints: 7,
        options: [
          { value: 7, label: 'High', description: 'Highly unique business model' },
          { value: 3, label: 'Moderate', description: 'Some unique elements' },
          { value: 1, label: 'Low', description: 'Common business model' }
        ]
      },
      {
        id: 'customerValueProposition',
        name: 'Customer Value Proposition',
        maxPoints: 7,
        options: [
          { value: 7, label: 'High', description: 'Strong value proposition' },
          { value: 3, label: 'Moderate', description: 'Adequate value proposition' },
          { value: 1, label: 'Low', description: 'Weak value proposition' }
        ]
      },
      {
        id: 'competitiveAdvantageStrength',
        name: 'Competitive Advantage Strength',
        maxPoints: 6,
        options: [
          { value: 6, label: 'High', description: 'Strong barriers to competition' },
          { value: 3, label: 'Moderate', description: 'Some protection' },
          { value: 1, label: 'Low', description: 'Easily replicated' }
        ]
      }
    ]
  }
];

// =============================================================================
// EVALUATION SCORE INTERFACES
// =============================================================================

export interface FoundationEvaluationScores {
  // Commercial Viability (30 marks)
  revenueProof: number;
  customerCount: number;
  externalFunding: number;
  // Business Model (10 marks)
  businessModelDescription: number;
  // Market Potential (30 marks)
  relativePricing: number;
  productDifferentiation: number;
  threatOfSubstitutes: number;
  easeOfEntry: number;
  // Social Impact (40 marks)
  environmentalImpact: number;
  specialGroupsEmployed: number;
  businessCompliance: number;
  // Notes
  evaluationNotes: string;
}

export interface AccelerationEvaluationScores {
  // Revenues & Growth (20 marks)
  annualRevenue: number;
  yearsOfOperation: number;
  futureSalesGrowth: number;
  fundsRaised: number;
  // Impact Potential (20 marks)
  currentSpecialGroupsEmployed: number;
  jobCreationPotential: number;
  // Scalability (20 marks)
  marketDifferentiation: number;
  competitiveAdvantage: number;
  offeringFocus: number;
  salesMarketingIntegration: number;
  // Social & Environmental Impact (20 marks)
  socialImpact: number;
  supplierInvolvement: number;
  environmentalImpactAcc: number;
  // Business Model (20 marks)
  businessModelUniqueness: number;
  customerValueProposition: number;
  competitiveAdvantageStrength: number;
  // Notes
  evaluationNotes: string;
}

// Union type for all evaluation scores
export type EvaluationScores = FoundationEvaluationScores | AccelerationEvaluationScores;

// =============================================================================
// CONSTANTS
// =============================================================================

export const PASS_THRESHOLD = 60; // Both tracks require minimum 60 marks
export const TOTAL_MAX_SCORE = 100;

// Helper to get sections by track
export function getScoringSection(track: 'foundation' | 'acceleration'): ScoringSection[] {
  return track === 'acceleration' ? ACCELERATION_SCORING_SECTIONS : FOUNDATION_SCORING_SECTIONS;
}

// Helper to get default scores by track
export function getDefaultScores(track: 'foundation' | 'acceleration'): EvaluationScores {
  if (track === 'acceleration') {
    return {
      annualRevenue: 0,
      yearsOfOperation: 0,
      futureSalesGrowth: 0,
      fundsRaised: 0,
      currentSpecialGroupsEmployed: 0,
      jobCreationPotential: 0,
      marketDifferentiation: 0,
      competitiveAdvantage: 0,
      offeringFocus: 0,
      salesMarketingIntegration: 0,
      socialImpact: 0,
      supplierInvolvement: 0,
      environmentalImpactAcc: 0,
      businessModelUniqueness: 0,
      customerValueProposition: 0,
      competitiveAdvantageStrength: 0,
      evaluationNotes: ''
    };
  }
  return {
    revenueProof: 0,
    customerCount: 0,
    externalFunding: 0,
    businessModelDescription: 0,
    relativePricing: 0,
    productDifferentiation: 0,
    threatOfSubstitutes: 0,
    easeOfEntry: 0,
    environmentalImpact: 0,
    specialGroupsEmployed: 0,
    businessCompliance: 0,
    evaluationNotes: ''
  };
}