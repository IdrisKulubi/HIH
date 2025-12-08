"use client";

import { z } from "zod";

// === APPLICANT DETAILS SCHEMA ===
export const applicantSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    idPassportNumber: z.string().min(5, "ID/Passport number is required"),
    gender: z.enum(["male", "female", "other"], { required_error: "Please select your gender" }),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email("Please enter a valid email address"),
});

// === BUSINESS ELIGIBILITY SCHEMA ===
export const businessEligibilitySchema = z.object({
    name: z.string().min(2, "Business name is required"),
    isRegistered: z.boolean(),
    registrationCertificateUrl: z.string().min(1, "Please upload your registration certificate"),
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
    problemSolved: z.string().min(50, "Please describe the problem your business solves"),
    country: z.literal("kenya"),
    county: z.string().min(1, "Please select a county"),
    city: z.string().min(2, "City is required"),
    yearsOperational: z.number().min(0, "Years operational must be 0 or more"),
    hasFinancialRecords: z.boolean(),
    financialRecordsUrl: z.string().min(1, "Please upload your financial records"),
    hasAuditedAccounts: z.boolean(),
    auditedAccountsUrl: z.string().min(1, "Please upload your audited financial statements"),
});

// === FOUNDATION TRACK SCHEMA ===

// Commercial Viability (20 marks)
export const foundationCommercialViabilitySchema = z.object({
    revenueLastYear: z.number().min(0, "Revenue is required"),
    customerCount: z.number().min(0, "Customer count is required"),
    hasExternalFunding: z.boolean(),
    fundsRaised: z.number().optional(),
    fundingType: z.string().optional(),
    fundingSource: z.string().optional(),
    fundingDetails: z.string().optional(),
});

// Business Model (10 marks)
export const foundationBusinessModelSchema = z.object({
    businessModelInnovation: z.enum(["new", "relatively_new", "existing"], {
        required_error: "Please select the innovation level",
    }),
});

// Market Potential (30 marks)
export const foundationMarketPotentialSchema = z.object({
    relativePricing: z.enum(["lower", "equal", "higher"], {
        required_error: "Please select your pricing strategy",
    }),
    productDifferentiation: z.enum(["new", "relatively_new", "existing"], {
        required_error: "Please select product differentiation",
    }),
    threatOfSubstitutes: z.enum(["low", "moderate", "high"], {
        required_error: "Please select threat level",
    }),
    easeOfMarketEntry: z.enum(["low", "moderate", "high"], {
        required_error: "Please select market entry ease",
    }),
    competitiveIntensity: z.enum(["low", "moderate", "high"], {
        required_error: "Please select competitive intensity",
    }),
    productDescription: z.string().optional(),
});

// Social Impact (40 marks)
export const foundationSocialImpactSchema = z.object({
    environmentalImpact: z.enum(["clearly_defined", "neutral", "not_defined"], {
        required_error: "Please select environmental impact level",
    }),
    environmentalExamples: z.string().optional(),
    specialGroupsEmployed: z.number().min(0, "Number of special groups employed is required"),
    businessCompliance: z.enum(["fully_compliant", "partially_compliant", "not_clear"], {
        required_error: "Please select compliance status",
    }),
});

// === ACCELERATION TRACK SCHEMA ===

// Revenues (20 marks)
export const accelerationRevenuesSchema = z.object({
    revenueLastYear: z.number().min(0, "Revenue is required"),
    yearsOperational: z.number().min(1, "Years operational is required"),
    revenueTrend: z.enum(["growing", "stable", "declining"]).optional(),
    futureSalesGrowth: z.enum(["high", "moderate", "low"], {
        required_error: "Please select projected growth",
    }),
    hasExternalFunding: z.boolean(),
    fundsRaised: z.number().optional(),
    fundingType: z.string().optional(),
    fundingSource: z.string().optional(),
    fundingDetails: z.string().optional(),
});

// Impact Potential (20 marks)
export const accelerationImpactPotentialSchema = z.object({
    currentSpecialGroupsEmployed: z.number().min(0, "Number of special groups employed is required"),
    jobCreationPotential: z.enum(["high", "moderate", "low"], {
        required_error: "Please select job creation potential",
    }),
});

// Scalability (20 marks)
export const accelerationScalabilitySchema = z.object({
    marketDifferentiation: z.enum(["truly_unique", "provably_better", "undifferentiated"], {
        required_error: "Please select market differentiation",
    }),
    competitiveAdvantage: z.enum(["high", "moderate", "low"], {
        required_error: "Please select competitive advantage",
    }),
    offeringFocus: z.enum(["outcome_focused", "solution_focused", "feature_focused"], {
        required_error: "Please select offering focus",
    }),
    salesMarketingIntegration: z.enum(["fully_integrated", "aligned", "no_alignment"], {
        required_error: "Please select sales/marketing integration",
    }),
});

// Social Impact (20 marks)
export const accelerationSocialImpactSchema = z.object({
    socialImpactHousehold: z.enum(["high", "moderate", "none"], {
        required_error: "Please select social impact level",
    }),
    supplierInvolvement: z.enum(["direct_engagement", "network_engagement", "none"], {
        required_error: "Please select supplier involvement",
    }),
    environmentalImpact: z.enum(["high", "moderate", "low"], {
        required_error: "Please select environmental impact",
    }),
    environmentalExamples: z.string().optional(),
});

// Business Model (20 marks)
export const accelerationBusinessModelSchema = z.object({
    businessModelUniqueness: z.enum(["high", "moderate", "low"], {
        required_error: "Please select business model uniqueness",
    }),
    customerValueProposition: z.enum(["high", "moderate", "low"], {
        required_error: "Please select value proposition strength",
    }),
    competitiveAdvantageStrength: z.enum(["high", "moderate", "low"], {
        required_error: "Please select competitive advantage strength",
    }),
});

// === DOCUMENT UPLOADS SCHEMA ===
export const documentsSchema = z.object({
    registrationCertificateUrl: z.string().optional(),
    financialRecordsUrl: z.string().optional(),
    auditedAccountsUrl: z.string().optional(),
    salesEvidenceUrl: z.string().optional(),
    photosUrl: z.string().optional(),
    taxComplianceUrl: z.string().optional(),
});

// === COMBINED SCHEMAS ===

export const foundationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: businessEligibilitySchema,
    commercialViability: foundationCommercialViabilitySchema,
    businessModel: foundationBusinessModelSchema,
    marketPotential: foundationMarketPotentialSchema,
    socialImpact: foundationSocialImpactSchema,
    documents: documentsSchema,
});

export const accelerationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: businessEligibilitySchema,
    revenues: accelerationRevenuesSchema,
    impactPotential: accelerationImpactPotentialSchema,
    scalability: accelerationScalabilitySchema,
    socialImpact: accelerationSocialImpactSchema,
    businessModel: accelerationBusinessModelSchema,
    documents: documentsSchema,
});

// Type exports
export type ApplicantFormData = z.infer<typeof applicantSchema>;
export type BusinessEligibilityFormData = z.infer<typeof businessEligibilitySchema>;
export type FoundationApplicationFormData = z.infer<typeof foundationApplicationSchema>;
export type AccelerationApplicationFormData = z.infer<typeof accelerationApplicationSchema>;

// Default values
export const defaultApplicant: Partial<ApplicantFormData> = {
    firstName: "",
    lastName: "",
    idPassportNumber: "",
    gender: undefined,
    phoneNumber: "",
    email: "",
};

export const defaultBusinessEligibility: Partial<BusinessEligibilityFormData> = {
    name: "",
    isRegistered: true, // Always true since eligibility screening confirmed
    registrationCertificateUrl: "",
    sector: undefined,
    description: "",
    problemSolved: "",
    country: "kenya",
    county: "",
    city: "",
    yearsOperational: 0,
    hasFinancialRecords: true, // Always true since eligibility screening confirmed
    financialRecordsUrl: "",
    hasAuditedAccounts: true, // Always true since eligibility screening confirmed
    auditedAccountsUrl: "",
};
