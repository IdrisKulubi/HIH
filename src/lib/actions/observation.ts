"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { ActionResponse, successResponse, errorResponse } from "./types";

export interface ObservationApplication {
    id: number;
    status: string;
    track: string | null;
    submittedAt: string | null;
    isObservationOnly: boolean;
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

/**
 * Get all observation-only applications for admin dashboard
 * These are Kenya-registered applicants with revenue < 500k KES
 */
export async function getObservationApplications(): Promise<ActionResponse<ObservationApplication[]>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return errorResponse("Unauthorized");
        }

        const observationApps = await db.query.applications.findMany({
            where: eq(applications.isObservationOnly, true),
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
