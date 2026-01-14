"use server";

import { z } from "zod";
import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    dueDiligenceRecords,
    dueDiligenceItems,
    applications
} from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Types derived from schema
export type DueDiligencePhase = 'phase1' | 'phase2';

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function getDueDiligence(applicationId: number) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        // Fetch or create record
        let record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId),
            with: {
                items: true,
                reviewer: true,
            }
        });

        // Initialize if not exists
        if (!record) {
            const [newRecord] = await db.insert(dueDiligenceRecords)
                .values({
                    applicationId,
                    reviewerId: session.user.id,
                })
                .returning();

            // Return structure matching the query result (items empty)
            return {
                success: true,
                data: {
                    ...newRecord,
                    items: [],
                    reviewer: null // Initial creator is reviewer, but fetching relation might be null immediately if not refreshed, roughly ok
                }
            };
        }

        return { success: true, data: record };
    } catch (error) {
        console.error("Error fetching due diligence:", error);
        return { success: false, message: "Failed to load due diligence data" };
    }
}

// -----------------------------------------------------------------------------
// UPSERT ITEM
// -----------------------------------------------------------------------------

export async function saveDueDiligenceItem(
    applicationId: number,
    phase: DueDiligencePhase,
    category: string,
    criterion: string,
    score: number,
    comments?: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        // Ensure record exists
        let record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) {
            [record] = await db.insert(dueDiligenceRecords)
                .values({
                    applicationId,
                    reviewerId: session.user.id,
                })
                .returning();
        }

        // Upsert item
        const existingItem = await db.query.dueDiligenceItems.findFirst({
            where: and(
                eq(dueDiligenceItems.recordId, record.id),
                eq(dueDiligenceItems.phase, phase),
                eq(dueDiligenceItems.criterion, criterion)
            )
        });

        if (existingItem) {
            await db.update(dueDiligenceItems)
                .set({ score, comments })
                .where(eq(dueDiligenceItems.id, existingItem.id));
        } else {
            await db.insert(dueDiligenceItems)
                .values({
                    recordId: record.id,
                    phase,
                    category,
                    criterion,
                    score,
                    comments
                });
        }

        // Recalculate Total Score for the Phase
        const allItems = await db.query.dueDiligenceItems.findMany({
            where: and(
                eq(dueDiligenceItems.recordId, record.id),
                eq(dueDiligenceItems.phase, phase)
            )
        });

        const totalScore = allItems.reduce((sum, item) => sum + (item.score || 0), 0);

        // Update Record Phase Score
        if (phase === 'phase1') {
            await db.update(dueDiligenceRecords)
                .set({
                    phase1Score: totalScore,
                    phase1Status: 'in_progress',
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    phase2Score: totalScore,
                    phase2Status: 'in_progress',
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        }

        revalidatePath(`/admin/applications/${applicationId}`);
        return { success: true, message: "Saved" };

    } catch (error) {
        console.error("Error saving due diligence item:", error);
        return { success: false, message: "Failed to save" };
    }
}

// -----------------------------------------------------------------------------
// UPDATE STATUS / COMPLETE PHASE
// -----------------------------------------------------------------------------

export async function updateDueDiligenceStatus(
    applicationId: number,
    phase: DueDiligencePhase,
    status: string,
    notes?: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) return { success: false, message: "Record not found" };

        if (phase === 'phase1') {
            await db.update(dueDiligenceRecords)
                .set({
                    phase1Status: status,
                    phase1Notes: notes ?? record.phase1Notes,
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    phase2Status: status,
                    phase2Notes: notes ?? record.phase2Notes,
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        }

        revalidatePath(`/admin/applications/${applicationId}`);
        return { success: true, message: "Status updated" };

    } catch (error) {
        console.error("Error updating status:", error);
        return { success: false, message: "Failed to update status" };
    }
}

// -----------------------------------------------------------------------------
// FINAL DECISION
// -----------------------------------------------------------------------------

export async function saveDueDiligenceFinalDecision(
    applicationId: number,
    verdict: 'pass' | 'fail',
    reason: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        if (!reason || reason.trim().length < 10) {
            return { success: false, message: "Please provide a detailed reason (at least 10 characters)." };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) return { success: false, message: "Due diligence record not found" };

        await db.update(dueDiligenceRecords)
            .set({
                finalVerdict: verdict,
                finalReason: reason,
                updatedAt: new Date()
            })
            .where(eq(dueDiligenceRecords.id, record.id));

        revalidatePath(`/admin/applications/${applicationId}`);
        revalidatePath(`/admin/applications/${applicationId}/due-diligence`);

        return { success: true, message: `Final decision (${verdict.toUpperCase()}) saved successfully.` };

    } catch (error) {
        console.error("Error saving final decision:", error);
        return { success: false, message: "Failed to save final decision" };
    }
}
