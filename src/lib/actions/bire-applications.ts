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

import {
    foundationApplicationSchema,
    accelerationApplicationSchema,
    type FoundationApplicationFormData,
    type AccelerationApplicationFormData, // Note: exported type names might differ slightly, checking definitions
} from "@/components/application/schemas/bire-application-schema";

// Helper type aliases to match existing code usage if needed
export type FoundationApplicationData = FoundationApplicationFormData;
export type AccelerationApplicationData = AccelerationApplicationFormData;

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

        let userId = session.user.id;
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

            // If not found by ID, check by email to avoid duplicates
            if (!user && userEmail) {
                user = await tx.query.users.findFirst({
                    where: eq(users.email, userEmail),
                });

                // If found by email, we must use THIS user's ID for consistency
                if (user) {
                    // Update the local userId variable to match the existing record
                    // This ensures all downstream tables (applicants, etc) link to the correct existing user
                    userId = user.id;
                }
            }

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
                dob: validatedData.applicant.dob,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).onConflictDoUpdate({
                target: applicants.userId,
                set: {
                    firstName: validatedData.applicant.firstName,
                    lastName: validatedData.applicant.lastName,
                    idPassportNumber: validatedData.applicant.idPassportNumber,
                    dob: validatedData.applicant.dob,
                    gender: validatedData.applicant.gender,
                    phoneNumber: validatedData.applicant.phoneNumber,
                    email: validatedData.applicant.email,
                    updatedAt: new Date(),
                },
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
                hasAuditedAccounts: !!validatedData.documents?.auditedAccountsUrl,
                auditedAccountsUrl: validatedData.documents?.auditedAccountsUrl,

                // Commercial Viability
                revenueLastYear: String(validatedData.commercialViability.revenueLastYear),
                customerCount: validatedData.commercialViability.customerCount,
                hasExternalFunding: validatedData.commercialViability.hasExternalFunding,
                externalFundingDetails: validatedData.commercialViability.externalFundingDetails,
                digitizationLevel: validatedData.commercialViability.digitizationLevel,
                digitizationReason: validatedData.commercialViability.digitizationReason,

                // Business Model
                businessModelInnovation: validatedData.businessModel.businessModelInnovation,
                businessModelDescription: validatedData.businessModel.businessModelDescription,

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

            // Check if this should be an observation-only application
            // Criteria: Kenya-registered + revenue < 500,000 KES
            const revenueValue = Number(validatedData.commercialViability.revenueLastYear) || 0;
            const isObservation = revenueValue < 500000;

            return { applicationId: application.id, isObservation };
        });

        const eligibilityResponse = await checkEligibility(result.applicationId);

        // If observation mode, update the flag and skip email
        if (result.isObservation) {
            await db.update(applications)
                .set({ isObservationOnly: true })
                .where(eq(applications.id, result.applicationId));
            console.log(`[OBSERVATION] Application ${result.applicationId} marked as observation-only (revenue < 500k)`);
        } else {
            // Only send confirmation email for qualified applicants
            await sendApplicationSubmissionEmail({
                userEmail: userEmail!,
                applicantName: userName || formData.applicant.firstName,
                applicationId: result.applicationId.toString(),
                businessName: formData.business.name,
                submissionDate: new Date().toISOString(),
            });
        }

        revalidatePath("/apply");
        revalidatePath("/dashboard");

        return successResponse(
            {
                applicationId: result.applicationId,
                track: "foundation",
                eligibilityScore: eligibilityResponse.success ? (eligibilityResponse.data?.eligibilityResult.totalScore ? Number(eligibilityResponse.data.eligibilityResult.totalScore) : undefined) : undefined,
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

        let userId = session.user.id;
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

            // If not found by ID, check by email to avoid duplicates
            if (!user && userEmail) {
                user = await tx.query.users.findFirst({
                    where: eq(users.email, userEmail),
                });

                // If found by email, we must use THIS user's ID for consistency
                if (user) {
                    userId = user.id;
                }
            }

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
                dob: validatedData.applicant.dob,
                gender: validatedData.applicant.gender,
                phoneNumber: validatedData.applicant.phoneNumber,
                email: validatedData.applicant.email,
            }).onConflictDoUpdate({
                target: applicants.userId,
                set: {
                    firstName: validatedData.applicant.firstName,
                    lastName: validatedData.applicant.lastName,
                    idPassportNumber: validatedData.applicant.idPassportNumber,
                    dob: validatedData.applicant.dob,
                    gender: validatedData.applicant.gender,
                    phoneNumber: validatedData.applicant.phoneNumber,
                    email: validatedData.applicant.email,
                    updatedAt: new Date(),
                },
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
                hasAuditedAccounts: !!validatedData.revenues.auditedAccountsUrl,
                auditedAccountsUrl: validatedData.revenues.auditedAccountsUrl,

                // Revenues
                revenueLastYear: String(validatedData.revenues.revenueLastYear),
                growthHistory: validatedData.revenues.growthHistory,
                averageAnnualRevenueGrowth: validatedData.revenues.averageAnnualRevenueGrowth,
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
                projectedInclusion: validatedData.impactPotential.projectedInclusion,

                // Scalability
                scalabilityPlan: validatedData.scalability.scalabilityPlan,
                marketScalePotential: validatedData.scalability.marketScalePotential,
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
                eligibilityScore: eligibilityResponse.success ? (eligibilityResponse.data?.eligibilityResult.totalScore ? Number(eligibilityResponse.data.eligibilityResult.totalScore) : undefined) : undefined,
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

        let userId = session.user.id;
        const userEmail = session.user.email;

        // Resolve correct userId based on email if needed (same logic as submission)
        if (userEmail) {
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, userEmail),
            });
            if (existingUser) {
                userId = existingUser.id;
            }
        }

        const applicationData = await db.query.applications.findFirst({
            where: eq(applications.userId, userId),
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
