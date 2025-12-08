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
// BIRE APPLICATION SUBMISSION SCHEMAS
// =============================================================================

// Foundation Track Schema
const foundationApplicationSchema = z.object({
    applicant: z.object({
        firstName: z.string().min(2).max(100),
        lastName: z.string().min(2).max(100),
        idPassportNumber: z.string().min(5),
        gender: z.enum(["male", "female", "other"]),
        phoneNumber: z.string().min(10).max(20),
        email: z.string().email().max(100),
    }),
    business: z.object({
        name: z.string().min(2),
        isRegistered: z.boolean(),
        registrationCertificateUrl: z.string().url().optional().nullable(),
        sector: z.string(),
        sectorOther: z.string().optional(),
        description: z.string().min(50),
        problemSolved: z.string().min(50),
        country: z.literal("kenya"),
        county: z.string(),
        city: z.string().min(2).max(100),
        yearsOperational: z.number().min(1),
        hasFinancialRecords: z.boolean(),
        financialRecordsUrl: z.string().url().optional().nullable(),
        hasAuditedAccounts: z.boolean(),
        auditedAccountsUrl: z.string().url().optional().nullable(),
    }),
    commercialViability: z.object({
        revenueLastYear: z.number().min(0),
        customerCount: z.number().min(0),
        hasExternalFunding: z.boolean(),
        fundingDetails: z.string().optional(),
    }),
    businessModel: z.object({
        businessModelInnovation: z.enum(["new", "relatively_new", "existing"]),
    }),
    marketPotential: z.object({
        relativePricing: z.enum(["lower", "equal", "higher"]),
        productDifferentiation: z.enum(["new", "relatively_new", "existing"]),
        threatOfSubstitutes: z.enum(["low", "moderate", "high"]),
        easeOfMarketEntry: z.enum(["low", "moderate", "high"]),
    }),
    socialImpact: z.object({
        environmentalImpact: z.enum(["clearly_defined", "neutral", "not_defined"]),
        environmentalExamples: z.string().optional(),
        specialGroupsEmployed: z.number().min(0),
        businessCompliance: z.enum(["fully_compliant", "partially_compliant", "not_clear"]),
    }),
    documents: z.object({
        registrationCertificateUrl: z.string().optional(),
        financialRecordsUrl: z.string().optional(),
        auditedAccountsUrl: z.string().optional(),
        salesEvidenceUrl: z.string().optional(),
        photosUrl: z.string().optional(),
        taxComplianceUrl: z.string().optional(),
    }).optional(),
});

// Acceleration Track Schema
const accelerationApplicationSchema = z.object({
    applicant: z.object({
        firstName: z.string().min(2).max(100),
        lastName: z.string().min(2).max(100),
        idPassportNumber: z.string().min(5),
        gender: z.enum(["male", "female", "other"]),
        phoneNumber: z.string().min(10).max(20),
        email: z.string().email().max(100),
    }),
    business: z.object({
        name: z.string().min(2),
        isRegistered: z.boolean(),
        registrationCertificateUrl: z.string().url().optional().nullable(),
        sector: z.string(),
        sectorOther: z.string().optional(),
        description: z.string().min(50),
        problemSolved: z.string().min(50),
        country: z.literal("kenya"),
        county: z.string(),
        city: z.string().min(2).max(100),
        yearsOperational: z.number().min(2), // Acceleration requires 2+ years
        hasFinancialRecords: z.boolean(),
        financialRecordsUrl: z.string().url().optional().nullable(),
        hasAuditedAccounts: z.boolean(),
        auditedAccountsUrl: z.string().url().optional().nullable(),
    }),
    revenues: z.object({
        revenueLastYear: z.number().min(0),
        yearsOperational: z.number().min(0),
        futureSalesGrowth: z.enum(["high", "moderate", "low"]),
        hasExternalFunding: z.boolean(),
        fundingDetails: z.string().optional(),
    }),
    impactPotential: z.object({
        currentSpecialGroupsEmployed: z.number().min(0),
        jobCreationPotential: z.enum(["high", "moderate", "low"]),
    }),
    scalability: z.object({
        marketDifferentiation: z.enum(["truly_unique", "provably_better", "undifferentiated"]),
        competitiveAdvantage: z.enum(["high", "moderate", "low"]),
        offeringFocus: z.enum(["outcome_focused", "solution_focused", "feature_focused"]),
        salesMarketingIntegration: z.enum(["fully_integrated", "aligned", "no_alignment"]),
    }),
    socialImpact: z.object({
        socialImpactHousehold: z.enum(["high", "moderate", "none"]),
        supplierInvolvement: z.enum(["direct_engagement", "network_engagement", "none"]),
        environmentalImpact: z.enum(["high", "moderate", "low"]),
        environmentalExamples: z.string().optional(),
    }),
    businessModel: z.object({
        businessModelUniqueness: z.enum(["high", "moderate", "low"]),
        customerValueProposition: z.enum(["high", "moderate", "low"]),
        competitiveAdvantageStrength: z.enum(["high", "moderate", "low"]),
    }),
    documents: z.object({
        registrationCertificateUrl: z.string().optional(),
        financialRecordsUrl: z.string().optional(),
        auditedAccountsUrl: z.string().optional(),
        salesEvidenceUrl: z.string().optional(),
        photosUrl: z.string().optional(),
        taxComplianceUrl: z.string().optional(),
    }).optional(),
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
        // Auth check
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to submit an application.");
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.name;

        // Validate form data
        const validatedData = foundationApplicationSchema.parse(formData);

        // Database transaction
        const result = await db.transaction(async (tx) => {
            // Check for existing application
            const existingApp = await tx.query.applications.findFirst({
                where: eq(applications.userId, userId),
            });

            if (existingApp) {
                throw new Error("You have already submitted an application.");
            }

            // Ensure user exists
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

            // Create user profile
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

            // Create applicant record
            const [applicant] = await tx.insert(applicants).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                idPassportNumber: validatedData.applicant.idPassportNumber,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).returning();

            // Create business record with all BIRE fields
            const [business] = await tx.insert(businesses).values({
                applicantId: applicant.id,
                name: validatedData.business.name,
                isRegistered: validatedData.business.isRegistered,
                registrationCertificateUrl: validatedData.business.registrationCertificateUrl,
                sector: validatedData.business.sector as "agriculture_and_agribusiness" | "manufacturing" | "renewable_energy" | "water_management" | "waste_management" | "forestry" | "tourism" | "transport" | "construction" | "ict" | "trade" | "healthcare" | "education" | "other",
                sectorOther: validatedData.business.sectorOther,
                description: validatedData.business.description,
                problemSolved: validatedData.business.problemSolved,
                country: "kenya",
                county: validatedData.business.county as "baringo" | "bomet" | "bungoma" | "busia" | "elgeyo_marakwet" | "embu" | "garissa" | "homa_bay" | "isiolo" | "kajiado" | "kakamega" | "kericho" | "kiambu" | "kilifi" | "kirinyaga" | "kisii" | "kisumu" | "kitui" | "kwale" | "laikipia" | "lamu" | "machakos" | "makueni" | "mandera" | "marsabit" | "meru" | "migori" | "mombasa" | "muranga" | "nairobi" | "nakuru" | "nandi" | "narok" | "nyamira" | "nyandarua" | "nyeri" | "samburu" | "siaya" | "taita_taveta" | "tana_river" | "tharaka_nithi" | "trans_nzoia" | "turkana" | "uasin_gishu" | "vihiga" | "wajir" | "west_pokot",
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
                fundingDetails: validatedData.commercialViability.fundingDetails,
                // Business Model
                businessModelInnovation: validatedData.businessModel.businessModelInnovation,
                // Market Potential
                relativePricing: validatedData.marketPotential.relativePricing,
                productDifferentiation: validatedData.marketPotential.productDifferentiation,
                threatOfSubstitutes: validatedData.marketPotential.threatOfSubstitutes,
                easeOfMarketEntry: validatedData.marketPotential.easeOfMarketEntry,
                // Social Impact
                environmentalImpact: validatedData.socialImpact.environmentalImpact,
                specialGroupsEmployed: validatedData.socialImpact.specialGroupsEmployed,
                businessCompliance: validatedData.socialImpact.businessCompliance,
                // Documents
                salesEvidenceUrl: validatedData.documents?.salesEvidenceUrl,
                photosUrl: validatedData.documents?.photosUrl,
                taxComplianceUrl: validatedData.documents?.taxComplianceUrl,
            }).returning();

            // Create application record
            const [application] = await tx.insert(applications).values({
                userId,
                businessId: business.id,
                track: "foundation",
                status: "submitted",
                submittedAt: new Date(),
            }).returning();

            return { applicationId: application.id };
        });

        // Run eligibility check (outside transaction)
        const eligibilityResponse = await checkEligibility(result.applicationId);

        // Send confirmation email
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
        // Auth check
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to submit an application.");
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.name;

        // Validate form data
        const validatedData = accelerationApplicationSchema.parse(formData);

        // Database transaction
        const result = await db.transaction(async (tx) => {
            // Check for existing application
            const existingApp = await tx.query.applications.findFirst({
                where: eq(applications.userId, userId),
            });

            if (existingApp) {
                throw new Error("You have already submitted an application.");
            }

            // Ensure user exists
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

            // Create user profile
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

            // Create applicant record
            const [applicant] = await tx.insert(applicants).values({
                userId,
                firstName: validatedData.applicant.firstName,
                lastName: validatedData.applicant.lastName,
                idPassportNumber: validatedData.applicant.idPassportNumber,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).returning();

            // Create business record with all BIRE fields
            const [business] = await tx.insert(businesses).values({
                applicantId: applicant.id,
                name: validatedData.business.name,
                isRegistered: validatedData.business.isRegistered,
                registrationCertificateUrl: validatedData.business.registrationCertificateUrl,
                sector: validatedData.business.sector as "agriculture_and_agribusiness" | "manufacturing" | "renewable_energy" | "water_management" | "waste_management" | "forestry" | "tourism" | "transport" | "construction" | "ict" | "trade" | "healthcare" | "education" | "other",
                sectorOther: validatedData.business.sectorOther,
                description: validatedData.business.description,
                problemSolved: validatedData.business.problemSolved,
                country: "kenya",
                county: validatedData.business.county as "baringo" | "bomet" | "bungoma" | "busia" | "elgeyo_marakwet" | "embu" | "garissa" | "homa_bay" | "isiolo" | "kajiado" | "kakamega" | "kericho" | "kiambu" | "kilifi" | "kirinyaga" | "kisii" | "kisumu" | "kitui" | "kwale" | "laikipia" | "lamu" | "machakos" | "makueni" | "mandera" | "marsabit" | "meru" | "migori" | "mombasa" | "muranga" | "nairobi" | "nakuru" | "nandi" | "narok" | "nyamira" | "nyandarua" | "nyeri" | "samburu" | "siaya" | "taita_taveta" | "tana_river" | "tharaka_nithi" | "trans_nzoia" | "turkana" | "uasin_gishu" | "vihiga" | "wajir" | "west_pokot",
                city: validatedData.business.city,
                yearsOperational: validatedData.revenues.yearsOperational,
                hasFinancialRecords: validatedData.business.hasFinancialRecords,
                financialRecordsUrl: validatedData.business.financialRecordsUrl,
                hasAuditedAccounts: validatedData.business.hasAuditedAccounts,
                auditedAccountsUrl: validatedData.business.auditedAccountsUrl,
                // Revenues
                revenueLastYear: String(validatedData.revenues.revenueLastYear),
                hasExternalFunding: validatedData.revenues.hasExternalFunding,
                fundingDetails: validatedData.revenues.fundingDetails,
                futureSalesGrowth: validatedData.revenues.futureSalesGrowth,
                // Impact Potential
                currentSpecialGroupsEmployed: validatedData.impactPotential.currentSpecialGroupsEmployed,
                jobCreationPotential: validatedData.impactPotential.jobCreationPotential,
                // Scalability
                marketDifferentiation: validatedData.scalability.marketDifferentiation,
                competitiveAdvantage: validatedData.scalability.competitiveAdvantage,
                offeringFocus: validatedData.scalability.offeringFocus,
                salesMarketingIntegration: validatedData.scalability.salesMarketingIntegration,
                // Social Impact
                socialImpactHousehold: validatedData.socialImpact.socialImpactHousehold,
                supplierInvolvement: validatedData.socialImpact.supplierInvolvement,
                environmentalImpact: validatedData.socialImpact.environmentalImpact as "clearly_defined" | "neutral" | "not_defined" | "high" | "moderate" | "low",
                // Business Model
                businessModelUniqueness: validatedData.businessModel.businessModelUniqueness,
                customerValueProposition: validatedData.businessModel.customerValueProposition,
                competitiveAdvantageStrength: validatedData.businessModel.competitiveAdvantageStrength,
                // Documents
                salesEvidenceUrl: validatedData.documents?.salesEvidenceUrl,
                photosUrl: validatedData.documents?.photosUrl,
                taxComplianceUrl: validatedData.documents?.taxComplianceUrl,
            }).returning();

            // Create application record
            const [application] = await tx.insert(applications).values({
                userId,
                businessId: business.id,
                track: "acceleration",
                status: "submitted",
                submittedAt: new Date(),
            }).returning();

            return { applicationId: application.id };
        });

        // Run eligibility check (outside transaction)
        const eligibilityResponse = await checkEligibility(result.applicationId);

        // Send confirmation email
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
            },
            applicant: {
                firstName: applicationData.business.applicant.firstName,
                lastName: applicationData.business.applicant.lastName,
                email: applicationData.business.applicant.email,
            },
            eligibility: applicationData.eligibilityResults[0]
                ? {
                    isEligible: applicationData.eligibilityResults[0].isEligible,
                    totalScore: applicationData.eligibilityResults[0].totalScore,
                }
                : null,
        });
    } catch (error) {
        console.error("Error fetching user application:", error);
        return errorResponse("Failed to fetch application");
    }
}
