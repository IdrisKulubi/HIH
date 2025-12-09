"use server";

import { z } from "zod";
import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    applications,
    businesses,
    applicants,
    userProfiles,
    users,
    eligibilityResults,
} from "../../../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkEligibility } from "./eligibility";
import { sendApplicationSubmissionEmail } from "@/lib/email";
import { ActionResponse, errorResponse, successResponse } from "./types";

// =============================================================================
// SUBMISSION SCHEMAS
// (Mirroring src/components/application/schemas/bire-application-schema.ts)
// =============================================================================

// Base Schemas
const applicantSchema = z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    idPassportNumber: z.string().min(5),
    gender: z.enum(["male", "female", "other"]),
    phoneNumber: z.string().min(10).max(20),
    email: z.string().email().max(100),
});

const businessEligibilitySchema = z.object({
    name: z.string().min(2),
    isRegistered: z.boolean(),
    registrationType: z.enum(["limited_company", "partnership", "cooperative", "self_help_group_cbo", "sole_proprietorship", "other"]),
    registrationCertificateUrl: z.string().url().optional().nullable(),
    sector: z.string(),
    sectorOther: z.string().optional(),
    description: z.string().min(50),
    problemSolved: z.string().min(50),
    country: z.literal("kenya"),
    county: z.string(),
    city: z.string().min(2).max(100),
    yearsOperational: z.number().min(0),
    hasFinancialRecords: z.boolean(),
    financialRecordsUrl: z.string().url().optional().nullable(),
    hasAuditedAccounts: z.boolean(),
    auditedAccountsUrl: z.string().url().optional().nullable(),
});

const documentsSchema = z.object({
    registrationCertificateUrl: z.string().optional(),
    financialRecordsUrl: z.string().optional(),
    auditedAccountsUrl: z.string().optional(),
    salesEvidenceUrl: z.string().optional(),
    photosUrl: z.string().optional(),
    taxComplianceUrl: z.string().optional(),
    otherFilesUrl: z.string().optional(),
}).optional();

// Foundation Track Schema
const foundationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: businessEligibilitySchema,
    commercialViability: z.object({
        revenueLastYear: z.number().min(0),
        customerCount: z.number().min(0),
        keyCustomerSegments: z.string().min(10),
        hasExternalFunding: z.boolean(),
        externalFundingDetails: z.string().optional(),
        digitizationLevel: z.boolean(),
        digitizationReason: z.string().optional(),
    }),
    businessModel: z.object({
        businessModelInnovation: z.enum(["innovative_concept", "relatively_innovative", "existing"]),
    }),
    marketPotential: z.object({
        relativePricing: z.enum(["lower", "equal", "higher"]),
        relativePricingReason: z.string().min(10).optional(),
        productDifferentiation: z.enum(["new", "relatively_new", "similar"]),
        productDifferentiationDescription: z.string().min(10).optional(),
        threatOfSubstitutes: z.enum(["low", "moderate", "high"]),
        competitorOverview: z.string().min(10).optional(),
        easeOfMarketEntry: z.enum(["low", "moderate", "high"]),
    }),
    socialImpact: z.object({
        environmentalImpact: z.enum(["clearly_defined", "minimal", "not_defined"]),
        environmentalImpactDescription: z.string().optional(),
        fullTimeEmployeesTotal: z.number().min(0),
        fullTimeEmployeesWomen: z.number().default(0),
        fullTimeEmployeesYouth: z.number().default(0),
        fullTimeEmployeesPwd: z.number().default(0),
        businessCompliance: z.enum(["fully_compliant", "partially_compliant", "not_clear"]),
        complianceDocumentsUrl: z.string().optional(),
    }),
    documents: documentsSchema,
});

// Acceleration Track Schema
const accelerationApplicationSchema = z.object({
    applicant: applicantSchema,
    business: businessEligibilitySchema,
    revenues: z.object({
        revenueLastYear: z.number().min(0),
        yearsOperational: z.number().min(0),
        growthHistory: z.string().min(20),
        futureSalesGrowth: z.enum(["high", "moderate", "low"]),
        futureSalesGrowthReason: z.string().min(20),
        hasExternalFunding: z.boolean(),
        externalFundingDetails: z.string().optional(), // renamed from fundingDetails to match schema
        auditedAccountsUrl: z.string().optional(),
    }),
    impactPotential: z.object({
        fullTimeEmployeesTotal: z.number().min(1),
        fullTimeEmployeesWomen: z.number().default(0),
        fullTimeEmployeesYouth: z.number().default(0),
        fullTimeEmployeesPwd: z.number().default(0),
        jobCreationPotential: z.enum(["high", "moderate", "low"]),
    }),
    scalability: z.object({
        marketDifferentiation: z.enum(["truly_unique", "provably_better", "undifferentiated"]),
        marketDifferentiationDescription: z.string().optional(),
        competitiveAdvantage: z.enum(["high", "moderate", "low"]),
        competitiveAdvantageSource: z.string().optional(),
        technologyIntegration: z.enum(["high", "moderate", "low"]),
        salesMarketingIntegration: z.enum(["fully_integrated", "aligned", "not_aligned"]),
        salesMarketingApproach: z.string().optional(),
        offeringFocus: z.enum(["outcome_focused", "solution_focused", "feature_focused"]).optional(),
    }),
    socialImpact: z.object({
        socialImpactContribution: z.enum(["high", "moderate", "none"]),
        supplierInvolvement: z.enum(["direct_engagement", "network_based", "none"]),
        supplierSupportDescription: z.string().optional(),
        environmentalImpact: z.enum(["clearly_defined", "minimal", "not_defined"]),
        environmentalImpactDescription: z.string().optional(),
    }),
    businessModel: z.object({
        businessModelUniqueness: z.enum(["high", "moderate", "low"]),
        businessModelUniquenessDescription: z.string().optional(),
        customerValueProposition: z.enum(["high", "moderate", "low"]),
        competitiveAdvantageStrength: z.enum(["high", "moderate", "low"]),
        competitiveAdvantageBarriers: z.string().optional(),
    }),
    documents: documentsSchema,
});

export type FoundationApplicationData = z.infer<typeof foundationApplicationSchema>;
export type AccelerationApplicationData = z.infer<typeof accelerationApplicationSchema>;

// =============================================================================
// FOUNDATION TRACK SUBMISSION
// =============================================================================

interface SubmissionResult {
    applicationId: number;
    track: "foundation" | "acceleration";
    eligibilityScore?: number;
}

export async function submitFoundationApplication(
    formData: FoundationApplicationData
): Promise<ActionResponse<SubmissionResult>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to submit an application.");
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.name;

        // Clean and Validate
        // Note: We might need to map some fields if keys slightly differ, but here we assume match
        const validatedData = foundationApplicationSchema.parse(formData);

        const result = await db.transaction(async (tx) => {
            const existingApp = await tx.query.applications.findFirst({
                where: eq(applications.userId, userId),
            });

            if (existingApp) {
                throw new Error("You have already submitted an application.");
            }

            let user = await tx.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                [user] = await tx.insert(users).values({
                    id: userId,
                    email: userEmail!,
                    name: userName,
                    emailVerified: new Date(),
                }).returning();
            }

            await tx.insert(userProfiles).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                email: validatedData.applicant.email,
                role: "applicant",
                phoneNumber: validatedData.applicant.phoneNumber,
                country: "kenya",
                isCompleted: true,
            }).onConflictDoUpdate({
                target: userProfiles.userId,
                set: {
                    firstName: validatedData.applicant.firstName,
                    lastName: validatedData.applicant.lastName,
                    isCompleted: true,
                    updatedAt: new Date(),
                },
            });

            const [applicant] = await tx.insert(applicants).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                idPassportNumber: validatedData.applicant.idPassportNumber,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).returning();

            const [business] = await tx.insert(businesses).values({
                applicantId: applicant.id,
                name: validatedData.business.name,
                isRegistered: validatedData.business.isRegistered,
                registrationCertificateUrl: validatedData.business.registrationCertificateUrl,
                sector: validatedData.business.sector as any,
                sectorOther: validatedData.business.sectorOther,
                description: validatedData.business.description,
                problemSolved: validatedData.business.problemSolved,
                country: "kenya",
                county: validatedData.business.county as any,
                city: validatedData.business.city,
                yearsOperational: validatedData.business.yearsOperational,
                hasFinancialRecords: validatedData.business.hasFinancialRecords,
                financialRecordsUrl: validatedData.business.financialRecordsUrl,
                hasAuditedAccounts: validatedData.business.hasAuditedAccounts,
                auditedAccountsUrl: validatedData.business.auditedAccountsUrl,

                // Commercial Viability
                revenueLastYear: String(validatedData.commercialViability.revenueLastYear),
                customerCount: validatedData.commercialViability.customerCount,
                hasExternalFunding: validatedData.commercialViability.hasExternalFunding,
                externalFundingDetails: validatedData.commercialViability.externalFundingDetails,
                digitizationLevel: validatedData.commercialViability.digitizationLevel,
                digitizationReason: validatedData.commercialViability.digitizationReason,

                // Business Model
                businessModelInnovation: validatedData.businessModel.businessModelInnovation,

                // Market Potential
                relativePricing: validatedData.marketPotential.relativePricing,
                productDifferentiation: validatedData.marketPotential.productDifferentiation,
                threatOfSubstitutes: validatedData.marketPotential.threatOfSubstitutes,
                easeOfMarketEntry: validatedData.marketPotential.easeOfMarketEntry,
                competitorOverview: validatedData.marketPotential.competitorOverview,

                // Social Impact
                environmentalImpact: validatedData.socialImpact.environmentalImpact,
                environmentalImpactDescription: validatedData.socialImpact.environmentalImpactDescription,
                fullTimeEmployeesTotal: validatedData.socialImpact.fullTimeEmployeesTotal,
                fullTimeEmployeesWomen: validatedData.socialImpact.fullTimeEmployeesWomen,
                fullTimeEmployeesYouth: validatedData.socialImpact.fullTimeEmployeesYouth,
                fullTimeEmployeesPwd: validatedData.socialImpact.fullTimeEmployeesPwd,
                businessCompliance: validatedData.socialImpact.businessCompliance,
                complianceDocumentsUrl: validatedData.socialImpact.complianceDocumentsUrl,

                // Documents
                salesEvidenceUrl: validatedData.documents?.salesEvidenceUrl,
                photosUrl: validatedData.documents?.photosUrl,
                taxComplianceUrl: validatedData.documents?.taxComplianceUrl,
            }).returning();

            const [application] = await tx.insert(applications).values({
                userId,
                businessId: business.id,
                track: "foundation",
                status: "submitted",
                submittedAt: new Date(),
            }).returning();

            return { applicationId: application.id };
        });

        const eligibilityResponse = await checkEligibility(result.applicationId);

        await sendApplicationSubmissionEmail({
            userEmail: userEmail!,
            applicantName: userName || formData.applicant.firstName,
            applicationId: result.applicationId.toString(),
            businessName: formData.business.name,
            submissionDate: new Date().toISOString(),
        });

        revalidatePath("/apply");
        revalidatePath("/dashboard");

        return successResponse(
            {
                applicationId: result.applicationId,
                track: "foundation",
                eligibilityScore: eligibilityResponse.success ? (eligibilityResponse.data?.eligibilityResult.totalScore ?? undefined) : undefined,
            },
            "Application submitted successfully!"
        );

    } catch (error) {
        console.error("Foundation application submission error:", error);
        if (error instanceof z.ZodError) {
            return errorResponse(`Validation failed: ${error.errors.map(e => e.message).join(", ")}`);
        }
        if (error instanceof Error) {
            return errorResponse(error.message);
        }
        return errorResponse("An unexpected error occurred. Please try again.");
    }
}

// =============================================================================
// ACCELERATION TRACK SUBMISSION
// =============================================================================

export async function submitAccelerationApplication(
    formData: AccelerationApplicationData
): Promise<ActionResponse<SubmissionResult>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to submit an application.");
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.name;

        const validatedData = accelerationApplicationSchema.parse(formData);

        const result = await db.transaction(async (tx) => {
            const existingApp = await tx.query.applications.findFirst({
                where: eq(applications.userId, userId),
            });

            if (existingApp) {
                throw new Error("You have already submitted an application.");
            }

            let user = await tx.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                [user] = await tx.insert(users).values({
                    id: userId,
                    email: userEmail!,
                    name: userName,
                    emailVerified: new Date(),
                }).returning();
            }

            await tx.insert(userProfiles).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                email: validatedData.applicant.email,
                role: "applicant",
                phoneNumber: validatedData.applicant.phoneNumber,
                country: "kenya",
                isCompleted: true,
            }).onConflictDoUpdate({
                target: userProfiles.userId,
                set: {
                    firstName: validatedData.applicant.firstName,
                    lastName: validatedData.applicant.lastName,
                    isCompleted: true,
                    updatedAt: new Date(),
                },
            });

            const [applicant] = await tx.insert(applicants).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                idPassportNumber: validatedData.applicant.idPassportNumber,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).returning();

            const [business] = await tx.insert(businesses).values({
                applicantId: applicant.id,
                name: validatedData.business.name,
                isRegistered: validatedData.business.isRegistered,
                registrationCertificateUrl: validatedData.business.registrationCertificateUrl,
                sector: validatedData.business.sector as any,
                sectorOther: validatedData.business.sectorOther,
                description: validatedData.business.description,
                problemSolved: validatedData.business.problemSolved,
                country: "kenya",
                county: validatedData.business.county as any,
                city: validatedData.business.city,
                yearsOperational: validatedData.revenues.yearsOperational, // Acceleration maps yearsOperational from revenues section
                hasFinancialRecords: validatedData.business.hasFinancialRecords,
                financialRecordsUrl: validatedData.business.financialRecordsUrl,
                hasAuditedAccounts: validatedData.business.hasAuditedAccounts,
                auditedAccountsUrl: validatedData.business.auditedAccountsUrl,

                // Revenues
                revenueLastYear: String(validatedData.revenues.revenueLastYear),
                growthHistory: validatedData.revenues.growthHistory,
                hasExternalFunding: validatedData.revenues.hasExternalFunding,
                externalFundingDetails: validatedData.revenues.externalFundingDetails,
                futureSalesGrowth: validatedData.revenues.futureSalesGrowth,
                futureSalesGrowthReason: validatedData.revenues.futureSalesGrowthReason,

                // Impact Potential
                fullTimeEmployeesTotal: validatedData.impactPotential.fullTimeEmployeesTotal,
                fullTimeEmployeesWomen: validatedData.impactPotential.fullTimeEmployeesWomen,
                fullTimeEmployeesYouth: validatedData.impactPotential.fullTimeEmployeesYouth,
                fullTimeEmployeesPwd: validatedData.impactPotential.fullTimeEmployeesPwd,
                jobCreationPotential: validatedData.impactPotential.jobCreationPotential,

                // Scalability
                marketDifferentiation: validatedData.scalability.marketDifferentiation,
                competitiveAdvantage: validatedData.scalability.competitiveAdvantage,
                competitiveAdvantageSource: validatedData.scalability.competitiveAdvantageSource,
                technologyIntegration: validatedData.scalability.technologyIntegration,
                salesMarketingIntegration: validatedData.scalability.salesMarketingIntegration,
                salesMarketingApproach: validatedData.scalability.salesMarketingApproach,
                // offeringFocus not in DB schema but in Zod - probably legacy or new field. Ignoring if not in DB, 
                // but checking schema.ts: offeringFocus is NOT in business table lines 308-408. So we skip it.

                // Social Impact
                socialImpactContribution: validatedData.socialImpact.socialImpactContribution,
                supplierInvolvement: validatedData.socialImpact.supplierInvolvement,
                supplierSupportDescription: validatedData.socialImpact.supplierSupportDescription,
                environmentalImpact: validatedData.socialImpact.environmentalImpact as any,
                environmentalImpactDescription: validatedData.socialImpact.environmentalImpactDescription,

                // Business Model
                businessModelUniqueness: validatedData.businessModel.businessModelUniqueness,
                businessModelUniquenessDescription: validatedData.businessModel.businessModelUniquenessDescription,
                customerValueProposition: validatedData.businessModel.customerValueProposition,
                competitiveAdvantageStrength: validatedData.businessModel.competitiveAdvantageStrength,
                competitiveAdvantageBarriers: validatedData.businessModel.competitiveAdvantageBarriers,

                // Documents
                salesEvidenceUrl: validatedData.documents?.salesEvidenceUrl,
                photosUrl: validatedData.documents?.photosUrl,
                taxComplianceUrl: validatedData.documents?.taxComplianceUrl,
            }).returning();

            const [application] = await tx.insert(applications).values({
                userId,
                businessId: business.id,
                track: "acceleration",
                status: "submitted",
                submittedAt: new Date(),
            }).returning();

            return { applicationId: application.id };
        });

        const eligibilityResponse = await checkEligibility(result.applicationId);

        await sendApplicationSubmissionEmail({
            userEmail: userEmail!,
            applicantName: userName || formData.applicant.firstName,
            applicationId: result.applicationId.toString(),
            businessName: formData.business.name,
            submissionDate: new Date().toISOString(),
        });

        revalidatePath("/apply");
        revalidatePath("/dashboard");

        return successResponse(
            {
                applicationId: result.applicationId,
                track: "acceleration",
                eligibilityScore: eligibilityResponse.success ? (eligibilityResponse.data?.eligibilityResult.totalScore ?? undefined) : undefined,
            },
            "Application submitted successfully!"
        );

    } catch (error) {
        console.error("Acceleration application submission error:", error);
        if (error instanceof z.ZodError) {
            return errorResponse(`Validation failed: ${error.errors.map(e => e.message).join(", ")}`);
        }
        if (error instanceof Error) {
            return errorResponse(error.message);
        }
        return errorResponse("An unexpected error occurred. Please try again.");
    }
}

// =============================================================================
// GET USER APPLICATION
// =============================================================================

export async function getUserApplication(): Promise<ActionResponse<{
    id: number;
    track: string | null;
    status: string;
    submittedAt: string | null;
    business: {
        name: string;
        sector: string | null;
        county: string | null;
        city: string;
        isRegistered: boolean;
        yearsOperational: number;
    };
    applicant: {
        firstName: string;
        lastName: string;
        email: string;
    };
    eligibility: {
        isEligible: boolean;
        totalScore: number | null;
    } | null;
}>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("User not authenticated");
        }

        const applicationData = await db.query.applications.findFirst({
            where: eq(applications.userId, session.user.id),
            with: {
                business: {
                    with: {
                        applicant: true,
                    },
                },
                eligibilityResults: {
                    limit: 1,
                },
            },
        });

        if (!applicationData) {
            return errorResponse("No application found");
        }

        return successResponse({
            id: applicationData.id,
            track: applicationData.track,
            status: applicationData.status,
            submittedAt: applicationData.submittedAt?.toISOString() ?? null,
            business: {
                name: applicationData.business.name,
                sector: applicationData.business.sector,
                county: applicationData.business.county,
                city: applicationData.business.city,
                isRegistered: applicationData.business.isRegistered,
                yearsOperational: applicationData.business.yearsOperational,
            },
            applicant: {
                firstName: applicationData.business.applicant.firstName,
                lastName: applicationData.business.applicant.lastName,
                email: applicationData.business.applicant.email,
            },
            eligibility: applicationData.eligibilityResults[0]
                ? {
                    isEligible: applicationData.eligibilityResults[0].isEligible,
                    totalScore: applicationData.eligibilityResults[0].totalScore ? Number(applicationData.eligibilityResults[0].totalScore) : null,
                }
                : null,
        });
    } catch (error) {
        console.error("Error fetching user application:", error);
        return errorResponse("Failed to fetch application");
    }
}
