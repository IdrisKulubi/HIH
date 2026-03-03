"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fPipeline,
    a2fDueDiligenceReports,
    a2fScoring,
    grantAgreements,
    disbursementsAndRepayments,
    applications,
    businesses,
    applicants,
    userProfiles,
} from "../../../db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActionResponse, successResponse, errorResponse } from "./types";
import {
    type A2fPipelineStatus,
    type A2fInstrumentType,
    PIPELINE_STAGE_ORDER,
} from "@/lib/a2f-constants";

// Re-export types only (no runtime value — safe in "use server" files)
export type { A2fPipelineStatus, A2fInstrumentType };

const A2F_ROLES = ['admin', 'a2f_officer'] as const;
const A2F_READ_ROLES = ['admin', 'a2f_officer', 'oversight'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET: Pipeline list (dashboard view)
// ─────────────────────────────────────────────────────────────────────────────

export interface A2fPipelineListItem {
    id: number;
    applicationId: number;
    businessName: string;
    applicantName: string;
    applicantEmail: string;
    county: string | null;
    sector: string | null;
    instrumentType: string;
    requestedAmount: string;
    status: string;
    officerName: string | null;
    ddReportsCount: number;
    hasGrantAgreement: boolean;
    totalDisbursed: number;
    createdAt: string;
    updatedAt: string;
}

export async function getA2fPipelineList(): Promise<ActionResponse<A2fPipelineListItem[]>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_READ_ROLES.includes(session.user.role as typeof A2F_READ_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const entries = await db
            .select({
                id: a2fPipeline.id,
                applicationId: a2fPipeline.applicationId,
                instrumentType: a2fPipeline.instrumentType,
                requestedAmount: a2fPipeline.requestedAmount,
                status: a2fPipeline.status,
                officerId: a2fPipeline.a2fOfficerId,
                createdAt: a2fPipeline.createdAt,
                updatedAt: a2fPipeline.updatedAt,
                businessName: businesses.name,
                county: businesses.county,
                sector: businesses.sector,
                applicantFirstName: applicants.firstName,
                applicantLastName: applicants.lastName,
                applicantEmail: applicants.email,
            })
            .from(a2fPipeline)
            .innerJoin(applications, eq(applications.id, a2fPipeline.applicationId))
            .innerJoin(businesses, eq(businesses.id, applications.businessId))
            .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
            .orderBy(desc(a2fPipeline.updatedAt));

        if (!entries.length) return successResponse([]);

        // Batch-fetch officer names
        const officerIds = [...new Set(entries.map(e => e.officerId).filter(Boolean))] as string[];
        const officerMap = new Map<string, string>();

        if (officerIds.length) {
            const officers = await db
                .select({
                    userId: userProfiles.userId,
                    name: sql<string>`CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName})`,
                })
                .from(userProfiles)
                .where(inArray(userProfiles.userId, officerIds));

            officers.forEach(o => officerMap.set(o.userId, o.name));
        }

        // Batch-fetch DD report counts
        const pipelineIds = entries.map(e => e.id);
        const ddCounts = await db
            .select({
                a2fId: a2fDueDiligenceReports.a2fId,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(a2fDueDiligenceReports)
            .where(inArray(a2fDueDiligenceReports.a2fId, pipelineIds))
            .groupBy(a2fDueDiligenceReports.a2fId);
        const ddCountMap = new Map(ddCounts.map(d => [d.a2fId, d.count]));

        // Batch-fetch grant agreements existence
        const agreements = await db
            .select({ a2fId: grantAgreements.a2fId })
            .from(grantAgreements)
            .where(inArray(grantAgreements.a2fId, pipelineIds));
        const agreementSet = new Set(agreements.map(a => a.a2fId));

        // Batch-fetch total disbursed per pipeline
        const disbursements = await db
            .select({
                a2fId: grantAgreements.a2fId,
                total: sql<number>`COALESCE(SUM(${disbursementsAndRepayments.amount}), 0)::float`,
            })
            .from(disbursementsAndRepayments)
            .innerJoin(grantAgreements, eq(grantAgreements.id, disbursementsAndRepayments.agreementId))
            .where(
                and(
                    inArray(grantAgreements.a2fId, pipelineIds),
                    eq(disbursementsAndRepayments.transactionType, 'disbursement'),
                    eq(disbursementsAndRepayments.status, 'verified')
                )
            )
            .groupBy(grantAgreements.a2fId);
        const disbursedMap = new Map(disbursements.map(d => [d.a2fId, d.total]));

        const result: A2fPipelineListItem[] = entries.map(e => ({
            id: e.id,
            applicationId: e.applicationId,
            businessName: e.businessName,
            applicantName: `${e.applicantFirstName} ${e.applicantLastName}`.trim(),
            applicantEmail: e.applicantEmail,
            county: e.county,
            sector: e.sector,
            instrumentType: e.instrumentType,
            requestedAmount: e.requestedAmount,
            status: e.status,
            officerName: e.officerId ? (officerMap.get(e.officerId) ?? null) : null,
            ddReportsCount: ddCountMap.get(e.id) ?? 0,
            hasGrantAgreement: agreementSet.has(e.id),
            totalDisbursed: disbursedMap.get(e.id) ?? 0,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        }));

        return successResponse(result);
    } catch (error) {
        console.error("Error fetching A2F pipeline list:", error);
        return errorResponse("Failed to load A2F pipeline");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Single pipeline entry (full detail)
// ─────────────────────────────────────────────────────────────────────────────

export async function getA2fPipelineEntry(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !A2F_READ_ROLES.includes(session.user.role as typeof A2F_READ_ROLES[number])) {
            return { success: false, message: "Unauthorized" };
        }

        const entry = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: {
                        business: {
                            with: { applicant: true },
                        },
                    },
                },
                a2fOfficer: { with: { userProfile: true } },
                dueDiligenceReports: { orderBy: [desc(a2fDueDiligenceReports.createdAt)] },
                scoringRecords: { orderBy: [desc(a2fScoring.createdAt)] },
                grantAgreements: {
                    with: { transactions: { orderBy: [desc(disbursementsAndRepayments.transactionDate)] } },
                },
                investmentAppraisals: true,
            },
        });

        if (!entry) return { success: false, message: "Pipeline entry not found" };

        return { success: true, data: entry };
    } catch (error) {
        console.error("Error fetching A2F pipeline entry:", error);
        return { success: false, message: "Failed to load pipeline entry" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE: New pipeline entry from a DD-qualified application
// ─────────────────────────────────────────────────────────────────────────────

interface CreateA2fEntryInput {
    applicationId: number;
    instrumentType: A2fInstrumentType;
    requestedAmount: number;
    notes?: string;
}

export async function createA2fPipelineEntry(
    input: CreateA2fEntryInput
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        if (input.requestedAmount <= 0) {
            return errorResponse("Requested amount must be greater than zero");
        }

        // Prevent duplicate entries for same application
        const existing = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.applicationId, input.applicationId),
        });

        if (existing) {
            return errorResponse("An A2F pipeline entry already exists for this application");
        }

        const [entry] = await db
            .insert(a2fPipeline)
            .values({
                applicationId: input.applicationId,
                instrumentType: input.instrumentType,
                requestedAmount: String(input.requestedAmount),
                status: 'a2f_pipeline',
                a2fOfficerId: session.user.id,
                notes: input.notes ?? null,
            })
            .returning({ id: a2fPipeline.id });

        revalidatePath('/admin/a2f');
        revalidatePath(`/admin/applications/${input.applicationId}`);

        return successResponse({ id: entry.id }, "A2F pipeline entry created successfully");
    } catch (error) {
        console.error("Error creating A2F pipeline entry:", error);
        return errorResponse("Failed to create pipeline entry");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Advance pipeline status
// ─────────────────────────────────────────────────────────────────────────────

export async function advancePipelineStatus(
    a2fId: number,
    newStatus: A2fPipelineStatus
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const entry = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });

        if (!entry) return errorResponse("Pipeline entry not found");

        const currentIdx = PIPELINE_STAGE_ORDER.indexOf(entry.status as A2fPipelineStatus);
        const newIdx = PIPELINE_STAGE_ORDER.indexOf(newStatus);

        // Enforce forward-only progression (allow same stage for idempotency)
        if (newIdx < currentIdx) {
            return errorResponse(`Cannot regress pipeline from '${entry.status}' to '${newStatus}'`);
        }

        await db
            .update(a2fPipeline)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(a2fPipeline.id, a2fId));

        revalidatePath('/admin/a2f');
        revalidatePath(`/admin/a2f/${a2fId}`);

        return successResponse(undefined, `Pipeline advanced to '${newStatus}'`);
    } catch (error) {
        console.error("Error advancing pipeline status:", error);
        return errorResponse("Failed to update pipeline status");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Assign A2F Officer
// ─────────────────────────────────────────────────────────────────────────────

export async function assignA2fOfficer(
    a2fId: number,
    officerId: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return errorResponse("Only admins can assign A2F officers");
        }

        await db
            .update(a2fPipeline)
            .set({ a2fOfficerId: officerId, updatedAt: new Date() })
            .where(eq(a2fPipeline.id, a2fId));

        revalidatePath('/admin/a2f');
        revalidatePath(`/admin/a2f/${a2fId}`);

        return successResponse(undefined, "A2F officer assigned");
    } catch (error) {
        console.error("Error assigning A2F officer:", error);
        return errorResponse("Failed to assign officer");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Edit instrument type or requested amount (before contracting)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateA2fPipelineDetails(
    a2fId: number,
    updates: { instrumentType?: A2fInstrumentType; requestedAmount?: number; notes?: string }
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const entry = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });

        if (!entry) return errorResponse("Pipeline entry not found");

        const lockedStages: A2fPipelineStatus[] = ['contracting', 'disbursement_active', 'post_ta_monitoring'];
        if (lockedStages.includes(entry.status as A2fPipelineStatus)) {
            return errorResponse("Cannot modify instrument type or amount after contracting has begun");
        }

        await db
            .update(a2fPipeline)
            .set({
                ...(updates.instrumentType && { instrumentType: updates.instrumentType }),
                ...(updates.requestedAmount && { requestedAmount: String(updates.requestedAmount) }),
                ...(updates.notes !== undefined && { notes: updates.notes }),
                updatedAt: new Date(),
            })
            .where(eq(a2fPipeline.id, a2fId));

        revalidatePath(`/admin/a2f/${a2fId}`);

        return successResponse(undefined, "Pipeline details updated");
    } catch (error) {
        console.error("Error updating pipeline details:", error);
        return errorResponse("Failed to update pipeline details");
    }
}
