"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    disbursementsAndRepayments,
    grantAgreements,
    a2fPipeline,
    applications,
    businesses,
    applicants,
} from "../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { ActionResponse, successResponse, errorResponse } from "./types";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionType = 'disbursement' | 'repayment';
export type TransactionStatus = 'pending' | 'verified' | 'rejected';

export interface LogTransactionInput {
    transactionType: TransactionType;
    amount: number;
    transactionDate: Date;
    proofDocumentUrl?: string;
    notes?: string;
}

export interface AmortizationInstalment {
    month: number;
    dueDate: string;
    openingBalance: number;
    principalPayment: number;
    interestPayment: number;
    totalPayment: number;
    closingBalance: number;
    isGracePeriod: boolean;
    isOverdue: boolean;
    isPaid: boolean;
}

export interface AmortizationSchedule {
    agreementId: number;
    principal: number;
    interestRatePa: number;
    termMonths: number;
    gracePeriodMonths: number;
    monthlyInstalment: number;
    totalInterest: number;
    totalRepayable: number;
    schedule: AmortizationInstalment[];
}

const A2F_ROLES = ['admin', 'a2f_officer'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// LOG: action_logDisbursement
// Inserts transaction, triggers confirmation email to enterprise.
// ─────────────────────────────────────────────────────────────────────────────

export async function action_logDisbursement(
    agreementId: number,
    input: LogTransactionInput
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        if (input.amount <= 0) return errorResponse("Amount must be greater than zero");

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.id, agreementId),
        });
        if (!agreement) return errorResponse("Grant agreement not found");

        if (!agreement.isFullyExecuted) {
            return errorResponse("Cannot log disbursements — grant agreement has not been fully executed (signed)");
        }

        // Fetch enterprise details for the confirmation email
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, agreement.a2fId),
        });
        const application = pipeline
            ? await db.query.applications.findFirst({
                where: eq(applications.id, pipeline.applicationId),
                with: { business: { with: { applicant: true } } },
            })
            : null;

        // Insert transaction record (pending — must be verified by admin)
        const [transaction] = await db
            .insert(disbursementsAndRepayments)
            .values({
                agreementId,
                transactionType: input.transactionType,
                amount: String(input.amount),
                transactionDate: input.transactionDate,
                proofDocumentUrl: input.proofDocumentUrl ?? null,
                status: 'pending',
                notes: input.notes ?? null,
            })
            .returning({ id: disbursementsAndRepayments.id });

        // Send confirmation email for disbursements only
        if (input.transactionType === 'disbursement' && application) {
            const biz = application.business;
            const applicantName = `${biz.applicant.firstName} ${biz.applicant.lastName}`.trim();

            try {
                await sendEmail({
                    to: biz.applicant.email,
                    subject: `Fund Disbursement Notification — BIRE Programme`,
                    react: React.createElement(DisbursementEmailTemplate, {
                        applicantName,
                        enterpriseName: biz.name,
                        amount: input.amount,
                        transactionDate: input.transactionDate,
                        agreementType: agreement.agreementType,
                        transactionId: transaction.id,
                    }),
                });
            } catch (emailError) {
                // Log but don't fail the action if email delivery fails
                console.error("Disbursement email failed (non-fatal):", emailError);
            }
        }

        revalidatePath(`/admin/a2f/${agreement.a2fId}`);
        revalidatePath('/admin/a2f');

        return successResponse(
            { id: transaction.id },
            `${input.transactionType === 'disbursement' ? 'Disbursement' : 'Repayment'} logged (pending verification)`
        );
    } catch (error) {
        console.error("Error logging transaction:", error);
        return errorResponse("Failed to log transaction");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY: Mark a transaction as verified or rejected
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyTransaction(
    transactionId: number,
    action: 'verified' | 'rejected',
    rejectionReason?: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return errorResponse("Only admins can verify transactions");
        }

        const transaction = await db.query.disbursementsAndRepayments.findFirst({
            where: eq(disbursementsAndRepayments.id, transactionId),
        });
        if (!transaction) return errorResponse("Transaction not found");

        if (transaction.status !== 'pending') {
            return errorResponse(`Transaction is already '${transaction.status}'`);
        }

        if (action === 'rejected' && !rejectionReason?.trim()) {
            return errorResponse("Rejection reason is required");
        }

        await db
            .update(disbursementsAndRepayments)
            .set({
                status: action,
                verifiedById: session.user.id,
                verifiedAt: new Date(),
                rejectionReason: action === 'rejected' ? rejectionReason : null,
                updatedAt: new Date(),
            })
            .where(eq(disbursementsAndRepayments.id, transactionId));

        // Resolve a2fId via the agreement for cache invalidation
        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.id, transaction.agreementId),
        });

        revalidatePath(`/admin/a2f/${agreement?.a2fId}`);

        return successResponse(undefined, `Transaction ${action}`);
    } catch (error) {
        console.error("Error verifying transaction:", error);
        return errorResponse("Failed to verify transaction");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Full disbursement ledger for a grant agreement
// ─────────────────────────────────────────────────────────────────────────────

export async function getDisbursementLedger(agreementId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const transactions = await db.query.disbursementsAndRepayments.findMany({
            where: eq(disbursementsAndRepayments.agreementId, agreementId),
            with: { verifiedBy: { with: { userProfile: true } } },
            orderBy: [desc(disbursementsAndRepayments.transactionDate)],
        });

        // Summary aggregates
        const summary = await db
            .select({
                totalDisbursed: sql<number>`
                    COALESCE(SUM(CASE WHEN ${disbursementsAndRepayments.transactionType} = 'disbursement'
                    AND ${disbursementsAndRepayments.status} = 'verified'
                    THEN ${disbursementsAndRepayments.amount}::numeric ELSE 0 END), 0)::float`,
                totalRepaid: sql<number>`
                    COALESCE(SUM(CASE WHEN ${disbursementsAndRepayments.transactionType} = 'repayment'
                    AND ${disbursementsAndRepayments.status} = 'verified'
                    THEN ${disbursementsAndRepayments.amount}::numeric ELSE 0 END), 0)::float`,
                pendingCount: sql<number>`
                    COUNT(CASE WHEN ${disbursementsAndRepayments.status} = 'pending' THEN 1 END)::int`,
            })
            .from(disbursementsAndRepayments)
            .where(eq(disbursementsAndRepayments.agreementId, agreementId));

        return {
            success: true,
            data: {
                transactions,
                summary: summary[0] ?? { totalDisbursed: 0, totalRepaid: 0, pendingCount: 0 },
            },
        };
    } catch (error) {
        console.error("Error fetching disbursement ledger:", error);
        return { success: false, message: "Failed to load ledger" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: 24-month amortization schedule (Repayable grants)
//
// Formula:
//   Grace period (months 1–gracePeriodMonths): Interest-only payments
//     = Principal × (annualRate / 12)
//   Repayment period (months gracePeriodMonths+1 to termMonths): Reducing balance
//     EMI = P × r × (1+r)^n / ((1+r)^n - 1)
//     where r = annualRate/12, n = termMonths - gracePeriodMonths
// ─────────────────────────────────────────────────────────────────────────────

export async function getAmortizationSchedule(
    agreementId: number
): Promise<ActionResponse<AmortizationSchedule>> {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return errorResponse("Unauthorized");
        }

        const agreement = await db.query.grantAgreements.findFirst({
            where: eq(grantAgreements.id, agreementId),
        });
        if (!agreement) return errorResponse("Grant agreement not found");

        if (agreement.agreementType !== 'repayable') {
            return errorResponse("Amortization schedule only applies to Repayable Grant agreements");
        }

        const principal = parseFloat(agreement.hihContribution);
        const annualRate = parseFloat(agreement.interestRate ?? '6.0') / 100;
        const monthlyRate = annualRate / 12;
        const termMonths = agreement.termMonths ?? 24;
        const gracePeriodMonths = agreement.gracePeriodMonths ?? 3;
        const repaymentMonths = termMonths - gracePeriodMonths;

        // Monthly EMI for repayment period (reducing balance)
        const emi =
            monthlyRate === 0
                ? principal / repaymentMonths
                : (principal * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) /
                  (Math.pow(1 + monthlyRate, repaymentMonths) - 1);

        // Fetch verified repayments for "isPaid" tracking
        const verifiedRepayments = await db
            .select({
                transactionDate: disbursementsAndRepayments.transactionDate,
                amount: disbursementsAndRepayments.amount,
            })
            .from(disbursementsAndRepayments)
            .where(
                and(
                    eq(disbursementsAndRepayments.agreementId, agreementId),
                    eq(disbursementsAndRepayments.transactionType, 'repayment'),
                    eq(disbursementsAndRepayments.status, 'verified')
                )
            )
            .orderBy(disbursementsAndRepayments.transactionDate);

        // Build schedule — start from offer_sent_at or now
        const startDate = agreement.offerSentAt ?? agreement.createdAt;
        const today = new Date();

        let balance = principal;
        let totalInterest = 0;
        let repaidIndex = 0;
        const schedule: AmortizationInstalment[] = [];

        for (let month = 1; month <= termMonths; month++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + month);
            dueDate.setDate(15); // Payments due on the 15th

            const isGracePeriod = month <= gracePeriodMonths;
            const openingBalance = balance;

            let interestPayment = openingBalance * monthlyRate;
            let principalPayment = 0;
            let totalPayment: number;

            if (isGracePeriod) {
                // Interest-only
                totalPayment = interestPayment;
                principalPayment = 0;
            } else {
                totalPayment = emi;
                interestPayment = openingBalance * monthlyRate;
                principalPayment = Math.min(emi - interestPayment, openingBalance);
            }

            totalInterest += interestPayment;
            balance = Math.max(0, openingBalance - principalPayment);

            // Determine if this instalment has been paid
            const isFutureInstalment = dueDate > today;
            const isPaid = !isFutureInstalment && repaidIndex < verifiedRepayments.length;
            if (isPaid) repaidIndex++;

            const isOverdue = !isFutureInstalment && !isPaid && !isGracePeriod;

            schedule.push({
                month,
                dueDate: dueDate.toISOString().split('T')[0],
                openingBalance: round2(openingBalance),
                principalPayment: round2(principalPayment),
                interestPayment: round2(interestPayment),
                totalPayment: round2(totalPayment),
                closingBalance: round2(balance),
                isGracePeriod,
                isOverdue,
                isPaid,
            });
        }

        const amortizationSchedule: AmortizationSchedule = {
            agreementId,
            principal: round2(principal),
            interestRatePa: parseFloat(agreement.interestRate ?? '6.0'),
            termMonths,
            gracePeriodMonths,
            monthlyInstalment: round2(emi),
            totalInterest: round2(totalInterest),
            totalRepayable: round2(principal + totalInterest),
            schedule,
        };

        return successResponse(amortizationSchedule);
    } catch (error) {
        console.error("Error generating amortization schedule:", error);
        return errorResponse("Failed to generate amortization schedule");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Missed payments (overdue by the 15th)
// Used by the Financial Tracking Dashboard to highlight missed payments.
// ─────────────────────────────────────────────────────────────────────────────

export async function getOverdueInstalments(
    agreementId: number
): Promise<ActionResponse<AmortizationInstalment[]>> {
    try {
        const scheduleResult = await getAmortizationSchedule(agreementId);
        if (!scheduleResult.success || !scheduleResult.data) {
            return errorResponse("Could not load schedule");
        }

        const overdue = scheduleResult.data.schedule.filter(i => i.isOverdue);
        return successResponse(overdue, `${overdue.length} overdue instalment(s)`);
    } catch (error) {
        console.error("Error fetching overdue instalments:", error);
        return errorResponse("Failed to fetch overdue instalments");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE — Disbursement Confirmation
// ─────────────────────────────────────────────────────────────────────────────

interface DisbursementEmailProps {
    applicantName: string;
    enterpriseName: string;
    amount: number;
    transactionDate: Date;
    agreementType: string;
    transactionId: number;
}

function DisbursementEmailTemplate({
    applicantName,
    enterpriseName,
    amount,
    transactionDate,
    agreementType,
    transactionId,
}: DisbursementEmailProps) {
    const formattedAmount = new Intl.NumberFormat('en-KE', {
        style: 'decimal',
        maximumFractionDigits: 2,
    }).format(amount);

    const formattedDate = transactionDate.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return React.createElement(
        'div',
        { style: { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' } },
        React.createElement('h2', { style: { color: '#1a5c2a' } }, 'Fund Disbursement Confirmation'),
        React.createElement('p', null, `Dear ${applicantName},`),
        React.createElement(
            'p',
            null,
            `We confirm that a `,
            React.createElement('strong', null, agreementType === 'repayable' ? 'Repayable Grant' : agreementType === 'matching' ? 'Matching Grant' : 'Working Capital'),
            ` fund disbursement has been processed for `,
            React.createElement('strong', null, enterpriseName),
            `.`
        ),
        React.createElement(
            'table',
            { style: { width: '100%', borderCollapse: 'collapse', marginTop: '16px' } },
            React.createElement(
                'tbody',
                null,
                tableRow('Transaction Reference', `TXN-${String(transactionId).padStart(6, '0')}`),
                tableRow('Amount Disbursed', `KES ${formattedAmount}`),
                tableRow('Transaction Date', formattedDate),
                tableRow('Status', 'Pending Verification')
            )
        ),
        React.createElement(
            'p',
            { style: { marginTop: '20px' } },
            'Please ensure funds are utilised strictly in accordance with your approved Work Plan and Working Capital Guidelines. Keep all receipts and supporting documentation for accountability purposes.'
        ),
        React.createElement('hr', { style: { margin: '24px 0', borderColor: '#eee' } }),
        React.createElement(
            'p',
            { style: { fontSize: '12px', color: '#666' } },
            'This is an automated notification from the BIRE Programme. Contact your A2F Officer for any queries.'
        )
    );
}

function tableRow(label: string, value: string) {
    return React.createElement(
        'tr',
        null,
        React.createElement(
            'td',
            { style: { padding: '8px', border: '1px solid #eee', fontWeight: 'bold', width: '40%' } },
            label
        ),
        React.createElement(
            'td',
            { style: { padding: '8px', border: '1px solid #eee' } },
            value
        )
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
