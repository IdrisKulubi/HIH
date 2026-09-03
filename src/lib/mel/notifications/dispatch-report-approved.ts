import { and, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  businesses,
  melEnterpriseAchievements,
  melEnterpriseAssignments,
  melIndicatorDefinitions,
  melLearningActions,
  melNotificationOutbox,
  melReportingPeriods,
  melReviewDecisions,
  userProfiles,
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

type ApprovalEmailRecipient = {
  userId: string;
  email: string;
  name: string;
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
    const [recipients, business, period] = await Promise.all([
      resolveReportApprovedRecipients(input.collectorId, input.businessId),
      db.query.businesses.findFirst({
        where: eq(businesses.id, input.businessId),
        columns: { name: true },
      }),
      db.query.melReportingPeriods.findFirst({
        where: eq(melReportingPeriods.id, input.reportingPeriodId),
        columns: { label: true },
      }),
    ]);

    if (recipients.length === 0) {
      await markOutboxFailed(eventKey, "No EDO or collector email found");
      return;
    }

    const summary = await buildReportApprovalSummary(input);
    const reportUrl = `${APP_BASE_URL}/admin/mel/monitoring/${input.businessId}/${input.reportingPeriodId}`;
    const approvedDate = input.approvedAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const errors: string[] = [];
    let sentCount = 0;

    for (const recipient of recipients) {
      const result = await sendMelReportApprovedEmail({
        collectorEmail: recipient.email,
        collectorName: recipient.name,
        businessName: business?.name ?? "Enterprise",
        periodLabel: period?.label ?? "Reporting period",
        approvedDate,
        reportUrl,
        priorities: summary.priorities,
        learningActions: summary.learningActions,
        reviewerNote: summary.reviewerNote,
      });

      if (result.skipped) {
        errors.push(`${recipient.email}: ${result.error ?? "Email service not configured"}`);
        continue;
      }
      if (!result.success) {
        errors.push(`${recipient.email}: ${result.error ?? "Email delivery failed"}`);
        continue;
      }
      sentCount += 1;
    }

    if (sentCount === 0) {
      await markOutboxFailed(eventKey, errors.join("; ") || "Email delivery failed");
      return;
    }

    await db
      .update(melNotificationOutbox)
      .set({
        status: "sent",
        sentAt: new Date(),
        attempts: 1,
        lastError: errors.length > 0 ? errors.join("; ") : null,
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

async function resolveReportApprovedRecipients(
  collectorId: string,
  businessId: number
): Promise<ApprovalEmailRecipient[]> {
  const assignedEdos = await db
    .select({ collectorId: melEnterpriseAssignments.collectorId })
    .from(melEnterpriseAssignments)
    .innerJoin(userProfiles, eq(userProfiles.userId, melEnterpriseAssignments.collectorId))
    .where(
      and(
        eq(melEnterpriseAssignments.businessId, businessId),
        eq(melEnterpriseAssignments.isActive, true),
        eq(userProfiles.role, "bds_edo")
      )
    );

  const recipientIds = [...new Set([collectorId, ...assignedEdos.map((row) => row.collectorId)])];

  const rows = await db
    .select({
      userId: users.id,
      userEmail: users.email,
      userName: users.name,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      profileEmail: userProfiles.email,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(inArray(users.id, recipientIds));

  const seenEmails = new Set<string>();
  const recipients: ApprovalEmailRecipient[] = [];

  for (const row of rows) {
    const email = (row.profileEmail ?? row.userEmail ?? "").trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);
    const name =
      [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
      row.userName?.trim() ||
      "Programme staff";
    recipients.push({ userId: row.userId, email, name });
  }

  return recipients;
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
