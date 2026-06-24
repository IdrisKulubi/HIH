import db from "@/db/drizzle";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    type A2fEnterpriseTrack,
    inferMatchingGrantTrackFromRevenue,
} from "@/lib/a2f-constants";

export function formatTrackLabel(track: A2fEnterpriseTrack): string {
    return track === "acceleration" ? "Accelerator" : "Foundation";
}

export function formatRevenueTrackMismatchError(annualRevenue: number): string {
    return `Verified annual revenue (KES ${annualRevenue.toLocaleString("en-KE")}) is outside both Foundation (500k–3M) and Accelerator (>3M) ranges. Update verified revenue before screening.`;
}

export async function syncApplicationTrackForRevenue(
    applicationId: number,
    annualRevenue: number
): Promise<{ track: A2fEnterpriseTrack; adjusted: boolean } | null> {
    const inferred = inferMatchingGrantTrackFromRevenue(annualRevenue);
    if (!inferred) return null;

    const app = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
        columns: { track: true },
    });
    if (!app?.track) {
        return { track: inferred, adjusted: false };
    }

    const currentTrack = app.track as A2fEnterpriseTrack;
    if (currentTrack === inferred) {
        return { track: inferred, adjusted: false };
    }

    await db
        .update(applications)
        .set({ track: inferred, updatedAt: new Date() })
        .where(eq(applications.id, applicationId));

    return { track: inferred, adjusted: true };
}
