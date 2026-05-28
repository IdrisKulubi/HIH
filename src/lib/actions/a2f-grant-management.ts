"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fGrantMilestones,
    a2fMatchingGrantApplications,
    a2fPipeline,
    a2fProcurementItems,
    grantAgreements,
} from "../../../db/schema";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActionResponse, errorResponse, successResponse } from "./types";

import { A2F_READ_ROLES, A2F_STAFF_ROLES } from "@/lib/a2f-access";

const A2F_ROLES = A2F_STAFF_ROLES;

export type ProcurementStatus = "planned" | "quotes_requested" | "supplier_selected" | "ordered" | "delivered" | "verified" | "cancelled";
export type GrantMilestoneStatus = "planned" | "in_progress" | "submitted_for_verification" | "verified" | "delayed" | "blocked";

export interface ProcurementItemInput {
    id?: number;
    itemName: string;
    description?: string;
    category?: string;
    supplierName?: string;
    selectedQuoteAmount?: number;
    bireContributionAmount?: number;
    enterpriseContributionAmount?: number;
    procurementStatus?: ProcurementStatus;
    quoteDocuments?: Array<Record<string, unknown>>;
    purchaseOrderUrl?: string;
    invoiceUrl?: string;
    deliveryNoteUrl?: string;
    verificationDocumentUrl?: string;
    notes?: string;
}

export interface GrantMilestoneInput {
    id?: number;
    milestoneName: string;
    description?: string;
    trancheLabel?: string;
    plannedCompletionDate?: string;
    actualCompletionDate?: string;
    verificationMethod?: string;
    evidenceUrl?: string;
    status?: GrantMilestoneStatus;
    issues?: string;
    correctiveActions?: string;
}

export async function getGrantManagementWorkspace(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !A2F_READ_ROLES.includes(session.user.role as typeof A2F_READ_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const [pipeline, agreement, procurementItems, milestones] = await Promise.all([
            db.query.a2fPipeline.findFirst({
                where: eq(a2fPipeline.id, a2fId),
                with: {
                    application: { with: { business: true } },
                    investmentAppraisals: true,
                },
            }),
            db.query.grantAgreements.findFirst({
                where: eq(grantAgreements.a2fId, a2fId),
                orderBy: [desc(grantAgreements.createdAt)],
            }),
            db.query.a2fProcurementItems.findMany({
                where: eq(a2fProcurementItems.a2fId, a2fId),
                orderBy: [desc(a2fProcurementItems.createdAt)],
            }),
            db.query.a2fGrantMilestones.findMany({
                where: eq(a2fGrantMilestones.a2fId, a2fId),
                orderBy: [desc(a2fGrantMilestones.createdAt)],
            }),
        ]);

        if (!pipeline) return errorResponse("A2F pipeline entry not found");

        return successResponse({
            pipeline,
            agreement: agreement ?? null,
            procurementItems,
            milestones,
        });
    } catch (error) {
        console.error("Error loading grant management workspace:", error);
        return errorResponse("Failed to load grant management workspace");
    }
}

export async function seedGrantManagementFromApplication(a2fId: number): Promise<ActionResponse<{ procurementCreated: number; milestonesCreated: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const application = await db.query.a2fMatchingGrantApplications.findFirst({
            where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
        });
        if (!application) return errorResponse("Matching Grant application not found");

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.a2fId, a2fId),
            orderBy: [desc(grantAgreements.createdAt)],
        });

        const existingProcurement = await db.query.a2fProcurementItems.findMany({
            where: eq(a2fProcurementItems.a2fId, a2fId),
        });
        const existingMilestones = await db.query.a2fGrantMilestones.findMany({
            where: eq(a2fGrantMilestones.a2fId, a2fId),
        });

        const budgetItems = asRecordArray(application.budgetItems);
        const implementationMilestones = asRecordArray(application.implementationMilestones);

        let procurementCreated = 0;
        if (!existingProcurement.length && budgetItems.length) {
            await db.insert(a2fProcurementItems).values(budgetItems.map((item) => ({
                a2fId,
                agreementId: agreement?.id ?? null,
                itemName: text(item.item ?? item.description ?? item.name) || "Procurement item",
                description: text(item.description ?? item.justification) || null,
                category: text(item.category) || "productive_equipment",
                supplierName: text(item.supplier) || null,
                selectedQuoteAmount: String(numberValue(item.amount)),
                bireContributionAmount: String(numberValue(item.bireContribution ?? item.bireAmount)),
                enterpriseContributionAmount: String(numberValue(item.enterpriseContribution ?? item.enterpriseAmount)),
                procurementStatus: "planned",
                quoteDocuments: [],
                notes: text(item.notes) || null,
                createdById: session.user.id,
            })));
            procurementCreated = budgetItems.length;
        }

        let milestonesCreated = 0;
        if (!existingMilestones.length && implementationMilestones.length) {
            await db.insert(a2fGrantMilestones).values(implementationMilestones.map((item) => ({
                a2fId,
                agreementId: agreement?.id ?? null,
                milestoneName: text(item.activity ?? item.milestoneName ?? item.output) || "Implementation milestone",
                description: text(item.description ?? item.output) || null,
                trancheLabel: text(item.tranche) || null,
                plannedCompletionDate: dateValue(item.completionDate ?? item.plannedCompletionDate),
                verificationMethod: text(item.verificationMethod) || null,
                status: "planned",
                createdById: session.user.id,
            })));
            milestonesCreated = implementationMilestones.length;
        }

        revalidateGrantManagement(a2fId);

        return successResponse(
            { procurementCreated, milestonesCreated },
            `Seeded ${procurementCreated} procurement item(s) and ${milestonesCreated} milestone(s).`
        );
    } catch (error) {
        console.error("Error seeding grant management:", error);
        return errorResponse("Failed to seed grant management records");
    }
}

export async function saveProcurementItem(a2fId: number, input: ProcurementItemInput): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }
        if (!input.itemName?.trim()) return errorResponse("Procurement item name is required");

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.a2fId, a2fId),
            orderBy: [desc(grantAgreements.createdAt)],
        });

        const values = {
            a2fId,
            agreementId: agreement?.id ?? null,
            itemName: input.itemName.trim(),
            description: input.description?.trim() || null,
            category: input.category || "productive_equipment",
            supplierName: input.supplierName?.trim() || null,
            selectedQuoteAmount: String(input.selectedQuoteAmount ?? 0),
            bireContributionAmount: String(input.bireContributionAmount ?? 0),
            enterpriseContributionAmount: String(input.enterpriseContributionAmount ?? 0),
            procurementStatus: input.procurementStatus ?? "planned",
            quoteDocuments: input.quoteDocuments ?? [],
            purchaseOrderUrl: input.purchaseOrderUrl?.trim() || null,
            invoiceUrl: input.invoiceUrl?.trim() || null,
            deliveryNoteUrl: input.deliveryNoteUrl?.trim() || null,
            verificationDocumentUrl: input.verificationDocumentUrl?.trim() || null,
            notes: input.notes?.trim() || null,
            createdById: session.user.id,
            updatedAt: new Date(),
        };

        let id: number;
        if (input.id) {
            await db
                .update(a2fProcurementItems)
                .set(values)
                .where(and(eq(a2fProcurementItems.id, input.id), eq(a2fProcurementItems.a2fId, a2fId)));
            id = input.id;
        } else {
            const [inserted] = await db
                .insert(a2fProcurementItems)
                .values(values)
                .returning({ id: a2fProcurementItems.id });
            id = inserted.id;
        }

        revalidateGrantManagement(a2fId);
        return successResponse({ id }, "Procurement item saved");
    } catch (error) {
        console.error("Error saving procurement item:", error);
        return errorResponse("Failed to save procurement item");
    }
}

export async function saveGrantMilestone(a2fId: number, input: GrantMilestoneInput): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }
        if (!input.milestoneName?.trim()) return errorResponse("Milestone name is required");

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.a2fId, a2fId),
            orderBy: [desc(grantAgreements.createdAt)],
        });
        const status = input.status ?? "planned";
        const shouldMarkVerified = status === "verified";

        const values = {
            a2fId,
            agreementId: agreement?.id ?? null,
            milestoneName: input.milestoneName.trim(),
            description: input.description?.trim() || null,
            trancheLabel: input.trancheLabel?.trim() || null,
            plannedCompletionDate: dateValue(input.plannedCompletionDate),
            actualCompletionDate: dateValue(input.actualCompletionDate),
            verificationMethod: input.verificationMethod?.trim() || null,
            evidenceUrl: input.evidenceUrl?.trim() || null,
            status,
            issues: input.issues?.trim() || null,
            correctiveActions: input.correctiveActions?.trim() || null,
            verifiedById: shouldMarkVerified ? session.user.id : null,
            verifiedAt: shouldMarkVerified ? new Date() : null,
            createdById: session.user.id,
            updatedAt: new Date(),
        };

        let id: number;
        if (input.id) {
            await db
                .update(a2fGrantMilestones)
                .set(values)
                .where(and(eq(a2fGrantMilestones.id, input.id), eq(a2fGrantMilestones.a2fId, a2fId)));
            id = input.id;
        } else {
            const [inserted] = await db
                .insert(a2fGrantMilestones)
                .values(values)
                .returning({ id: a2fGrantMilestones.id });
            id = inserted.id;
        }

        revalidateGrantManagement(a2fId);
        return successResponse({ id }, "Grant milestone saved");
    } catch (error) {
        console.error("Error saving grant milestone:", error);
        return errorResponse("Failed to save grant milestone");
    }
}

function revalidateGrantManagement(a2fId: number) {
    revalidatePath(`/a2f/${a2fId}`);
    revalidatePath(`/a2f/${a2fId}/grant-management`);
    revalidatePath(`/a2f/${a2fId}/disbursements`);
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
        : [];
}

function text(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function numberValue(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown): string | null {
    const clean = text(value);
    if (!clean) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parsed = new Date(clean);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}
