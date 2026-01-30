"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications, eligibilityResults } from "../../../db/schema";
import { eq, desc, and, count as drizzleCount, not } from "drizzle-orm";
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
    scoreRange?: 'all' | 'passing' | 'borderline' | 'below' | 'not_scored';
}

export interface ApplicationListItem {
    id: number;
    status: string;
    track: string | null;
    submittedAt: string | null;
    isObservationOnly: boolean;
    markedForRevisit: boolean;
    business: {
        name: string;
        sector: string | null;
        county: string | null;
        city: string;
        country: string; // Added to match frontend Application interface
        applicant: {      // Added to match frontend Application interface
            firstName: string;
            lastName: string;
        };
    };
    applicant: {
        firstName: string;
        lastName: string;
        email: string;
        gender: string;
    };
    eligibilityResults: {
        id: number;
        isEligible: boolean;
        totalScore: number | null;
        systemScore: number | null; // Initial automated score (preserved)
        // Granular flags for "Failure Insights"
        ageEligible: boolean;
        registrationEligible: boolean;
        revenueEligible: boolean;
        businessPlanEligible: boolean;
        impactEligible: boolean;
        evaluatedAt: string | null;
        evaluatedBy: string | null;
        evaluator?: any;
    }[];
}

export interface ApplicationStats {
    grandTotal: number; // Total including observation apps
    totalApplications: number; // Filtered total (excluding observation)
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
        country: string;
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
        // employees structure to match Admin UI expectation
        employees: {
            fullTimeTotal: number;
            fullTimeMale: number; // Derived/Legacy
            fullTimeFemale: number;
            partTimeMale: number;
            partTimeFemale: number;
            fullTimeYouth: number; // New field
            fullTimePwd: number; // New field
        };
        specialGroupsEmployed: number | null;
        environmentalImpact: string | null;
        environmentalImpactDescription?: string | null;
        businessCompliance: string | null;
        externalFundingDetails?: string | null;
        businessModelInnovation?: string | null;
        businessModelDescription?: string | null;
        digitizationLevel?: boolean | null;
        digitizationReason?: string | null;
        relativePricing?: string | null;
        productDifferentiation?: string | null;
        threatOfSubstitutes?: string | null;
        competitorOverview?: string | null;
        easeOfMarketEntry?: string | null;
        averageAnnualRevenueGrowth?: string | null;
        scalabilityPlan?: string | null;
        marketScalePotential?: string | null;
        marketDifferentiation?: string | null;
        marketDifferentiationDescription?: string | null;
        competitiveAdvantage?: string | null;
        competitiveAdvantageSource?: string | null;
        technologyIntegration?: string | null;
        technologyIntegrationDescription?: string | null;
        salesMarketingIntegration?: string | null;
        salesMarketingApproach?: string | null;
        socialImpactContribution?: string | null;
        socialImpactContributionDescription?: string | null;
        jobCreationPotential?: string | null;
        projectedInclusion?: string | null;
        supplierInvolvement?: string | null;
        supplierSupportDescription?: string | null;
        businessModelUniqueness?: string | null;
        businessModelUniquenessDescription?: string | null;
        customerValueProposition?: string | null;
        competitiveAdvantageStrength?: string | null;
        competitiveAdvantageBarriers?: string | null;
        hasSocialSafeguarding?: boolean | null;
        declarationName?: string | null;
        declarationDate?: string | null;
        growthHistory?: string | null;
        futureSalesGrowth?: string | null;
        futureSalesGrowthReason?: string | null;
        // Document URLs
        registrationType: string | null;
        salesEvidenceUrl?: string | null;
        photosUrl?: string | null;
        taxComplianceUrl?: string | null;
        financialRecordsUrl?: string | null;
        auditedAccountsUrl?: string | null;
        complianceDocumentsUrl?: string | null;
        applicant: { // Inherited/Overridden for Detail View consistency if needed
            firstName: string;
            lastName: string;
        };
    };
    applicant: {
        id: number;
        idPassportNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        gender: string;
        phoneNumber: string;
        dateOfBirth: string | null;

    };
    // DetailedApplication extends ApplicationListItem so it inherits eligibilityResults
    // We explicitly add `eligibility` back for Detailed view compatibility
    eligibility: {
        id: number;
        isEligible: boolean;
        totalScore: number | null;
        systemScore: number | null; // Initial automated score (preserved)
        evaluationNotes: string | null;
        evaluatedAt: string | null;
        evaluatedBy: string | null;
        categoryTotals?: {
            innovation: number;
            viability: number;
            alignment: number;
            orgCapacity: number;
        };
        mandatoryCriteria?: any;
        evaluationScores?: any;
        reviewer1Score?: number | null;
        reviewer1Notes?: string | null;
        reviewer1At?: string | null;
        reviewer2Score?: number | null;
        reviewer2Notes?: string | null;
        reviewer2At?: string | null;
        adminOversightComment?: string | null;
    } | null;
}

// =============================================================================
// ADMIN STATS
// =============================================================================

export async function getApplicationStats(): Promise<ActionResponse<ApplicationStats>> {
    try {
        // Grand total - ALL applications (including observation-only)
        const grandTotalResult = await db.select({ count: drizzleCount() })
            .from(applications);
        const grandTotal = grandTotalResult[0]?.count ?? 0;

        // Total applications (excluding observation-only)
        const totalResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(not(eq(applications.isObservationOnly, true)));
        const totalApplications = totalResult[0]?.count ?? 0;

        // Foundation track count (excluding observation-only)
        const foundationResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(and(
                eq(applications.track, "foundation"),
                not(eq(applications.isObservationOnly, true))
            ));
        const foundationTrack = foundationResult[0]?.count ?? 0;

        // Acceleration track count (excluding observation-only)
        const accelerationResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(and(
                eq(applications.track, "acceleration"),
                not(eq(applications.isObservationOnly, true))
            ));
        const accelerationTrack = accelerationResult[0]?.count ?? 0;

        // Eligible applications (excluding observation-only)
        const eligibleResult = await db.select({ count: drizzleCount() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(and(
                eq(eligibilityResults.isEligible, true),
                not(eq(applications.isObservationOnly, true))
            ));
        const eligibleApplications = eligibleResult[0]?.count ?? 0;

        // Pending review (excluding observation-only)
        const pendingResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(and(
                eq(applications.status, "submitted"),
                not(eq(applications.isObservationOnly, true))
            ));
        const pendingReview = pendingResult[0]?.count ?? 0;

        return successResponse({
            grandTotal,
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
                    with: {
                        evaluator: {
                            with: {
                                userProfile: true
                            }
                        }
                    }
                },
            },
        });

        // ... (filtering logic unchanged) ...
        // Apply filters
        let filteredData = allApplications;

        // EXCLUDE observation-only applications from main dashboard
        filteredData = filteredData.filter(app => !app.isObservationOnly);

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

        // Score Range Filter
        if (filters.scoreRange && filters.scoreRange !== "all") {
            filteredData = filteredData.filter((app) => {
                const result = app.eligibilityResults[0];
                const score = result?.totalScore ? Number(result.totalScore) : null;

                switch (filters.scoreRange) {
                    case "passing":
                        return score !== null && score >= 60;
                    case "borderline":
                        return score !== null && score >= 40 && score < 60;
                    case "below":
                        return score !== null && score < 50;
                    case "not_scored":
                        return score === null;
                    default:
                        return true;
                }
            });
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
            isObservationOnly: app.isObservationOnly,
            markedForRevisit: app.markedForRevisit,
            business: {
                name: app.business.name,
                sector: app.business.sector,
                county: app.business.county,
                city: app.business.city,
                country: app.business.country,
                applicant: {
                    firstName: app.business.applicant.firstName,
                    lastName: app.business.applicant.lastName,
                }
            },
            applicant: {
                firstName: app.business.applicant.firstName,
                lastName: app.business.applicant.lastName,
                email: app.business.applicant.email,
                gender: app.business.applicant.gender,
            },
            eligibilityResults: app.eligibilityResults.map(er => ({
                id: er.id,
                isEligible: er.isEligible,
                totalScore: er.totalScore ? Number(er.totalScore) : null,
                systemScore: er.systemScore ? Number(er.systemScore) : null,
                // Map granular flags
                ageEligible: er.ageEligible,
                registrationEligible: er.registrationEligible,
                revenueEligible: er.revenueEligible,
                businessPlanEligible: er.businessPlanEligible,
                impactEligible: er.impactEligible,
                evaluatedAt: er.evaluatedAt?.toISOString() ?? null,
                evaluatedBy: er.evaluatedBy,
                evaluator: er.evaluator // Pass the rich evaluator object
            }))
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
                    orderBy: (results: { evaluatedAt: any; }, { desc }: any) => [desc(results.evaluatedAt)],
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
            isObservationOnly: applicationData.isObservationOnly,
            markedForRevisit: applicationData.markedForRevisit,
            business: {
                id: applicationData.business.id,
                name: applicationData.business.name,
                sector: applicationData.business.sector,
                sectorOther: applicationData.business.sectorOther,
                county: applicationData.business.county,
                city: applicationData.business.city,
                country: applicationData.business.country,
                applicant: {
                    firstName: applicationData.business.applicant.firstName,
                    lastName: applicationData.business.applicant.lastName,
                },
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
                // Calculate special groups from breakdown
                specialGroupsEmployed: (applicationData.business.fullTimeEmployeesWomen || 0) +
                    (applicationData.business.fullTimeEmployeesYouth || 0) +
                    (applicationData.business.fullTimeEmployeesPwd || 0),
                environmentalImpact: applicationData.business.environmentalImpact,
                environmentalImpactDescription: applicationData.business.environmentalImpactDescription,
                businessCompliance: applicationData.business.businessCompliance,
                growthHistory: applicationData.business.growthHistory,
                futureSalesGrowth: applicationData.business.futureSalesGrowth,
                futureSalesGrowthReason: applicationData.business.futureSalesGrowthReason,
                externalFundingDetails: applicationData.business.externalFundingDetails,
                businessModelInnovation: applicationData.business.businessModelInnovation,
                businessModelDescription: applicationData.business.businessModelDescription,
                digitizationLevel: applicationData.business.digitizationLevel,
                digitizationReason: applicationData.business.digitizationReason,
                relativePricing: applicationData.business.relativePricing,
                productDifferentiation: applicationData.business.productDifferentiation,
                threatOfSubstitutes: applicationData.business.threatOfSubstitutes,
                competitorOverview: applicationData.business.competitorOverview,
                easeOfMarketEntry: applicationData.business.easeOfMarketEntry,
                averageAnnualRevenueGrowth: applicationData.business.averageAnnualRevenueGrowth,
                scalabilityPlan: applicationData.business.scalabilityPlan,
                marketScalePotential: applicationData.business.marketScalePotential,
                marketDifferentiation: applicationData.business.marketDifferentiation,
                marketDifferentiationDescription: applicationData.business.marketDifferentiationDescription,
                competitiveAdvantage: applicationData.business.competitiveAdvantage,
                competitiveAdvantageSource: applicationData.business.competitiveAdvantageSource,
                technologyIntegration: applicationData.business.technologyIntegration,
                technologyIntegrationDescription: applicationData.business.technologyIntegrationDescription,
                salesMarketingIntegration: applicationData.business.salesMarketingIntegration,
                salesMarketingApproach: applicationData.business.salesMarketingApproach,
                socialImpactContribution: applicationData.business.socialImpactContribution,
                socialImpactContributionDescription: applicationData.business.socialImpactContributionDescription,
                jobCreationPotential: applicationData.business.jobCreationPotential,
                projectedInclusion: applicationData.business.projectedInclusion,
                supplierInvolvement: applicationData.business.supplierInvolvement,
                supplierSupportDescription: applicationData.business.supplierSupportDescription,
                businessModelUniqueness: applicationData.business.businessModelUniqueness,
                businessModelUniquenessDescription: applicationData.business.businessModelUniquenessDescription,
                customerValueProposition: applicationData.business.customerValueProposition,
                competitiveAdvantageStrength: applicationData.business.competitiveAdvantageStrength,
                competitiveAdvantageBarriers: applicationData.business.competitiveAdvantageBarriers,
                hasSocialSafeguarding: applicationData.business.hasSocialSafeguarding,
                declarationName: applicationData.business.declarationName,
                declarationDate: applicationData.business.declarationDate?.toISOString() ?? null,
                // Document URLs
                registrationType: applicationData.business.registrationType,
                salesEvidenceUrl: applicationData.business.salesEvidenceUrl,
                photosUrl: applicationData.business.photosUrl,
                taxComplianceUrl: applicationData.business.taxComplianceUrl,
                financialRecordsUrl: applicationData.business.financialRecordsUrl,
                auditedAccountsUrl: applicationData.business.auditedAccountsUrl,
                complianceDocumentsUrl: applicationData.business.complianceDocumentsUrl,
                // Manually map employee breakdown
                employees: {
                    fullTimeTotal: applicationData.business.fullTimeEmployeesTotal ?? 0,
                    fullTimeMale: 0, // Not explicitly tracked in new form
                    fullTimeFemale: applicationData.business.fullTimeEmployeesWomen ?? 0,
                    partTimeMale: 0,
                    partTimeFemale: 0,
                    fullTimeYouth: applicationData.business.fullTimeEmployeesYouth ?? 0,
                    fullTimePwd: applicationData.business.fullTimeEmployeesPwd ?? 0,
                },
            },
            applicant: {
                id: applicationData.business.applicant.id,
                firstName: applicationData.business.applicant.firstName,
                lastName: applicationData.business.applicant.lastName,
                idPassportNumber: applicationData.business.applicant.idPassportNumber,
                dateOfBirth: applicationData.business.applicant.dob?.toISOString() ?? null,
                gender: applicationData.business.applicant.gender,
                phoneNumber: applicationData.business.applicant.phoneNumber,
                email: applicationData.business.applicant.email,
            },
            eligibilityResults: applicationData.eligibilityResults.map(er => ({
                id: er.id,
                isEligible: er.isEligible,
                totalScore: er.totalScore ? Number(er.totalScore) : null,
                systemScore: er.systemScore ? Number(er.systemScore) : null,
                // Granular flags
                ageEligible: er.ageEligible,
                registrationEligible: er.registrationEligible,
                revenueEligible: er.revenueEligible,
                businessPlanEligible: er.businessPlanEligible,
                impactEligible: er.impactEligible,
                evaluatedAt: er.evaluatedAt?.toISOString() ?? null,
                evaluatedBy: er.evaluatedBy,
            })),
            eligibility: applicationData.eligibilityResults[0]
                ? {
                    id: applicationData.eligibilityResults[0].id,
                    isEligible: applicationData.eligibilityResults[0].isEligible,
                    totalScore: applicationData.eligibilityResults[0].totalScore ? Number(applicationData.eligibilityResults[0].totalScore) : null,
                    systemScore: applicationData.eligibilityResults[0].systemScore ? Number(applicationData.eligibilityResults[0].systemScore) : null,
                    evaluationNotes: applicationData.eligibilityResults[0].evaluationNotes,
                    evaluatedAt: applicationData.eligibilityResults[0].evaluatedAt?.toISOString() ?? null,
                    evaluatedBy: applicationData.eligibilityResults[0].evaluatedBy,
                    // Category totals - direct from DB (no reconstruction needed)
                    categoryTotals: {
                        innovation: applicationData.eligibilityResults[0].innovationTotal ? Number(applicationData.eligibilityResults[0].innovationTotal) : 0,
                        viability: applicationData.eligibilityResults[0].viabilityTotal ? Number(applicationData.eligibilityResults[0].viabilityTotal) : 0,
                        alignment: applicationData.eligibilityResults[0].alignmentTotal ? Number(applicationData.eligibilityResults[0].alignmentTotal) : 0,
                        orgCapacity: applicationData.eligibilityResults[0].orgCapacityTotal ? Number(applicationData.eligibilityResults[0].orgCapacityTotal) : 0,
                    },
                    mandatoryCriteria: {
                        ageEligible: applicationData.eligibilityResults[0].ageEligible,
                        registrationEligible: applicationData.eligibilityResults[0].registrationEligible,
                        revenueEligible: applicationData.eligibilityResults[0].revenueEligible,
                        businessPlanEligible: applicationData.eligibilityResults[0].businessPlanEligible,
                        impactEligible: applicationData.eligibilityResults[0].impactEligible,
                    },
                    reviewer1Score: applicationData.eligibilityResults[0].reviewer1Score ? Number(applicationData.eligibilityResults[0].reviewer1Score) : null,
                    reviewer1Notes: applicationData.eligibilityResults[0].reviewer1Notes,
                    reviewer1At: applicationData.eligibilityResults[0].reviewer1At?.toISOString() ?? null,
                    reviewer2Score: applicationData.eligibilityResults[0].reviewer2Score ? Number(applicationData.eligibilityResults[0].reviewer2Score) : null,
                    reviewer2Notes: applicationData.eligibilityResults[0].reviewer2Notes,
                    reviewer2At: applicationData.eligibilityResults[0].reviewer2At?.toISOString() ?? null,
                    adminOversightComment: applicationData.eligibilityResults[0].adminOversightComment,
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

type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

export async function updateApplicationStatus(
    applicationId: number,
    status: ApplicationStatus,
    reason?: string // Optional reason logging could be added
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
            totalScore: String(data.totalScore), // Cast to string/decimal if needed
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

// =============================================================================
// ADMIN OVERSIGHT (ADMIN REVIEW SECTION)
// =============================================================================

export async function getReviewedApplications(): Promise<ActionResponse<ApplicationListItem[]>> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return errorResponse("Unauthorized. Admin access only.");
        }

        // Fetch applications that have at least one reviewer score
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
                    with: {
                        evaluator: {
                            with: {
                                userProfile: true
                            }
                        }
                    }
                },
            },
        });

        // Filter for those that have been reviewed (either R1 or R2)
        const reviewedApplications = allApplications.filter(app => {
            const result = app.eligibilityResults[0];
            return result && (result.reviewer1Score !== null || result.reviewer2Score !== null);
        });

        // Map to ApplicationListItem
        const mappedData: ApplicationListItem[] = reviewedApplications.map((app) => ({
            id: app.id,
            status: app.status,
            track: app.track,
            submittedAt: app.submittedAt?.toISOString() ?? null,
            isObservationOnly: app.isObservationOnly,
            markedForRevisit: app.markedForRevisit,
            business: {
                name: app.business.name,
                sector: app.business.sector,
                county: app.business.county,
                city: app.business.city,
                country: app.business.country,
                applicant: {
                    firstName: app.business.applicant.firstName,
                    lastName: app.business.applicant.lastName,
                }
            },
            applicant: {
                firstName: app.business.applicant.firstName,
                lastName: app.business.applicant.lastName,
                email: app.business.applicant.email,
                gender: app.business.applicant.gender,
            },
            eligibilityResults: app.eligibilityResults.map(er => ({
                id: er.id,
                isEligible: er.isEligible,
                totalScore: er.totalScore ? Number(er.totalScore) : null,
                systemScore: er.systemScore ? Number(er.systemScore) : null,
                ageEligible: er.ageEligible,
                registrationEligible: er.registrationEligible,
                revenueEligible: er.revenueEligible,
                businessPlanEligible: er.businessPlanEligible,
                impactEligible: er.impactEligible,
                evaluatedAt: er.evaluatedAt?.toISOString() ?? null,
                evaluatedBy: er.evaluatedBy,
                evaluator: er.evaluator
            }))
        }));

        return successResponse(mappedData);
    } catch (error) {
        console.error("Error fetching reviewed applications:", error);
        return errorResponse("Failed to fetch reviewed applications");
    }
}

export async function saveAdminOversightComment(
    applicationId: number,
    comment: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return errorResponse("Unauthorized. Admin access only.");
        }

        await db
            .update(eligibilityResults)
            .set({
                adminOversightComment: comment,
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.applicationId, applicationId));

        revalidatePath(`/admin/review/${applicationId}`);
        revalidatePath("/admin/review");

        return successResponse(undefined, "Oversight comment saved successfully");
    } catch (error) {
        console.error("Error saving oversight comment:", error);
        return errorResponse("Failed to save oversight comment");
    }
}
