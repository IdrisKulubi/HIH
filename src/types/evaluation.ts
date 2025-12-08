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

export interface EvaluationScores {
  // Innovation and Climate Adaptation Focus (35 points)
  climateAdaptationBenefits: number;
  innovativeness: number;
  scalabilityReplicability: number;
  environmentalImpact: number;
  socioeconomicGenderImpact: number;
  
  // Business Viability (31 points)
  entrepreneurshipManagement: number;
  marketPotentialDemand: number;
  financialManagement: number;
  timeFrameFeasibility: number;
  
  // Sectoral and Strategic Alignment (20 points)
  foodSecurityRelevance: number;
  gcaAlignment: number;
  
  // Organizational Capacity and Partnerships (14 points)
  humanResourcesInfrastructure: number;
  technicalExpertise: number;
  experienceTrackRecord: number;
  governanceManagement: number;
  genderInclusionManagement: number;
  riskManagementStrategy: number;
  partnershipsCollaborations: number;
  
  // Notes
  evaluationNotes: string;
}

export const SCORING_SECTIONS: ScoringSection[] = [
  {
    id: 'innovation-climate',
    name: 'Innovation and Climate Adaptation Focus',
    maxPoints: 35,
    criteria: [
      {
        id: 'climateAdaptationBenefits',
        name: 'Demonstratable Climate Adaptation Benefits',
        maxPoints: 10,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Minimal or unclear climate adaptation benefits' },
          { value: 5, label: 'Moderate capacity', description: 'Some climate adaptation benefits with room for improvement' },
          { value: 10, label: 'Strong capacity', description: 'Clear, significant climate adaptation benefits' }
        ]
      },
      {
        id: 'innovativeness',
        name: 'Innovativeness of the Solution',
        maxPoints: 10,
        options: [
          { value: 1, label: 'Conventional idea', description: 'Traditional approach with limited innovation' },
          { value: 5, label: 'Somewhat innovative', description: 'Some innovative elements but not groundbreaking' },
          { value: 10, label: 'Highly innovative', description: 'Novel, creative solution with significant innovation' }
        ]
      },
      {
        id: 'scalabilityReplicability',
        name: 'Scalability and Replicability',
        maxPoints: 5,
        options: [
          { value: 1, label: 'Limited adaptability/scalability', description: 'Difficult to scale or replicate' },
          { value: 3, label: 'Moderate adaptability/scalability', description: 'Some potential for scaling with modifications' },
          { value: 5, label: 'High adaptability/scalability', description: 'Easy to scale and replicate in different contexts' }
        ]
      },
      {
        id: 'environmentalImpact',
        name: 'Environmental Impact',
        maxPoints: 5,
        options: [
          { value: 1, label: 'Minimal environmental impact', description: 'Limited positive environmental effects' },
          { value: 3, label: 'Moderate environmental impact', description: 'Some positive environmental benefits' },
          { value: 5, label: 'Significant environmental impact', description: 'Strong positive environmental outcomes' }
        ]
      },
      {
        id: 'socioeconomicGenderImpact',
        name: 'Socioeconomic and Gender Inclusion Impact',
        maxPoints: 5,
        options: [
          { value: 1, label: 'Limited socioeconomic impact', description: 'Minimal social or economic benefits' },
          { value: 3, label: 'Moderate socioeconomic impact', description: 'Some social and economic benefits' },
          { value: 5, label: 'Substantial socioeconomic impact', description: 'Strong social and economic benefits with gender inclusion' }
        ]
      }
    ]
  },
  {
    id: 'business-viability',
    name: 'Business Viability',
    maxPoints: 31,
    criteria: [
      {
        id: 'entrepreneurshipManagement',
        name: 'Entrepreneurship and Management Capacity',
        maxPoints: 6,
        options: [
          { value: 1, label: 'Limited capacity', description: 'Weak entrepreneurial and management skills' },
          { value: 3, label: 'Average capacity', description: 'Adequate entrepreneurial and management capabilities' },
          { value: 6, label: 'Above average capacity', description: 'Strong entrepreneurial and management expertise' }
        ]
      },
      {
        id: 'marketPotentialDemand',
        name: 'Market Potential and Demand',
        maxPoints: 10,
        options: [
          { value: 1, label: 'Limited potential', description: 'Small or unclear market opportunity' },
          { value: 5, label: 'Moderate potential', description: 'Reasonable market opportunity with some demand' },
          { value: 10, label: 'Strong potential', description: 'Large market opportunity with clear demand' }
        ]
      },
      {
        id: 'financialManagement',
        name: 'Financial Management and Cost-Benefit',
        maxPoints: 10,
        options: [
          { value: 1, label: 'Poor financial management', description: 'Weak financial planning and cost-benefit analysis' },
          { value: 5, label: 'Adequate financial management', description: 'Reasonable financial planning with some analysis' },
          { value: 10, label: 'Excellent financial management', description: 'Strong financial planning with clear cost-benefit analysis' }
        ]
      },
      {
        id: 'timeFrameFeasibility',
        name: 'Time Frame and Feasibility',
        maxPoints: 5,
        options: [
          { value: 1, label: 'Over 36 months', description: 'Long implementation timeline (over 36 months)' },
          { value: 3, label: '12 - 36 months', description: 'Medium implementation timeline (12-36 months)' },
          { value: 5, label: '6-12 months', description: 'Short implementation timeline (6-12 months)' }
        ]
      }
    ]
  },
  {
    id: 'sectoral-alignment',
    name: 'Sectoral and Strategic Alignment',
    maxPoints: 20,
    criteria: [
      {
        id: 'foodSecurityRelevance',
        name: 'Relevance to Food Security and Infrastructure Adaptation Needs',
        maxPoints: 15,
        options: [
          { value: 1, label: 'Limited adaptive capacity', description: 'Minimal relevance to food security and infrastructure adaptation' },
          { value: 8, label: 'Moderate adaptive capacity', description: 'Some relevance to food security and infrastructure needs' },
          { value: 15, label: 'High adaptive capacity', description: 'Strong relevance to food security and infrastructure adaptation' }
        ]
      },
      {
        id: 'gcaAlignment',
        name: 'Alignment with GCA and National/Regional Climate Priorities',
        maxPoints: 5,
        options: [
          { value: 1, label: 'Low alignment', description: 'Minimal alignment with climate priorities' },
          { value: 3, label: 'Moderate alignment', description: 'Some alignment with climate priorities' },
          { value: 5, label: 'High alignment', description: 'Strong alignment with GCA and climate priorities' }
        ]
      }
    ]
  },
  {
    id: 'organizational-capacity',
    name: 'Organizational Capacity and Partnerships',
    maxPoints: 14,
    criteria: [
      {
        id: 'humanResourcesInfrastructure',
        name: 'Human Resources and Infrastructure',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Insufficient human resources and infrastructure' },
          { value: 1, label: 'Moderate capacity', description: 'Adequate human resources and infrastructure' },
          { value: 2, label: 'Strong capacity', description: 'Excellent human resources and infrastructure' }
        ]
      },
      {
        id: 'technicalExpertise',
        name: 'Technical Expertise',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Insufficient technical expertise' },
          { value: 1, label: 'Moderate capacity', description: 'Adequate technical expertise' },
          { value: 2, label: 'Strong capacity', description: 'Excellent technical expertise' }
        ]
      },
      {
        id: 'experienceTrackRecord',
        name: 'Experience and Track Record',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Minimal relevant experience' },
          { value: 1, label: 'Moderate capacity', description: 'Some relevant experience' },
          { value: 2, label: 'Strong capacity', description: 'Strong track record and experience' }
        ]
      },
      {
        id: 'governanceManagement',
        name: 'Governance and Management Structure',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Weak governance and management structure' },
          { value: 1, label: 'Moderate capacity', description: 'Adequate governance and management structure' },
          { value: 2, label: 'Strong capacity', description: 'Excellent governance and management structure' }
        ]
      },
      {
        id: 'genderInclusionManagement',
        name: 'Gender Inclusion in Management Structure',
        maxPoints: 2,
        options: [
          { value: 0, label: 'No gender balance (men)', description: 'Male-dominated management with no gender balance' },
          { value: 1, label: 'Partial gender balance', description: 'Some gender balance in management' },
          { value: 2, label: 'Women-led', description: 'Women-led or strong gender balance in management' }
        ]
      },
      {
        id: 'riskManagementStrategy',
        name: 'Risk Management Strategy',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Weak risk management', description: 'No clear risk management strategy' },
          { value: 1, label: 'Adequate risk management', description: 'Basic risk management approach' },
          { value: 2, label: 'Robust risk management', description: 'Comprehensive risk management strategy' }
        ]
      },
      {
        id: 'partnershipsCollaborations',
        name: 'Partnerships and Collaborations',
        maxPoints: 2,
        options: [
          { value: 0, label: 'Limited capacity', description: 'Few or no strategic partnerships' },
          { value: 1, label: 'Moderate capacity', description: 'Some partnerships and collaborations' },
          { value: 2, label: 'Strong capacity', description: 'Strong network of partnerships and collaborations' }
        ]
      }
    ]
  }
];

export const PASS_THRESHOLD = 60;
export const TOTAL_MAX_SCORE = 100; 