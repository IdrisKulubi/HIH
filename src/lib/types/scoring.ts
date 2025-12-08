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

// Default KCIC scoring configuration based on your specifications
export const DEFAULT_KCIC_SCORING_CONFIG: ScoringConfigurationData = {
  name: "KCIC Climate Adaptation Challenge - v2.0",
  description: "Updated scoring criteria for YouthAdapt Challenge with enhanced climate adaptation focus",
  version: "2.0",
  totalMaxScore: 100,
  passThreshold: 60,
  criteria: [
    // Innovation and Climate Adaptation Focus (35 points)
    {
      category: "Innovation and Climate Adaptation Focus",
      name: "Demonstratable Climate Adaptation Benefits",
      description: "Evaluate the capacity to demonstrate direct climate adaptation benefits",
      maxPoints: 10,
      weightage: 28.6,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "No clear climate adaptation benefits demonstrated" },
        { level: "Moderate capacity", points: 5, description: "Some climate adaptation benefits shown" },
        { level: "Strong capacity", points: 10, description: "Clear, measurable climate adaptation benefits" }
      ],
      evaluationType: "manual",
      sortOrder: 1,
      isRequired: true
    },
    {
      category: "Innovation and Climate Adaptation Focus",
      name: "Innovativeness of the Solution",
      description: "Assess the level of innovation in the proposed solution",
      maxPoints: 10,
      weightage: 28.6,
      scoringLevels: [
        { level: "Conventional idea", points: 1, description: "Traditional approach with limited innovation" },
        { level: "Somewhat innovative", points: 5, description: "Moderate innovation with some new elements" },
        { level: "Highly innovative", points: 10, description: "Groundbreaking or highly novel approach" }
      ],
      evaluationType: "manual",
      sortOrder: 2
    },
    {
      category: "Innovation and Climate Adaptation Focus",
      name: "Scalability and Replicability",
      description: "Evaluate potential for scaling and replication",
      maxPoints: 5,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited adaptability/scalability", points: 1, description: "Difficult to scale or replicate" },
        { level: "Moderate adaptability/scalability", points: 3, description: "Some potential for scaling" },
        { level: "High adaptability/scalability", points: 5, description: "High potential for scaling and replication" }
      ],
      evaluationType: "manual",
      sortOrder: 3
    },
    {
      category: "Innovation and Climate Adaptation Focus",
      name: "Environmental Impact",
      description: "Assess the environmental impact of the solution",
      maxPoints: 5,
      weightage: 14.3,
      scoringLevels: [
        { level: "Minimal environmental impact", points: 1, description: "Limited positive environmental effects" },
        { level: "Moderate environmental impact", points: 3, description: "Moderate positive environmental effects" },
        { level: "Significant environmental impact", points: 5, description: "Substantial positive environmental impact" }
      ],
      evaluationType: "manual",
      sortOrder: 4
    },
    {
      category: "Innovation and Climate Adaptation Focus",
      name: "Socioeconomic and Gender Inclusion Impact",
      description: "Evaluate socioeconomic benefits and gender inclusion",
      maxPoints: 5,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited socioeconomic impact", points: 1, description: "Minimal socioeconomic benefits" },
        { level: "Moderate socioeconomic impact", points: 3, description: "Some socioeconomic benefits" },
        { level: "Substantial socioeconomic impact", points: 5, description: "Significant socioeconomic benefits with strong gender inclusion" }
      ],
      evaluationType: "manual",
      sortOrder: 5
    },
    
    // Business Viability (31 points)
    {
      category: "Business Viability",
      name: "Entrepreneurship and Management Capacity",
      description: "Assess leadership and management capabilities",
      maxPoints: 6,
      weightage: 19.4,
      scoringLevels: [
        { level: "Limited capacity", points: 1, description: "Weak leadership and management skills" },
        { level: "Average capacity", points: 3, description: "Adequate leadership and management skills" },
        { level: "Above average capacity", points: 6, description: "Strong leadership and management capabilities" }
      ],
      evaluationType: "manual",
      sortOrder: 6
    },
    {
      category: "Business Viability",
      name: "Market Potential and Demand",
      description: "Evaluate market opportunity and demand validation",
      maxPoints: 10,
      weightage: 32.3,
      scoringLevels: [
        { level: "Limited potential", points: 1, description: "Unclear market opportunity" },
        { level: "Moderate potential", points: 5, description: "Some market validation" },
        { level: "Strong potential", points: 10, description: "Clear market demand with strong validation" }
      ],
      evaluationType: "manual",
      sortOrder: 7
    },
    {
      category: "Business Viability",
      name: "Financial Management and Cost-Benefit",
      description: "Assess financial planning and cost-benefit analysis",
      maxPoints: 10,
      weightage: 32.3,
      scoringLevels: [
        { level: "Poor financial management", points: 1, description: "Weak financial planning and unclear cost-benefit" },
        { level: "Adequate financial management", points: 5, description: "Basic financial planning with some cost-benefit analysis" },
        { level: "Excellent financial management", points: 10, description: "Strong financial planning with clear cost-benefit analysis" }
      ],
      evaluationType: "manual",
      sortOrder: 8
    },
    {
      category: "Business Viability",
      name: "Time Frame and Feasibility",
      description: "Evaluate implementation timeline and feasibility",
      maxPoints: 5,
      weightage: 16.1,
      scoringLevels: [
        { level: "Over 36 months", points: 1, description: "Long implementation timeline" },
        { level: "12 - 36 months", points: 3, description: "Moderate implementation timeline" },
        { level: "6-12 months", points: 5, description: "Short, achievable implementation timeline" }
      ],
      evaluationType: "manual",
      sortOrder: 9
    },

    // Sectoral and Strategic Alignment (20 points)
    {
      category: "Sectoral and Strategic Alignment",
      name: "Relevance to Food Security and Infrastructure Adaptation Needs",
      description: "Assess alignment with food security and infrastructure adaptation priorities",
      maxPoints: 15,
      weightage: 75,
      scoringLevels: [
        { level: "Limited adaptive capacity", points: 1, description: "Minimal alignment with food security/infrastructure needs" },
        { level: "Moderate adaptive capacity", points: 8, description: "Some alignment with adaptation needs" },
        { level: "High adaptive capacity", points: 15, description: "Strong alignment with critical adaptation needs" }
      ],
      evaluationType: "manual",
      sortOrder: 10
    },
    {
      category: "Sectoral and Strategic Alignment",
      name: "Alignment with GCA and National and Regional Climate Priorities",
      description: "Evaluate alignment with GCA and national/regional climate priorities",
      maxPoints: 5,
      weightage: 25,
      scoringLevels: [
        { level: "Low alignment", points: 1, description: "Poor alignment with climate priorities" },
        { level: "Moderate alignment", points: 3, description: "Some alignment with climate priorities" },
        { level: "High alignment", points: 5, description: "Strong alignment with climate priorities" }
      ],
      evaluationType: "manual",
      sortOrder: 11
    },

    // Organizational Capacity and Partnerships (14 points)
    {
      category: "Organizational Capacity and Partnerships",
      name: "Human Resources and Infrastructure",
      description: "Assess human resources and infrastructure capacity",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "Insufficient human resources/infrastructure" },
        { level: "Moderate capacity", points: 1, description: "Adequate human resources/infrastructure" },
        { level: "Strong capacity", points: 2, description: "Strong human resources and infrastructure" }
      ],
      evaluationType: "manual",
      sortOrder: 12
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Technical Expertise",
      description: "Evaluate technical expertise and capabilities",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "Limited technical expertise" },
        { level: "Moderate capacity", points: 1, description: "Adequate technical expertise" },
        { level: "Strong capacity", points: 2, description: "Strong technical expertise" }
      ],
      evaluationType: "manual",
      sortOrder: 13
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Experience and Track Record",
      description: "Assess past experience and track record",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "Limited relevant experience" },
        { level: "Moderate capacity", points: 1, description: "Some relevant experience" },
        { level: "Strong capacity", points: 2, description: "Strong track record and experience" }
      ],
      evaluationType: "manual",
      sortOrder: 14
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Governance and Management Structure",
      description: "Evaluate governance and management structure",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "Weak governance structure" },
        { level: "Moderate capacity", points: 1, description: "Adequate governance structure" },
        { level: "Strong capacity", points: 2, description: "Strong governance and management structure" }
      ],
      evaluationType: "manual",
      sortOrder: 15
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Gender Inclusion in Management Structure",
      description: "Assess gender balance in leadership and management",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "No gender balance (men)", points: 0, description: "Male-dominated leadership with no gender balance" },
        { level: "Partial gender balance", points: 1, description: "Some gender balance in leadership" },
        { level: "Women-led", points: 2, description: "Women-led or strong gender balance" }
      ],
      evaluationType: "manual",
      sortOrder: 16
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Risk Management Strategy",
      description: "Evaluate risk identification and management approach",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Weak risk management", points: 0, description: "No clear risk management strategy" },
        { level: "Adequate risk management", points: 1, description: "Basic risk management approach" },
        { level: "Robust risk management", points: 2, description: "Comprehensive risk management strategy" }
      ],
      evaluationType: "manual",
      sortOrder: 17
    },
    {
      category: "Organizational Capacity and Partnerships",
      name: "Partnerships and Collaborations",
      description: "Assess strategic partnerships and collaborative capacity",
      maxPoints: 2,
      weightage: 14.3,
      scoringLevels: [
        { level: "Limited capacity", points: 0, description: "Few or weak partnerships" },
        { level: "Moderate capacity", points: 1, description: "Some strategic partnerships" },
        { level: "Strong capacity", points: 2, description: "Strong partnership network and collaborative approach" }
      ],
      evaluationType: "manual",
      sortOrder: 18
    }
  ]
};
