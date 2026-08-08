import { and, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  businesses,
  melEnterpriseAchievements,
  melIndicatorDefinitions,
  melLearningActions,
  melNotificationOutbox,
  melReportingPeriods,
  melReviewDecisions,
  users,
} from "@/db/schema";
import { sendMelReportApprovedEmail } from "@/lib/email";
import {
  buildApprovalPrioritySummaryText,
  extractApprovalPriorities,
  type ApprovalPrioritySummary,
} from "@/lib/mel/approval-priorities";
import {
  ONE_TIME_QUESTION_BY_INDICATOR,
  type MonitoringQuestionCode,
} from "@/lib/mel/monitoring-question-catalog";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";

export type DispatchReportApprovedInput = {
  submissionId: number;
  submissionVersion: number;
  businessId: number;
  reportingPeriodId: number;
  collectorId: string;
  approvedAt: Date;
  reviewerNote?: string;
  response: Record<string, unknown> | null;
};

export async function buildReportApprovalSummary(
  input: DispatchReportApprovedInput
): Promise<ApprovalPrioritySummary> {
  const [approvedAchievements, learningActions] = await Promise.all([
    db
      .select({ code: melIndicatorDefinitions.code })
      .from(melEnterpriseAchievements)
      .innerJoin(melIndicatorDefinitions, eq(melIndicatorDefinitions.id, melEnterpriseAchievements.indicatorId))
      .where(
        and(
          eq(melEnterpriseAchievements.businessId, input.businessId),
          eq(melEnterpriseAchievements.status, "approved")
        )
      ),
    db.query.melLearningActions.findMany({
      where: and(
        eq(melLearningActions.submissionId, input.submissionId),
        inArray(melLearningActions.status, ["open", "in_progress"])
      ),
      columns: { finding: true, agreedAction: true },
    }),
  ]);

  const skipQuestionCodes = approvedAchievements
    .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
    .filter((code): code is MonitoringQuestionCode => Boolean(code));

  return extractApprovalPriorities({
    response: input.response,
    skipQuestionCodes,
    reviewerNote: input.reviewerNote,
    learningActions,
  });
}

export async function dispatchMelReportApprovedEmail(input: DispatchReportApprovedInput): Promise<void> {
  const eventKey = `mel-review:${input.submissionId}:${input.submissionVersion}:approved`;

  try {
    const [collector, business, period] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, input.collectorId),
        columns: { email: true, name: true },
      }),
      db.query.businesses.findFirst({
        where: eq(businesses.id, input.businessId),
        columns: { name: true },
      }),
      db.query.melReportingPeriods.findFirst({
        where: eq(melReportingPeriods.id, input.reportingPeriodId),
        columns: { label: true },
      }),
    ]);

    if (!collector?.email) {
      await markOutboxFailed(eventKey, "Collector email not found");
      return;
    }

    const summary = await buildReportApprovalSummary(input);
    const reportUrl = `${APP_BASE_URL}/admin/mel/monitoring/${input.businessId}/${input.reportingPeriodId}`;
    const approvedDate = input.approvedAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const result = await sendMelReportApprovedEmail({
      collectorEmail: collector.email,
      collectorName: collector.name?.trim() || "Programme staff",
      businessName: business?.name ?? "Enterprise",
      periodLabel: period?.label ?? "Reporting period",
      approvedDate,
      reportUrl,
      priorities: summary.priorities,
      learningActions: summary.learningActions,
      reviewerNote: summary.reviewerNote,
    });

    if (result.skipped) {
      await markOutboxFailed(eventKey, result.error ?? "Email service not configured");
      return;
    }

    if (!result.success) {
      await markOutboxFailed(eventKey, result.error ?? "Email delivery failed");
      return;
    }

    await db
      .update(melNotificationOutbox)
      .set({
        status: "sent",
        sentAt: new Date(),
        attempts: 1,
        lastError: null,
        body: buildApprovalPrioritySummaryText(summary),
        updatedAt: new Date(),
      })
      .where(eq(melNotificationOutbox.eventKey, eventKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dispatch error";
    console.error("dispatchMelReportApprovedEmail", error);
    await markOutboxFailed(eventKey, message);
  }
}

async function markOutboxFailed(eventKey: string, message: string) {
  await db
    .update(melNotificationOutbox)
    .set({
      status: "failed",
      attempts: 1,
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(melNotificationOutbox.eventKey, eventKey));
}

export async function loadApprovalReviewerNote(submissionId: number): Promise<string | undefined> {
  const decision = await db.query.melReviewDecisions.findFirst({
    where: and(
      eq(melReviewDecisions.submissionId, submissionId),
      eq(melReviewDecisions.action, "approved")
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    columns: { reason: true },
  });
  return decision?.reason?.trim() || undefined;
}
