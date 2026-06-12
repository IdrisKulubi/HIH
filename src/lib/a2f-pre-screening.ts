export type PreScreeningTrack = "foundation" | "acceleration";
export type PreScreeningOutcome = "pass" | "conditional" | "stop";

export const PRE_SCREENING_CRITERION_IDS = [
  "revenue",
  "revenueMomentum",
  "coInvestment",
  "marketDemand",
  "scalability",
  "differentiation",
  "employment",
  "inclusion",
  "environment",
  "investmentIntent",
  "leverage",
  "innovation",
] as const;

export type PreScreeningCriterionId =
  (typeof PRE_SCREENING_CRITERION_IDS)[number];
export type PreScreeningRatings = Record<PreScreeningCriterionId, string>;

export interface PreScreeningOption {
  id: string;
  label: string;
  score: number;
  hardStop?: boolean;
}

export interface PreScreeningCriterion {
  id: PreScreeningCriterionId;
  number: string;
  category: string;
  title: string;
  question: string;
  evidence: string;
  rationale: string;
  maxScore: number;
  options: Record<PreScreeningTrack, PreScreeningOption[]>;
  derived?: boolean;
}

export const PRE_SCREENING_CRITERIA: PreScreeningCriterion[] = [
  {
    id: "revenue",
    number: "1.1",
    category: "Financial Readiness & Co-Investment",
    title: "Operational Status & Revenue Range",
    question:
      "Is the enterprise actively trading and within the annual revenue range for its assigned track?",
    evidence:
      "Use the verified annual revenue on the enterprise record and corroborate active operations during assessment.",
    rationale:
      "Revenue is the primary programme eligibility gate and determines the correct enterprise track.",
    maxScore: 10,
    derived: true,
    options: {
      foundation: [
        { id: "strong", label: "KES 2M-3M; clearly active", score: 10 },
        { id: "moderate", label: "KES 1M-2M; active operations", score: 6 },
        { id: "weak", label: "KES 500K-1M; limited activity", score: 3 },
        { id: "fail", label: "Outside Foundation range", score: 0, hardStop: true },
      ],
      acceleration: [
        { id: "strong", label: "Above KES 5M; well-established", score: 10 },
        { id: "moderate", label: "KES 3.5M-5M; growing", score: 6 },
        { id: "weak", label: "KES 3M-3.5M; borderline", score: 3 },
        { id: "fail", label: "Below Accelerator range", score: 0, hardStop: true },
      ],
    },
  },
  {
    id: "revenueMomentum",
    number: "1.2",
    category: "Financial Readiness & Co-Investment",
    title: "Revenue Momentum & Growth Trajectory",
    question: "Is revenue growing, stable, or declining over the last 12 months?",
    evidence:
      "Ask how current sales compare with six and twelve months ago and test the answer against visible activity.",
    rationale:
      "Growth trajectory is more predictive of post-investment success than a single revenue snapshot.",
    maxScore: 5,
    options: {
      foundation: [
        { id: "strong", label: "Clearly growing with specific new customers or channels", score: 5 },
        { id: "moderate", label: "Stable with no significant decline", score: 3 },
        { id: "fail", label: "Declining or highly erratic revenue", score: 0, hardStop: true },
      ],
      acceleration: [
        { id: "strong", label: "Sustained growth above 20% year-on-year", score: 5 },
        { id: "moderate", label: "Growth of 10-20% or stable", score: 3 },
        { id: "fail", label: "Flat or declining at Accelerator scale", score: 0, hardStop: true },
      ],
    },
  },
  {
    id: "coInvestment",
    number: "1.3",
    category: "Financial Readiness & Co-Investment",
    title: "Owner Co-Investment Willingness & Capacity",
    question:
      "Is the owner willing and credibly able to contribute resources alongside a BIRE grant?",
    evidence:
      "Ask what the owner would contribute and assess whether the amount and source are specific and plausible.",
    rationale: "Co-investment is mandatory under the matching grant model.",
    maxScore: 5,
    options: {
      foundation: [
        { id: "strong", label: "Specific and plausible cash, asset, or in-kind contribution", score: 5 },
        { id: "moderate", label: "Willing but vague; a resource base is plausible", score: 3 },
        { id: "fail", label: "Unwilling or no credible means to co-invest", score: 0, hardStop: true },
      ],
      acceleration: [
        { id: "strong", label: "At least 40% own contribution is credible", score: 5 },
        { id: "moderate", label: "25-39% contribution is plausible", score: 3 },
        { id: "fail", label: "Below 25% or no credible capacity", score: 0, hardStop: true },
      ],
    },
  },
  {
    id: "marketDemand",
    number: "2.1",
    category: "Market & Scalability Potential",
    title: "Market Demand & Customer Base",
    question: "Does the enterprise have real, recurring demand beyond the owner's immediate community?",
    evidence:
      "Ask about repeat customers, unmet orders, B2B relationships, off-take arrangements, and value-chain participation.",
    rationale: "Demand-side risk is a leading cause of enterprise failure after investment.",
    maxScore: 8,
    options: {
      foundation: [
        { id: "strong", label: "Repeat customers plus B2B or value-chain relationships", score: 8 },
        { id: "moderate", label: "Some recurring customers; mainly informal market", score: 5 },
        { id: "weak", label: "Ad hoc sales with no established relationships", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Documented demand, contracts, off-take, or formal buyers", score: 8 },
        { id: "moderate", label: "Growing pipeline with emerging formal linkages", score: 5 },
        { id: "weak", label: "Limited to local informal markets", score: 2 },
      ],
    },
  },
  {
    id: "scalability",
    number: "2.2",
    category: "Market & Scalability Potential",
    title: "Scalability of Business Model",
    question: "Can output, revenue, or reach grow without costs increasing proportionally?",
    evidence:
      "Ask what would need to change to double sales and whether the main constraint is addressable capital or structure.",
    rationale: "Scalable enterprises produce more employment and impact per shilling invested.",
    maxScore: 8,
    options: {
      foundation: [
        { id: "strong", label: "Clear path to scale; capital is the main constraint", score: 8 },
        { id: "moderate", label: "Growth is possible but structural constraints remain", score: 5 },
        { id: "weak", label: "Growth requires fundamental redesign", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Scale demonstrated through sites, products, or channels", score: 8 },
        { id: "moderate", label: "Credible but untested scale with sound unit economics", score: 5 },
        { id: "weak", label: "Growth has plateaued or remains owner-dependent", score: 2 },
      ],
    },
  },
  {
    id: "differentiation",
    number: "2.3",
    category: "Market & Scalability Potential",
    title: "Competitive Differentiation",
    question: "Why would customers choose this enterprise over sector peers?",
    evidence:
      "Ask for specific product, service, price, technology, location, brand, or relationship advantages.",
    rationale: "Differentiated enterprises better defend margins and remain resilient.",
    maxScore: 9,
    options: {
      foundation: [
        { id: "strong", label: "Specific, credible, hard-to-replicate differentiation", score: 9 },
        { id: "moderate", label: "A genuine advantage that is not strongly protected", score: 5 },
        { id: "weak", label: "No meaningful distinction from peers", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Strong moat such as IP, brand, process, or exclusivity", score: 9 },
        { id: "moderate", label: "Relative advantage peers have not matched", score: 5 },
        { id: "weak", label: "Highly competitive market with no evident edge", score: 2 },
      ],
    },
  },
  {
    id: "employment",
    number: "3.1",
    category: "Impact & Inclusion Potential",
    title: "Employment Creation Potential",
    question: "How many credible decent jobs could be created within 12-24 months?",
    evidence: "Ask for the number and type of roles, then compare the claim with current scale and model.",
    rationale: "Decent job creation is a primary BIRE outcome.",
    maxScore: 10,
    options: {
      foundation: [
        { id: "strong", label: "Three or more credible new decent jobs", score: 10 },
        { id: "moderate", label: "One or two credible new roles", score: 6 },
        { id: "weak", label: "Model is unlikely to create meaningful employment", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Five or more credible new decent jobs", score: 10 },
        { id: "moderate", label: "Three or four credible new roles", score: 6 },
        { id: "weak", label: "Only one or two new roles are plausible", score: 2 },
      ],
    },
  },
  {
    id: "inclusion",
    number: "3.2",
    category: "Impact & Inclusion Potential",
    title: "Inclusion Profile",
    question: "Does ownership, employment, or intended hiring meaningfully include women, youth, or PWDs?",
    evidence: "Review ownership and workforce composition and ask who future recruitment would target.",
    rationale: "The programme requires deliberate gender and social inclusion outcomes.",
    maxScore: 10,
    options: {
      foundation: [
        { id: "strong", label: "Target-group owner or majority target-group workforce", score: 10 },
        { id: "moderate", label: "Some current or planned inclusion", score: 6 },
        { id: "weak", label: "No evident inclusion dimension or intent", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "At least 50% workforce or leadership from target groups", score: 10 },
        { id: "moderate", label: "30-49% or an active inclusion policy", score: 6 },
        { id: "weak", label: "Below 30% with no improvement strategy", score: 2 },
      ],
    },
  },
  {
    id: "environment",
    number: "3.3",
    category: "Impact & Inclusion Potential",
    title: "Environmental & Climate Relevance",
    question: "Does the enterprise create environmental benefit or avoid significant harm?",
    evidence: "Ask about waste, energy, inputs, sourcing, and climate practices and observe operating conditions.",
    rationale: "BIRE seeks climate resilience and green-economy outcomes alongside jobs.",
    maxScore: 10,
    options: {
      foundation: [
        { id: "strong", label: "Clear environmental or climate benefit", score: 10 },
        { id: "moderate", label: "Some awareness, no significant harm, limited benefit", score: 6 },
        { id: "weak", label: "No environmental dimension or notable harm", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Measurable environmental benefit with evidence", score: 10 },
        { id: "moderate", label: "Benefit exists but is not quantified or embedded", score: 6 },
        { id: "weak", label: "No strategy or operations pose environmental risk", score: 2 },
      ],
    },
  },
  {
    id: "investmentIntent",
    number: "4.1",
    category: "Investment Plan & Leverage Potential",
    title: "Clarity of Investment Intent",
    question: "Can the owner explain specifically what support would fund and why?",
    evidence: "Ask for the first investment priority, expected result, sequencing, and approximate cost.",
    rationale: "Specific investment intent predicts productive use of funds.",
    maxScore: 7,
    options: {
      foundation: [
        { id: "strong", label: "Specific, milestone-linked investment intent", score: 7 },
        { id: "moderate", label: "Sensible intent with limited specificity", score: 4 },
        { id: "weak", label: "Vague or generic use of funds", score: 1 },
      ],
      acceleration: [
        { id: "strong", label: "Priority-linked plan with costing and implementation logic", score: 7 },
        { id: "moderate", label: "Credible areas identified; costing or sequence unclear", score: 4 },
        { id: "weak", label: "No coherent investment plan", score: 1 },
      ],
    },
  },
  {
    id: "leverage",
    number: "4.2",
    category: "Investment Plan & Leverage Potential",
    title: "Follow-on Finance Potential",
    question: "Could the enterprise attract additional finance alongside or after BIRE support?",
    evidence: "Ask about borrowing history, financial institution relationships, and investor interest.",
    rationale: "Follow-on capital multiplies programme impact.",
    maxScore: 8,
    options: {
      foundation: [
        { id: "strong", label: "Active loan or recent formal borrowing relationship", score: 8 },
        { id: "moderate", label: "Open to finance with a credible borrowing basis", score: 5 },
        { id: "weak", label: "No finance relationship and resistant or unaware", score: 2 },
      ],
      acceleration: [
        { id: "strong", label: "Active investor or DFI relationships; capital-raise potential", score: 8 },
        { id: "moderate", label: "Formal finance history and open to investment", score: 5 },
        { id: "weak", label: "No formal finance history; limited leverage potential", score: 2 },
      ],
    },
  },
  {
    id: "innovation",
    number: "5.1",
    category: "Innovation",
    title: "Innovation Signal",
    question: "Is there credible innovation in product, process, technology, market approach, or business model?",
    evidence: "Ask what is done differently and observe non-standard processes, tools, materials, or channels.",
    rationale: "The Innovation Fund should support meaningfully different rather than purely replicated models.",
    maxScore: 10,
    options: {
      foundation: [
        { id: "strong", label: "Specific innovation with observable evidence", score: 10 },
        { id: "moderate", label: "Credible novel practice with limited evidence", score: 6 },
        { id: "weak", label: "Standard model with little differentiation", score: 2 },
        { id: "fail", label: "Direct copy with no innovation", score: 0, hardStop: true },
      ],
      acceleration: [
        { id: "strong", label: "Evidence of innovation across two or more areas", score: 10 },
        { id: "moderate", label: "Clear innovation in at least one area", score: 6 },
        { id: "weak", label: "Minimal innovation; largely standard model", score: 2 },
        { id: "fail", label: "Purely replicative with no credible innovation", score: 0, hardStop: true },
      ],
    },
  },
];

export const PRE_SCREENING_CATEGORY_MAX = {
  "Financial Readiness & Co-Investment": 20,
  "Market & Scalability Potential": 25,
  "Impact & Inclusion Potential": 30,
  "Investment Plan & Leverage Potential": 15,
  Innovation: 10,
} as const;

export function getRevenueRating(
  track: PreScreeningTrack,
  annualRevenue: number
): string {
  if (track === "acceleration") {
    if (annualRevenue > 5_000_000) return "strong";
    if (annualRevenue >= 3_500_000) return "moderate";
    if (annualRevenue > 3_000_000) return "weak";
    return "fail";
  }
  if (annualRevenue >= 2_000_000 && annualRevenue <= 3_000_000) return "strong";
  if (annualRevenue >= 1_000_000 && annualRevenue < 2_000_000) return "moderate";
  if (annualRevenue >= 500_000 && annualRevenue < 1_000_000) return "weak";
  return "fail";
}

export function isTrackRevenueValid(
  track: PreScreeningTrack,
  annualRevenue: number
): boolean {
  return getRevenueRating(track, annualRevenue) !== "fail";
}

export function calculatePreScreening(
  track: PreScreeningTrack,
  annualRevenue: number,
  input: Partial<PreScreeningRatings>
) {
  const ratings = {
    ...input,
    revenue: getRevenueRating(track, annualRevenue),
  } as Partial<PreScreeningRatings>;
  const scores: Partial<Record<PreScreeningCriterionId, number>> = {};
  const categoryScores: Record<string, number> = {};
  const hardStopReasons: string[] = [];
  const missing: PreScreeningCriterionId[] = [];

  for (const criterion of PRE_SCREENING_CRITERIA) {
    const rating = ratings[criterion.id];
    const option = criterion.options[track].find((item) => item.id === rating);
    if (!option) {
      missing.push(criterion.id);
      continue;
    }
    scores[criterion.id] = option.score;
    categoryScores[criterion.category] =
      (categoryScores[criterion.category] ?? 0) + option.score;
    if (option.hardStop) {
      hardStopReasons.push(`${criterion.number} ${criterion.title}: ${option.label}`);
    }
  }

  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const passThreshold = track === "foundation" ? 60 : 65;
  const conditionalThreshold = passThreshold - 8;
  const outcome: PreScreeningOutcome =
    hardStopReasons.length > 0 || totalScore < conditionalThreshold
      ? "stop"
      : totalScore >= passThreshold
        ? "pass"
        : "conditional";

  return {
    ratings: ratings as PreScreeningRatings,
    scores: scores as Record<PreScreeningCriterionId, number>,
    categoryScores,
    hardStopReasons,
    missing,
    totalScore,
    passThreshold,
    conditionalThreshold,
    outcome,
  };
}
