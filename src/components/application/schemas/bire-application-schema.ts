

import { z } from "zod";

// === APPLICANT DETAILS SCHEMA ===
export const applicantSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    idPassportNumber: z.string().min(5, "ID/Passport number is required"),
    dob: z.coerce.date({ required_error: "Date of birth is required" }),
    gender: z.enum(["male", "female", "other"], { required_error: "Please select your gender" }),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    alternatePhoneNumber: z.string().min(10, "Alternate phone number must be at least 10 digits"),
    shareholdersWomen: z.number().min(0, "Number of women shareholders is required"),
    shareholdersYouth: z.number().min(0, "Number of youth shareholders is required"),
    shareholdersPwd: z.number().min(0, "Number of PWD shareholders is required"),
    email: z.string().email("Please enter a valid email address"),
});

// === BUSINESS ELIGIBILITY SCHEMA ===
// New strict requirements: immediate auto-disqualify for missing docs/invalid status
export const businessEligibilitySchema = z.object({
    name: z.string().min(2, "Business name is required"),
    isRegistered: z.boolean().refine(val => val === true, "Business must be registered in Kenya to be eligible"),
    registrationType: z.enum([
        "limited_company",
        "partnership",
        "cooperative",
        "self_help_group_cbo",
        "sole_proprietorship"
    ], { required_error: "Please select your registration type" }),
    registrationCertificateUrl: z.string().min(1, "Please upload your registration certificate"),
    yearsOperational: z.number().min(0, "Years operational must be a number"),
    // Logic note: UI handles the auto-disqualify check (<1 year), schema just enforces number

    hasFinancialRecords: z.boolean().refine(val => val === true, "Must have at least 1 year of financial records"),
    financialRecordsUrl: z.string().optional(), // Made optional in schema as UI might handle upload conditionally based on step

    sector: z.enum([
        "agriculture_and_agribusiness",
        "manufacturing",
        "renewable_energy",
        "water_management",
        "waste_management",
        "forestry",
        "tourism",
        "transport",
        "construction",
        "ict",
        "trade",
        "healthcare",
        "education",
        "other"
    ], { required_error: "Please select a sector" }),
    sectorOther: z.string().optional(),
    description: z.string().min(50, "Description must be at least 50 characters"),
    problemSolved: z.string().min(50, "Please describe the problem your business solves atleast 50 characters"),
    country: z.literal("kenya", { errorMap: () => ({ message: "Business must be in Kenya" }) }),
    county: z.string().min(1, "Please select a county"),
    city: z.string().min(1, "Please enter your town or city"),
});

// Acceleration track uses relaxed business schema (registration/records already confirmed in screening)
export const accelerationBusinessEligibilitySchema = z.object({
    name: z.string().min(2, "Business name is required"),
    isRegistered: z.boolean().optional().default(true), // Auto-set, already confirmed in screening
    registrationType: z.enum([
        "limited_company",
        "partnership",
        "cooperative",
        "self_help_group_cbo",
        "sole_proprietorship"
    ], { required_error: "Please select your registration type" }),
    registrationCertificateUrl: z.string().min(1, "Please upload your registration certificate"),
    yearsOperational: z.number().min(0, "Years operational must be a number"),
    hasFinancialRecords: z.boolean().optional().default(true), // Auto-set, already confirmed in screening
    financialRecordsUrl: z.string().optional(),
    sector: z.enum([
        "agriculture_and_agribusiness",
        "manufacturing",
        "renewable_energy",
        "water_management",
        "waste_management",
        "forestry",
        "tourism",
        "transport",
        "construction",
        "ict",
        "trade",
        "healthcare",
        "education",
        "other"
    ], { required_error: "Please select a sector" }),
    sectorOther: z.string().optional(),
    description: z.string().min(50, "Description must be at least 50 characters"),
    problemSolved: z.string().min(50, "Please describe the problem your business solves atleast 50 characters"),
    country: z.literal("kenya", { errorMap: () => ({ message: "Business must be in Kenya" }) }),
    county: z.string().min(1, "Please select a county"),
    city: z.string().min(1, "Please enter your town or city"),
});

// === FOUNDATION TRACK SCHEMA ===

// Business Model (10 marks)
export const foundationBusinessModelSchema = z.object({
    businessModelInnovation: z.enum(["innovative_concept", "relatively_innovative", "existing"], {
        required_error: "Please describe your business model",
    }),
    businessModelDescription: z.string().min(10, "Please explain how your business makes money"),
});

// Commercial Viability (30 marks total: Rev=10, Cust=10, Fund=5, Digit=5)
export const foundationCommercialViabilitySchema = z.object({
    revenueLastYear: z.number().min(0, "Revenue is required"),
    customerCount: z.number().min(0, "Customer count is required"),
    keyCustomerSegments: z.string().min(5, "Please describe your customer segments"),
    hasExternalFunding: z.boolean(),
    externalFundingDetails: z.string().optional(), // Required if hasExternalFunding is true (handled in UI/logic)
    digitizationLevel: z.boolean({ required_error: "Please answer if you use digital tools" }),
    digitizationReason: z.string().optional(), // Required if digitizationLevel is false
});

// Market Potential (30 marks)
export const foundationMarketPotentialSchema = z.object({
    relativePricing: z.enum(["lower", "equal", "higher"], {
        required_error: "How does your pricing compare?",
    }),
    relativePricingReason: z.string().min(5, "Please explain your pricing"),
    productDifferentiation: z.enum(["new", "relatively_new", "similar"], {
        required_error: "How unique is your product?",
    }),
    productDifferentiationDescription: z.string().min(5, "Please describe what makes it unique"),
    threatOfSubstitutes: z.enum(["low", "moderate", "high"], {
        required_error: "Select intensity of competition",
    }),
    competitorOverview: z.string().min(5, "Provide a brief overview of competitors"),
    easeOfMarketEntry: z.enum(["low", "moderate", "high"], {
        required_error: "How easy is it for others to enter?",
    }),
});

// Social Impact (30 marks)
export const foundationSocialImpactSchema = z.object({
    environmentalImpact: z.enum(["clearly_defined", "minimal", "not_defined"], {
        required_error: "Does your business conserve the environment?",
    }),
    environmentalImpactDescription: z.string().optional(), // Required if not 'not_defined'

    // Breakdown of employees
    fullTimeEmployeesTotal: z.number().min(1, "Must be at least 1"),
    fullTimeEmployeesWomen: z.number().default(0),
    fullTimeEmployeesYouth: z.number().default(0),
    fullTimeEmployeesPwd: z.number().default(0),

    businessCompliance: z.enum(["fully_compliant", "partially_compliant", "not_clear"], {
        required_error: "What is your compliance status?",
    }),
    complianceDocumentsUrl: z.string().optional(),
});

// === ACCELERATION TRACK SCHEMA ===

// Revenue & Growth (20 marks)
export const accelerationRevenuesSchema = z.object({
    revenueLastYear: z.number().min(3000000, "Revenue must be above KES 3,000,000 to qualify for Accelerator"), // Enforcement
    auditedAccountsUrl: z.string().optional(), // Optional - collected in business form section if available
    yearsOperational: z.number().min(0, "Years operational must be a number"), // Data collection only, not a filter
    growthHistory: z.string().min(5, "Provide a brief history of growth"),
    averageAnnualRevenueGrowth: z.string().optional(), // Added for scoring: >20%, 10-20%, <10%
    futureSalesGrowth: z.enum(["high", "moderate", "low"], {
        required_error: "Rate your projected sales growth",
    }),
    futureSalesGrowthReason: z.string().min(5, "Explain the basis for projected growth"),
    hasExternalFunding: z.boolean(),
    externalFundingDetails: z.string().optional(),
});

// Impact Potential (20 marks)
export const accelerationImpactPotentialSchema = z.object({
    // Current employees
    fullTimeEmployeesTotal: z.number().min(1, "Total employees required"),
    fullTimeEmployeesWomen: z.number().default(0),
    fullTimeEmployeesYouth: z.number().default(0),
    fullTimeEmployeesPwd: z.number().default(0),

    jobCreationPotential: z.enum(["high", "moderate", "low"], {
        required_error: "Rate potential to create new jobs",
    }),
    projectedInclusion: z.string().optional(), // Added for scoring: >50% women/youth/pwd for new jobs
});

// Scalability (20 marks)
// Schema simplified to match actual form UI fields
export const accelerationScalabilitySchema = z.object({
    // Fields present in form UI
    scalabilityPlan: z.string().optional(), // D1: Clear plan, some idea, no plan
    marketScalePotential: z.string().optional(), // D2: Large, Stable, Small
    marketDifferentiationDescription: z.string().optional(), // Made optional, validated by superRefine below
    salesMarketingApproach: z.string().min(5, "Describe sales channels & marketing approach"), // Textarea in D2

    // Fields NOT in form UI but kept for schema compatibility (all optional)
    marketDifferentiation: z.enum(["truly_unique", "provably_better", "undifferentiated"]).optional(),
    competitiveAdvantage: z.enum(["high", "moderate", "low"]).optional(),
    competitiveAdvantageSource: z.string().optional(),
    technologyIntegration: z.enum(["high", "moderate", "low"]).optional(),
    salesMarketingIntegration: z.enum(["fully_integrated", "aligned", "not_aligned"]).optional(),
}).superRefine((data, ctx) => {
    // Skip logic enforcement:
    // If scalabilityPlan is NOT 'no_plan', then marketDifferentiationDescription is required
    if (data.scalabilityPlan && data.scalabilityPlan !== "no_plan") {
        if (!data.marketDifferentiationDescription || data.marketDifferentiationDescription.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Explain your key competitive strengths (min 5 chars)",
                path: ["marketDifferentiationDescription"],
            });
        }
    }
});

// Social & Env Impact (20 marks)
// E1: socialImpactContribution (7 marks), E2: environmentalImpact (7 marks), E3: supplierInvolvement (6 marks)
export const accelerationSocialImpactSchema = z.object({
    // E1. Social Impact Contribution (7 marks)
    socialImpactContribution: z.enum(["high", "moderate", "none"], {
        required_error: "Rate contribution to social improvements",
    }),

    // E2. Environmental Impact (7 marks)
    environmentalImpact: z.enum(["clearly_defined", "minimal", "not_defined"], {
        required_error: "Do you conserve the environment?",
    }),
    environmentalImpactDescription: z.string().optional(),

    // E3. Supplier Involvement (6 marks) - Now required
    supplierInvolvement: z.enum(["direct_engagement", "network_based", "none"], {
        required_error: "How do you engage suppliers?",
    }),
    supplierSupportDescription: z.string().min(10, "Describe how you support suppliers"),
});

// Business Model (20 marks)
// F1: businessModelUniqueness (7 marks), F2: customerValueProposition (7 marks), F3: competitiveAdvantageStrength (6 marks)
export const accelerationBusinessModelSchema = z.object({
    // F1. Business Model Uniqueness (7 marks)
    businessModelUniqueness: z.enum(["high", "moderate", "low"], {
        required_error: "How unique is your business model?",
    }),
    businessModelUniquenessDescription: z.string().min(5, "Describe difference"),

    // F2. Customer Value Proposition (7 marks)
    customerValueProposition: z.enum(["high", "moderate", "low"], {
        required_error: "Strength of value proposition",
    }),

    // F3. Competitive Advantage Strength (6 marks) - Now required
    competitiveAdvantageStrength: z.enum(["high", "moderate", "low"], {
        required_error: "Rate the strength of your competitive advantage",
    }),
    competitiveAdvantageBarriers: z.string().min(10, "Explain barriers that protect your competitive position"),
});

// === DECLARATION & UPLOADS ===
export const declarationSchema = z.object({
    hasSocialSafeguarding: z.boolean().refine(val => val === true, "Social safeguarding guidelines are required"),
    confirmTruth: z.boolean().refine(val => val === true, "You must certify information is accurate"),
    declarationName: z.string().min(2, "Name is required"),
    declarationDate: z.coerce.date().default(() => new Date()),
});

export const documentsSchema = z.object({
    registrationCertificateUrl: z.string().optional(), // Usually captured in eligibility, but good to have here
    financialRecordsUrl: z.string().optional(),
    auditedAccountsUrl: z.string().optional(),
    salesEvidenceUrl: z.string().optional(),
    photosUrl: z.string().optional(),
    taxComplianceUrl: z.string().optional(),
    otherFilesUrl: z.string().optional(),
});

// === COMBINED SCHEMAS ===

export const foundationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: businessEligibilitySchema,
    businessModel: foundationBusinessModelSchema,
    commercialViability: foundationCommercialViabilitySchema,
    marketPotential: foundationMarketPotentialSchema,
    socialImpact: foundationSocialImpactSchema,
    documents: documentsSchema,
    declaration: declarationSchema,
});

export const accelerationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: accelerationBusinessEligibilitySchema, // Uses relaxed validation (isRegistered/hasFinancialRecords already confirmed in screening)
    revenues: accelerationRevenuesSchema, // Renamed from commercialViability for Acceleration track in logic
    impactPotential: accelerationImpactPotentialSchema,
    scalability: accelerationScalabilitySchema,
    socialImpact: accelerationSocialImpactSchema,
    businessModel: accelerationBusinessModelSchema,
    documents: documentsSchema,
    declaration: declarationSchema,
});

// Type exports
export type ApplicantFormData = z.infer<typeof applicantSchema>;
export type BusinessEligibilityFormData = z.infer<typeof businessEligibilitySchema>;
export type FoundationApplicationFormData = z.infer<typeof foundationApplicationSchema>;
export type AccelerationApplicationFormData = z.infer<typeof accelerationApplicationSchema>;

// Default values (helpers)
// Using full type (not Partial) to satisfy react-hook-form Resolver strict typing
export const defaultApplicant: ApplicantFormData = {
    firstName: "",
    lastName: "",
    idPassportNumber: "",
    dob: new Date(), // Will be overwritten by user
    gender: "male", // Default, user must select
    phoneNumber: "",
    alternatePhoneNumber: "",
    email: "",
    shareholdersWomen: 0,
    shareholdersYouth: 0,
    shareholdersPwd: 0,
};

export const defaultBusinessEligibility: Partial<BusinessEligibilityFormData> = {
    name: "",
    isRegistered: false, // Default to false, let user select
    registrationType: undefined,
    registrationCertificateUrl: "",
    sector: undefined,
    country: "kenya",
    county: "",
    city: "", // Added
    yearsOperational: 0,
    hasFinancialRecords: false,
    financialRecordsUrl: "",
    description: "",
    problemSolved: "",
};
