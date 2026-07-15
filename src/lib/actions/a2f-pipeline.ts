"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fPipeline,
    a2fDueDiligenceReports,
    a2fScoring,
    a2fMatchingGrantApplications,
    a2fPreScreeningAttempts,
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
    type A2fEnterpriseTrack,
    type A2fPipelineStatus,
    type A2fInstrumentType,
    isMatchingGrantTrackEligible,
    PIPELINE_STAGE_ORDER,
} from "@/lib/a2f-constants";
import {
    A2F_STAFF_ROLES,
    assertA2fStaffRead,
    assertMatchingGrantApplicationSubmitted,
} from "@/lib/a2f-access";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";
import { syncPassedScreeningPipelineEntries } from "@/lib/server/a2f-pipeline-sync";
import {
    formatTrackLabel,
    syncApplicationTrackForRevenue,
} from "@/lib/server/a2f-track-sync";

// Re-export types only (no runtime value — safe in "use server" files)
export type { A2fPipelineStatus, A2fInstrumentType };

const A2F_ROLES = A2F_STAFF_ROLES;

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
    initialDdComplete: boolean;
    hasGrantAgreement: boolean;
    totalDisbursed: number;
    createdAt: string;
    updatedAt: string;
}

export async function getA2fPipelineList(): Promise<ActionResponse<A2fPipelineListItem[]>> {
    try {
        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
            return errorResponse("Unauthorized");
        }

        await syncPassedScreeningPipelineEntries();

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
            .where(eq(a2fPipeline.screeningRequired, false))
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
                initialCompleteCount: sql<number>`
                    COUNT(*) FILTER (
                        WHERE ${a2fDueDiligenceReports.stage} = 'initial'
                        AND ${a2fDueDiligenceReports.isComplete} = true
                    )::int
                `,
            })
            .from(a2fDueDiligenceReports)
            .where(inArray(a2fDueDiligenceReports.a2fId, pipelineIds))
            .groupBy(a2fDueDiligenceReports.a2fId);
        const ddCountMap = new Map(ddCounts.map(d => [d.a2fId, d.count]));
        const initialDdCompleteSet = new Set(
            ddCounts
                .filter(d => d.initialCompleteCount > 0)
                .map(d => d.a2fId)
        );

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
            initialDdComplete: initialDdCompleteSet.has(e.id),
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
        if (!Number.isInteger(a2fId) || a2fId <= 0) {
            return { success: false, message: "Invalid pipeline ID" };
        }

        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
            return { success: false, message: "Unauthorized" };
        }

        const entry = await db.query.a2fPipeline.findFirst({
            where: and(
                eq(a2fPipeline.id, a2fId),
                eq(a2fPipeline.screeningRequired, false)
            ),
            with: {
                application: {
                    with: {
                        business: {
                            with: { applicant: true },
                        },
                        kycProfile: true,
                    },
                },
                a2fOfficer: { with: { userProfile: true } },
                dueDiligenceReports: { orderBy: [desc(a2fDueDiligenceReports.createdAt)] },
                matchingGrantApplications: true,
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

        const passedScreening = await getEffectiveScreeningForApplication(input.applicationId);
        if (passedScreening?.outcome !== "pass") {
            return errorResponse(
                "This enterprise must pass Access to Finance pre-screening before it can enter the pipeline"
            );
        }
        const screeningAttempt = await db.query.a2fPreScreeningAttempts.findFirst({
            where: eq(a2fPreScreeningAttempts.id, passedScreening.attemptId),
            columns: { invitationStatus: true },
        });
        if (screeningAttempt?.invitationStatus !== "sent") {
            return errorResponse("Admin must send the A2F application invite before this enterprise can enter the pipeline");
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
                instrumentType: 'matching_grant',
                requestedAmount: String(input.requestedAmount),
                screeningRequired: false,
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

        if (newStatus !== "a2f_pipeline") {
            const submitted = await assertMatchingGrantApplicationSubmitted(a2fId);
            if (!submitted.ok) return errorResponse(submitted.error);
        }

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

function revalidateA2fEntryPaths(a2fId: number) {
    revalidatePath(`/a2f/${a2fId}`);
    revalidatePath(`/a2f/${a2fId}/scoring`);
    revalidatePath(`/a2f/${a2fId}/matching-grant`);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Enterprise track (revenue gate remediation)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateA2fEnterpriseTrack(
    a2fId: number,
    track: A2fEnterpriseTrack
): Promise<ActionResponse<{ track: A2fEnterpriseTrack }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: { with: { business: true } },
            },
        });

        if (!pipeline?.application) {
            return errorResponse("Pipeline entry or application not found");
        }

        const revenue = Number(pipeline.application.business?.revenueLastYear ?? 0);
        if (!isMatchingGrantTrackEligible(track, revenue)) {
            const trackLabel = track === "acceleration" ? "Accelerator" : "Foundation";
            return errorResponse(
                `Cannot assign ${trackLabel} track: verified revenue (KES ${revenue.toLocaleString("en-KE")}) does not meet this track's eligibility band.`
            );
        }

        await db
            .update(applications)
            .set({ track, updatedAt: new Date() })
            .where(eq(applications.id, pipeline.applicationId));

        revalidateA2fEntryPaths(a2fId);
        if (pipeline.applicationId) {
            revalidatePath(`/admin/applications/${pipeline.applicationId}`);
        }

        return successResponse(
            { track },
            `Enterprise track updated to ${track === "acceleration" ? "Accelerator" : "Foundation"}`
        );
    } catch (error) {
        console.error("Error updating A2F enterprise track:", error);
        return errorResponse("Failed to update enterprise track");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE: Verified annual revenue (scoring source of truth)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateA2fVerifiedRevenue(
    a2fId: number,
    revenueLastYear: number
): Promise<ActionResponse<{ revenueLastYear: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        if (!Number.isFinite(revenueLastYear) || revenueLastYear <= 0) {
            return errorResponse("Verified annual revenue must be greater than zero");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: { with: { business: true } },
            },
        });

        if (!pipeline?.application?.business) {
            return errorResponse("Pipeline entry or business record not found");
        }

        const businessId = pipeline.application.business.id;
        const revenueStr = String(revenueLastYear);

        await db
            .update(businesses)
            .set({ revenueLastYear: revenueStr, updatedAt: new Date() })
            .where(eq(businesses.id, businessId));

        const mgApp = await db.query.a2fMatchingGrantApplications.findFirst({
            where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
        });

        if (mgApp) {
            const financial = (mgApp.financialOverview ?? {}) as Record<string, unknown>;
            await db
                .update(a2fMatchingGrantApplications)
                .set({
                    financialOverview: {
                        ...financial,
                        annualRevenue2025: revenueLastYear,
                        revenueUsedForEligibility: revenueLastYear,
                    },
                    updatedAt: new Date(),
                })
                .where(eq(a2fMatchingGrantApplications.id, mgApp.id));
        }

        let message = "Verified annual revenue updated";
        if (pipeline.applicationId) {
            const trackSync = await syncApplicationTrackForRevenue(
                pipeline.applicationId,
                revenueLastYear
            );
            if (trackSync?.adjusted) {
                message = `Verified annual revenue updated. Enterprise track changed to ${formatTrackLabel(trackSync.track)} to match verified revenue.`;
            }
        }

        revalidateA2fEntryPaths(a2fId);
        if (pipeline.applicationId) {
            revalidatePath(`/admin/applications/${pipeline.applicationId}`);
            revalidatePath("/finance-screening");
        }

        return successResponse(
            { revenueLastYear },
            message
        );
    } catch (error) {
        console.error("Error updating A2F verified revenue:", error);
        return errorResponse("Failed to update verified revenue");
    }
}
