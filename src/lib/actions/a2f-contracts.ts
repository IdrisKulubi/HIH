"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    grantAgreements,
    a2fPipeline,
    applications,
    businesses,
    applicants,
    users,
} from "../../../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advancePipelineStatus } from "./a2f-pipeline";
import { sendEmail } from "@/lib/email";
import { ActionResponse, successResponse, errorResponse } from "./types";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type A2fAgreementType = 'matching' | 'repayable' | 'working_capital';

export interface GrantAgreementInput {
    agreementType: A2fAgreementType;
    totalProjectAmount: number;
    hihContribution: number;
    /** Required for Matching grants — enterprise co-contribution */
    enterpriseContribution?: number;
    /** Defaults: 24 months for Repayable */
    termMonths?: number;
    /** Defaults: 6.0% for Repayable */
    interestRate?: number;
    /** Defaults: 3 months for Repayable */
    gracePeriodMonths?: number;
}

export interface ContractTemplateVariables {
    enterpriseName: string;
    applicantName: string;
    applicantEmail: string;
    county: string;
    agreementType: string;
    totalProjectAmount: string;
    hihContribution: string;
    enterpriseContribution: string;
    termMonths: number;
    interestRate: number;
    gracePeriodMonths: number;
    repaymentStartDate: string;
    firstRepaymentDue: string;
}

const A2F_ROLES = ['admin', 'a2f_officer'] as const;

// Default repayable grant terms (from spec)
const REPAYABLE_DEFAULTS = {
    termMonths: 24,
    interestRate: 6.0,
    gracePeriodMonths: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Grant agreement for a pipeline entry
// ─────────────────────────────────────────────────────────────────────────────

export async function getGrantAgreement(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.a2fId, a2fId),
            with: { transactions: true },
        });

        return { success: true, data: agreement ?? null };
    } catch (error) {
        console.error("Error fetching grant agreement:", error);
        return { success: false, message: "Failed to load grant agreement" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / action_generateContract
// Fetches enterprise data, injects dynamic variables into template,
// persists the agreement record, and returns the secure URL.
// ─────────────────────────────────────────────────────────────────────────────

export async function action_generateContract(
    a2fId: number,
    input: GrantAgreementInput
): Promise<ActionResponse<{ agreementId: number; templateVars: ContractTemplateVariables }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        // Validate amounts
        if (input.totalProjectAmount <= 0) return errorResponse("Total project amount must be greater than zero");
        if (input.hihContribution <= 0) return errorResponse("HiH contribution must be greater than zero");
        if (input.hihContribution > input.totalProjectAmount) {
            return errorResponse("HiH contribution cannot exceed total project amount");
        }
        if (input.agreementType === 'matching') {
            if (!input.enterpriseContribution || input.enterpriseContribution <= 0) {
                return errorResponse("Enterprise co-contribution is required for Matching Grants");
            }
            const totalCheck = input.hihContribution + input.enterpriseContribution;
            if (Math.abs(totalCheck - input.totalProjectAmount) > 1) {
                return errorResponse(
                    `HiH (${input.hihContribution}) + Enterprise (${input.enterpriseContribution}) must equal Total (${input.totalProjectAmount})`
                );
            }
        }

        // Prevent duplicate agreement
        const existingAgreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.a2fId, a2fId),
        });
        if (existingAgreement) {
            return errorResponse("A grant agreement already exists for this pipeline entry. Use update instead.");
        }

        // Fetch pipeline + application tree for template variables
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });
        if (!pipeline) return errorResponse("Pipeline entry not found");

        const application = await db.query.applications.findFirst({
            where: eq(applications.id, pipeline.applicationId),
            with: { business: { with: { applicant: true } } },
        });
        if (!application) return errorResponse("Application not found");

        // Apply defaults for Repayable grants
        const termMonths = input.termMonths ?? (input.agreementType === 'repayable' ? REPAYABLE_DEFAULTS.termMonths : 0);
        const interestRate = input.interestRate ?? (input.agreementType === 'repayable' ? REPAYABLE_DEFAULTS.interestRate : 0);
        const gracePeriodMonths = input.gracePeriodMonths ?? (input.agreementType === 'repayable' ? REPAYABLE_DEFAULTS.gracePeriodMonths : 0);

        // Calculate repayment start date (today + grace period)
        const repaymentStart = new Date();
        repaymentStart.setMonth(repaymentStart.getMonth() + gracePeriodMonths + 1);
        const firstRepaymentDue = new Date(repaymentStart);
        firstRepaymentDue.setDate(15); // Repayments due on the 15th per spec

        const biz = application.business;
        const templateVars: ContractTemplateVariables = {
            enterpriseName: biz.name,
            applicantName: `${biz.applicant.firstName} ${biz.applicant.lastName}`.trim(),
            applicantEmail: biz.applicant.email,
            county: biz.county ?? biz.city,
            agreementType: input.agreementType === 'matching'
                ? 'Matching Grant Agreement'
                : input.agreementType === 'repayable'
                    ? 'Repayable Grant Agreement'
                    : 'Working Capital Agreement',
            totalProjectAmount: formatCurrency(input.totalProjectAmount),
            hihContribution: formatCurrency(input.hihContribution),
            enterpriseContribution: formatCurrency(input.enterpriseContribution ?? 0),
            termMonths,
            interestRate,
            gracePeriodMonths,
            repaymentStartDate: formatDate(repaymentStart),
            firstRepaymentDue: formatDate(firstRepaymentDue),
        };

        // Persist agreement record
        const [agreement] = await db
            .insert(grantAgreements)
            .values({
                a2fId,
                agreementType: input.agreementType,
                totalProjectAmount: String(input.totalProjectAmount),
                hihContribution: String(input.hihContribution),
                enterpriseContribution: String(input.enterpriseContribution ?? 0),
                termMonths,
                interestRate: String(interestRate),
                gracePeriodMonths,
                isFullyExecuted: false,
            })
            .returning({ id: grantAgreements.id });

        // Advance pipeline to Contracting stage
        if (pipeline.status === 'offer_issued') {
            await advancePipelineStatus(a2fId, 'contracting');
        }

        revalidatePath(`/admin/a2f/${a2fId}`);
        revalidatePath('/admin/a2f');

        return successResponse(
            { agreementId: agreement.id, templateVars },
            "Grant agreement created. Template variables ready for document generation."
        );
    } catch (error) {
        console.error("Error generating contract:", error);
        return errorResponse("Failed to generate contract");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND OFFER LETTER
// Saves offer letter URL and triggers Resend email to the applicant.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOfferLetter(
    agreementId: number,
    offerLetterUrl: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.id, agreementId),
        });
        if (!agreement) return errorResponse("Grant agreement not found");

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, agreement.a2fId),
        });
        if (!pipeline) return errorResponse("Pipeline entry not found");

        const application = await db.query.applications.findFirst({
            where: eq(applications.id, pipeline.applicationId),
            with: { business: { with: { applicant: true } } },
        });
        if (!application) return errorResponse("Application not found");

        // Persist offer letter URL + timestamp
        await db
            .update(grantAgreements)
            .set({ offerLetterUrl, offerSentAt: new Date(), updatedAt: new Date() })
            .where(eq(grantAgreements.id, agreementId));

        const biz = application.business;
        const applicantName = `${biz.applicant.firstName} ${biz.applicant.lastName}`.trim();

        // Send Resend email with offer letter link
        await sendEmail({
            to: biz.applicant.email,
            subject: `Your ${agreement.agreementType === 'repayable' ? 'Repayable' : 'Matching'} Grant Offer Letter — BIRE Programme`,
            react: React.createElement(OfferLetterEmailTemplate, {
                applicantName,
                enterpriseName: biz.name,
                agreementType: agreement.agreementType,
                offerLetterUrl,
                hihContribution: agreement.hihContribution,
            }),
        });

        revalidatePath(`/admin/a2f/${agreement.a2fId}`);

        return successResponse(undefined, `Offer letter sent to ${biz.applicant.email}`);
    } catch (error) {
        console.error("Error sending offer letter:", error);
        return errorResponse("Failed to send offer letter");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD: Applicant uploads signed contract
// ─────────────────────────────────────────────────────────────────────────────

export async function recordSignedContract(
    agreementId: number,
    signedDocumentUrl: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user) return errorResponse("Unauthorized");

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.id, agreementId),
        });
        if (!agreement) return errorResponse("Grant agreement not found");

        await db
            .update(grantAgreements)
            .set({
                signedDocumentUrl,
                signedAt: new Date(),
                isFullyExecuted: true,
                updatedAt: new Date(),
            })
            .where(eq(grantAgreements.id, agreementId));

        // Advance pipeline to Disbursement Active after contract is signed
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, agreement.a2fId),
        });

        if (pipeline?.status === 'contracting') {
            await advancePipelineStatus(agreement.a2fId, 'disbursement_active');
        }

        revalidatePath(`/admin/a2f/${agreement.a2fId}`);
        // Revalidate applicant-facing "Offers & Contracts" tab
        revalidatePath('/profile/contracts');

        return successResponse(undefined, "Signed contract recorded. Pipeline advanced to Disbursement.");
    } catch (error) {
        console.error("Error recording signed contract:", error);
        return errorResponse("Failed to record signed contract");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Contracts for an applicant (Offers & Contracts tab)
// ─────────────────────────────────────────────────────────────────────────────

export async function getApplicantContracts() {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, message: "Unauthorized" };

        // Find the user's application
        const userApps = await db.query.applications.findMany({
            where: eq(applications.userId, session.user.id),
        });
        if (!userApps.length) return { success: true, data: [] };

        const appIds = userApps.map(a => a.id);

        // Find pipeline entries for their applications
        const pipelines = await db.query.a2fPipeline.findMany({
            where: eq(a2fPipeline.applicationId, appIds[0]),
        });

        if (!pipelines.length) return { success: true, data: [] };

        const contracts = [];
        for (const pipeline of pipelines) {
            const agreement = await db.query.grantAgreements.findFirst({
                where: eq(grantAgreements.a2fId, pipeline.id),
            });
            if (agreement) {
                contracts.push({
                    ...agreement,
                    pipelineStatus: pipeline.status,
                    instrumentType: pipeline.instrumentType,
                });
            }
        }

        return { success: true, data: contracts };
    } catch (error) {
        console.error("Error fetching applicant contracts:", error);
        return { success: false, message: "Failed to load contracts" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE (inline — no separate file needed for offer letter)
// ─────────────────────────────────────────────────────────────────────────────

interface OfferLetterEmailProps {
    applicantName: string;
    enterpriseName: string;
    agreementType: string;
    offerLetterUrl: string;
    hihContribution: string;
}

function OfferLetterEmailTemplate({
    applicantName,
    enterpriseName,
    agreementType,
    offerLetterUrl,
    hihContribution,
}: OfferLetterEmailProps) {
    return React.createElement(
        'div',
        { style: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' } },
        React.createElement('h2', { style: { color: '#1a5c2a' } }, 'Your Grant Offer Letter is Ready'),
        React.createElement(
            'p',
            null,
            `Dear ${applicantName},`
        ),
        React.createElement(
            'p',
            null,
            `We are pleased to inform you that Hand-in-Hand (HiH) has issued a `,
            React.createElement('strong', null, `${agreementType === 'repayable' ? 'Repayable' : agreementType === 'matching' ? 'Matching' : 'Working Capital'} Grant Offer`),
            ` for your enterprise, `,
            React.createElement('strong', null, enterpriseName),
            `.`
        ),
        React.createElement(
            'p',
            null,
            `Approved HiH Contribution: `,
            React.createElement('strong', null, `KES ${hihContribution}`)
        ),
        React.createElement(
            'p',
            null,
            'Please download, review, sign, and re-upload your signed offer letter via your applicant portal within 14 days.'
        ),
        React.createElement(
            'a',
            {
                href: offerLetterUrl,
                style: {
                    display: 'inline-block',
                    backgroundColor: '#1a5c2a',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    marginTop: '16px',
                },
            },
            'Download Offer Letter'
        ),
        React.createElement('hr', { style: { margin: '24px 0', borderColor: '#eee' } }),
        React.createElement(
            'p',
            { style: { fontSize: '12px', color: '#666' } },
            'This email was sent by the BIRE Programme. If you have questions, please contact your A2F Officer.'
        )
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', { style: 'decimal', maximumFractionDigits: 2 }).format(amount);
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
}
