"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications } from "../../../db/schema";
import { eq, desc, and, count as drizzleCount } from "drizzle-orm";
import { ActionResponse, successResponse, errorResponse } from "./types";
import { revalidatePath } from "next/cache";

export interface ObservationApplication {
    id: number;
    status: string;
    track: string | null;
    submittedAt: string | null;
    isObservationOnly: boolean;
    markedForRevisit: boolean;
    revisitMarkedAt: string | null;
    business: {
        name: string;
        sector: string | null;
        county: string | null;
        city: string;
        country: string;
        revenueLastYear: string | null;
        fullTimeEmployeesTotal: number | null;
        description: string;
    };
    applicant: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        gender: string;
    };
}

export interface ObservationStats {
    totalObservation: number;
    totalRevisit: number;
    averageRevenue: number;
    uniqueSectors: number;
}

/**
 * Get observation statistics for dashboard
 */
export async function getObservationStats(): Promise<ActionResponse<ObservationStats>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("Unauthorized");
        }

        // Total observation count
        const totalResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(eq(applications.isObservationOnly, true));
        const totalObservation = totalResult[0]?.count ?? 0;

        // Revisit count
        const revisitResult = await db.select({ count: drizzleCount() })
            .from(applications)
            .where(and(
                eq(applications.isObservationOnly, true),
                eq(applications.markedForRevisit, true)
            ));
        const totalRevisit = revisitResult[0]?.count ?? 0;

        // Get all observation apps for average revenue and unique sectors
        const apps = await db.query.applications.findMany({
            where: eq(applications.isObservationOnly, true),
            with: {
                business: true,
            },
        });

        let totalRevenue = 0;
        const sectors = new Set<string>();

        for (const app of apps) {
            if (app.business.revenueLastYear) {
                const rev = parseFloat(app.business.revenueLastYear);
                if (!isNaN(rev)) totalRevenue += rev;
            }
            if (app.business.sector) {
                sectors.add(app.business.sector);
            }
        }

        return successResponse({
            totalObservation,
            totalRevisit,
            averageRevenue: apps.length > 0 ? totalRevenue / apps.length : 0,
            uniqueSectors: sectors.size,
        });
    } catch (error) {
        console.error("Error fetching observation stats:", error);
        return errorResponse("Failed to fetch observation statistics");
    }
}

/**
 * Get all observation-only applications for admin dashboard
 * These are Kenya-registered applicants with revenue < 500k KES
 */
export async function getObservationApplications(filter?: "all" | "revisit"): Promise<ActionResponse<ObservationApplication[]>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("Unauthorized");
        }

        const whereCondition = filter === "revisit"
            ? and(eq(applications.isObservationOnly, true), eq(applications.markedForRevisit, true))
            : eq(applications.isObservationOnly, true);

        const observationApps = await db.query.applications.findMany({
            where: whereCondition,
            orderBy: [desc(applications.submittedAt)],
            with: {
                business: {
                    with: {
                        applicant: true,
                    },
                },
            },
        });

        const mapped: ObservationApplication[] = observationApps.map((app) => ({
            id: app.id,
            status: app.status,
            track: app.track,
            submittedAt: app.submittedAt?.toISOString() ?? null,
            isObservationOnly: app.isObservationOnly,
            markedForRevisit: app.markedForRevisit,
            revisitMarkedAt: app.revisitMarkedAt?.toISOString() ?? null,
            business: {
                name: app.business.name,
                sector: app.business.sector,
                county: app.business.county,
                city: app.business.city,
                country: app.business.country,
                revenueLastYear: app.business.revenueLastYear,
                fullTimeEmployeesTotal: app.business.fullTimeEmployeesTotal,
                description: app.business.description,
            },
            applicant: {
                firstName: app.business.applicant.firstName,
                lastName: app.business.applicant.lastName,
                email: app.business.applicant.email,
                phoneNumber: app.business.applicant.phoneNumber,
                gender: app.business.applicant.gender,
            },
        }));

        return successResponse(mapped);
    } catch (error) {
        console.error("Error fetching observation applications:", error);
        return errorResponse("Failed to fetch observation applications");
    }
}

/**
 * Mark an observation application for revisit
 */
export async function markForRevisit(applicationId: number): Promise<ActionResponse<{ success: boolean }>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("Unauthorized");
        }

        // Verify the application exists and is observation-only
        const app = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId),
        });

        if (!app) {
            return errorResponse("Application not found");
        }

        if (!app.isObservationOnly) {
            return errorResponse("Only observation applications can be marked for revisit");
        }

        // Update the application
        await db.update(applications)
            .set({
                markedForRevisit: true,
                revisitMarkedAt: new Date(),
                revisitMarkedBy: session.user.id,
                updatedAt: new Date(),
            })
            .where(eq(applications.id, applicationId));

        revalidatePath("/admin/observation");
        revalidatePath("/admin/applications");

        return successResponse({ success: true });
    } catch (error) {
        console.error("Error marking application for revisit:", error);
        return errorResponse("Failed to mark application for revisit");
    }
}

/**
 * Remove revisit flag from an observation application
 */
export async function unmarkForRevisit(applicationId: number): Promise<ActionResponse<{ success: boolean }>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("Unauthorized");
        }

        // Update the application
        await db.update(applications)
            .set({
                markedForRevisit: false,
                revisitMarkedAt: null,
                revisitMarkedBy: null,
                updatedAt: new Date(),
            })
            .where(eq(applications.id, applicationId));

        revalidatePath("/admin/observation");
        revalidatePath("/admin/applications");

        return successResponse({ success: true });
    } catch (error) {
        console.error("Error unmarking application for revisit:", error);
        return errorResponse("Failed to unmark application for revisit");
    }
}
