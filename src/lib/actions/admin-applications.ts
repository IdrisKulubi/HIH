"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications, eligibilityResults } from "../../../db/schema";
import { eq, desc, count as drizzleCount } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActionResponse, successResponse, errorResponse, PaginatedResponse, paginatedResponse } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface ApplicationFilters {
    status?: string;
    search?: string;
    track?: "foundation" | "acceleration" | "all";
    page?: number;
    limit?: number;
}

export interface ApplicationListItem {
    id: number;
    status: string;
    track: string | null;
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
        gender: string;
    };
    eligibility: {
        isEligible: boolean;
        totalScore: number | null;
    } | null;
}

export interface ApplicationStats {
    totalApplications: number;
    foundationTrack: number;
    accelerationTrack: number;
    eligibleApplications: number;
    pendingReview: number;
}

export interface DetailedApplication extends ApplicationListItem {
    business: {
        id: number;
        name: string;
        sector: string | null;
        sectorOther: string | null;
        county: string | null;
        city: string;
        isRegistered: boolean;
        registrationCertificateUrl: string | null;
        yearsOperational: number | null;
        description: string;
        problemSolved: string;
        hasFinancialRecords: boolean | null;
        hasAuditedAccounts: boolean | null;
        revenueLastYear: string | null;
        customerCount: number | null;
        hasExternalFunding: boolean | null;
        specialGroupsEmployed: number | null;
        environmentalImpact: string | null;
        businessCompliance: string | null;
    };
    applicant: {
        id: number;
        firstName: string;
        lastName: string;
        idPassportNumber: string;
        gender: string;
        phoneNumber: string;
        email: string;
    };
    eligibility: {
        id: number;
        isEligible: boolean;
        totalScore: number | null;
        evaluationNotes: string | null;
        evaluatedAt: string | null;
        evaluatedBy: string | null;
    } | null;
}

// =============================================================================
// ADMIN STATS
// =============================================================================

export async function getApplicationStats(): Promise<ActionResponse<ApplicationStats>> {
    try {
        // Total applications
        const totalResult = await db.select({ count: drizzleCount() }).from(applications);
        const totalApplications = totalResult[0]?.count ?? 0;

        // Foundation track count
        const foundationResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(eq(applications.track, "foundation"));
        const foundationTrack = foundationResult[0]?.count ?? 0;

        // Acceleration track count
        const accelerationResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(eq(applications.track, "acceleration"));
        const accelerationTrack = accelerationResult[0]?.count ?? 0;

        // Eligible applications
        const eligibleResult = await db.select({ count: drizzleCount() })
            .from(eligibilityResults)
            .where(eq(eligibilityResults.isEligible, true));
        const eligibleApplications = eligibleResult[0]?.count ?? 0;

        // Pending review
        const pendingResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(eq(applications.status, "submitted"));
        const pendingReview = pendingResult[0]?.count ?? 0;

        return successResponse({
            totalApplications,
            foundationTrack,
            accelerationTrack,
            eligibleApplications,
            pendingReview,
        });
    } catch (error) {
        console.error("Error fetching application stats:", error);
        return errorResponse("Failed to fetch application statistics");
    }
}

// =============================================================================
// LIST APPLICATIONS (ADMIN)
// =============================================================================

export async function getApplications(
    filters: ApplicationFilters = {}
): Promise<PaginatedResponse<ApplicationListItem>> {
    try {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        // Fetch all applications with related data
        const allApplications = await db.query.applications.findMany({
            orderBy: [desc(applications.updatedAt)],
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

        // Apply filters
        let filteredData = allApplications;

        // Status filter
        if (filters.status && filters.status !== "all") {
            if (filters.status === "eligible") {
                filteredData = filteredData.filter(
                    (app) => app.eligibilityResults[0]?.isEligible === true
                );
            } else if (filters.status === "ineligible") {
                filteredData = filteredData.filter(
                    (app) => app.eligibilityResults[0]?.isEligible === false
                );
            } else {
                filteredData = filteredData.filter((app) => app.status === filters.status);
            }
        }

        // Track filter
        if (filters.track && filters.track !== "all") {
            filteredData = filteredData.filter((app) => app.track === filters.track);
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredData = filteredData.filter(
                (app) =>
                    app.business.name.toLowerCase().includes(searchTerm) ||
                    app.business.applicant.firstName.toLowerCase().includes(searchTerm) ||
                    app.business.applicant.lastName.toLowerCase().includes(searchTerm) ||
                    app.business.city.toLowerCase().includes(searchTerm) ||
                    app.id.toString().includes(searchTerm)
            );
        }

        const totalFiltered = filteredData.length;
        const paginatedData = filteredData.slice(offset, offset + limit);

        // Map to response format
        const mappedData: ApplicationListItem[] = paginatedData.map((app) => ({
            id: app.id,
            status: app.status,
            track: app.track,
            submittedAt: app.submittedAt?.toISOString() ?? null,
            business: {
                name: app.business.name,
                sector: app.business.sector,
                county: app.business.county,
                city: app.business.city,
            },
            applicant: {
                firstName: app.business.applicant.firstName,
                lastName: app.business.applicant.lastName,
                email: app.business.applicant.email,
                gender: app.business.applicant.gender,
            },
            eligibility: app.eligibilityResults[0]
                ? {
                    isEligible: app.eligibilityResults[0].isEligible,
                    totalScore: app.eligibilityResults[0].totalScore,
                }
                : null,
        }));

        return paginatedResponse(mappedData, {
            total: totalFiltered,
            page,
            limit,
            pages: Math.ceil(totalFiltered / limit),
        });
    } catch (error) {
        console.error("Error fetching applications:", error);
        return {
            success: false,
            error: "Failed to fetch applications",
            pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        };
    }
}

// =============================================================================
// GET APPLICATION BY ID (ADMIN)
// =============================================================================

export async function getApplicationById(
    id: number
): Promise<ActionResponse<DetailedApplication>> {
    try {
        const applicationData = await db.query.applications.findFirst({
            where: eq(applications.id, id),
            with: {
                business: {
                    with: {
                        applicant: true,
                    },
                },
                eligibilityResults: {
                    orderBy: (results, { desc }) => [desc(results.evaluatedAt)],
                    limit: 1,
                },
            },
        });

        if (!applicationData) {
            return errorResponse("Application not found");
        }

        const result: DetailedApplication = {
            id: applicationData.id,
            status: applicationData.status,
            track: applicationData.track,
            submittedAt: applicationData.submittedAt?.toISOString() ?? null,
            business: {
                id: applicationData.business.id,
                name: applicationData.business.name,
                sector: applicationData.business.sector,
                sectorOther: applicationData.business.sectorOther,
                county: applicationData.business.county,
                city: applicationData.business.city,
                isRegistered: applicationData.business.isRegistered,
                registrationCertificateUrl: applicationData.business.registrationCertificateUrl,
                yearsOperational: applicationData.business.yearsOperational,
                description: applicationData.business.description,
                problemSolved: applicationData.business.problemSolved,
                hasFinancialRecords: applicationData.business.hasFinancialRecords,
                hasAuditedAccounts: applicationData.business.hasAuditedAccounts,
                revenueLastYear: applicationData.business.revenueLastYear,
                customerCount: applicationData.business.customerCount,
                hasExternalFunding: applicationData.business.hasExternalFunding,
                specialGroupsEmployed: applicationData.business.specialGroupsEmployed,
                environmentalImpact: applicationData.business.environmentalImpact,
                businessCompliance: applicationData.business.businessCompliance,
            },
            applicant: {
                id: applicationData.business.applicant.id,
                firstName: applicationData.business.applicant.firstName,
                lastName: applicationData.business.applicant.lastName,
                idPassportNumber: applicationData.business.applicant.idPassportNumber,
                gender: applicationData.business.applicant.gender,
                phoneNumber: applicationData.business.applicant.phoneNumber,
                email: applicationData.business.applicant.email,
            },
            eligibility: applicationData.eligibilityResults[0]
                ? {
                    id: applicationData.eligibilityResults[0].id,
                    isEligible: applicationData.eligibilityResults[0].isEligible,
                    totalScore: applicationData.eligibilityResults[0].totalScore,
                    evaluationNotes: applicationData.eligibilityResults[0].evaluationNotes,
                    evaluatedAt: applicationData.eligibilityResults[0].evaluatedAt?.toISOString() ?? null,
                    evaluatedBy: applicationData.eligibilityResults[0].evaluatedBy,
                }
                : null,
        };

        return successResponse(result);
    } catch (error) {
        console.error("Error fetching application by ID:", error);
        return errorResponse("Failed to fetch application details");
    }
}

// =============================================================================
// UPDATE APPLICATION STATUS (ADMIN)
// =============================================================================

type ApplicationStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "waitlisted";

export async function updateApplicationStatus(
    applicationId: number,
    status: ApplicationStatus
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to perform this action");
        }

        await db
            .update(applications)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(applications.id, applicationId));

        revalidatePath(`/admin/applications/${applicationId}`);
        revalidatePath("/admin/applications");

        return successResponse(undefined, `Application status updated to ${status}`);
    } catch (error) {
        console.error("Error updating application status:", error);
        return errorResponse("Failed to update application status");
    }
}

// =============================================================================
// SAVE EVALUATION (ADMIN)
// =============================================================================

interface EvaluationInput {
    applicationId: number;
    totalScore: number;
    isEligible: boolean;
    evaluationNotes?: string;
}

export async function saveEvaluation(
    data: EvaluationInput
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("You must be logged in to evaluate applications");
        }

        // Find existing eligibility record
        const existing = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, data.applicationId),
        });

        const payload = {
            applicationId: data.applicationId,
            totalScore: data.totalScore,
            isEligible: data.isEligible,
            evaluationNotes: data.evaluationNotes ?? null,
            evaluatedAt: new Date(),
            evaluatedBy: session.user.id,
            updatedAt: new Date(),
        };

        if (existing) {
            await db
                .update(eligibilityResults)
                .set(payload)
                .where(eq(eligibilityResults.id, existing.id));
        } else {
            await db.insert(eligibilityResults).values({
                ...payload,
                // Default values for required fields
                ageEligible: true,
                registrationEligible: true,
                revenueEligible: true,
                businessPlanEligible: true,
                impactEligible: true,
            });
        }

        // Update application status
        await db
            .update(applications)
            .set({
                status: "under_review",
                updatedAt: new Date(),
            })
            .where(eq(applications.id, data.applicationId));

        revalidatePath(`/admin/applications/${data.applicationId}`);
        revalidatePath("/admin/applications");

        return successResponse(undefined, "Evaluation saved successfully");
    } catch (error) {
        console.error("Error saving evaluation:", error);
        return errorResponse("Failed to save evaluation");
    }
}
