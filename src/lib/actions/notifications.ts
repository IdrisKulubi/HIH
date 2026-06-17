"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fDocumentResolutionIssues,
  a2fDueDiligenceReports,
  a2fMatchingGrantApplications,
  a2fPipeline,
  a2fPreScreeningAttempts,
  a2fScoring,
  applications,
  disbursementsAndRepayments,
  dueDiligenceRecords,
  eligibilityResults,
  investmentAppraisals,
  kycProfiles,
} from "@/db/schema";
import { qualifiedDdApplicationsWhere } from "@/lib/due-diligence-qualification";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";
import { and, desc, eq, inArray, isNull, notExists, or, sql } from "drizzle-orm";
import { errorResponse, successResponse, type ActionResponse } from "./types";

export type NotificationTone = "info" | "warning" | "success" | "danger";
export type NotificationGroup =
  | "Applications"
  | "A2F"
  | "Due diligence"
  | "KYC"
  | "Committee"
  | "Finance";

export interface TopbarNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  group: NotificationGroup;
  tone: NotificationTone;
  count?: number;
}

export interface TopbarNotificationPayload {
  items: TopbarNotification[];
  totalCount: number;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function item(input: TopbarNotification): TopbarNotification {
  return input;
}

function itemIf(
  count: number,
  input: Omit<TopbarNotification, "count">
): TopbarNotification[] {
  if (count <= 0) return [];
  return [{ ...input, count }];
}

async function countRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where?: any
) {
  const query = db.select({ count: sql<number>`count(*)::int` }).from(table);
  const [row] = where ? await query.where(where) : await query;
  return Number(row?.count ?? 0);
}

async function getAdminA2fInviteCount() {
  const attempts = await db
    .select({
      id: a2fPreScreeningAttempts.id,
      applicationId: a2fPreScreeningAttempts.applicationId,
    })
    .from(a2fPreScreeningAttempts)
    .innerJoin(
      dueDiligenceRecords,
      eq(dueDiligenceRecords.applicationId, a2fPreScreeningAttempts.applicationId)
    )
    .where(
      and(
        eq(a2fPreScreeningAttempts.status, "submitted"),
        inArray(a2fPreScreeningAttempts.invitationStatus, ["pending", "failed"]),
        qualifiedDdApplicationsWhere
      )
    );

  let count = 0;
  for (const attempt of attempts) {
    const effective = await getEffectiveScreeningForApplication(attempt.applicationId);
    if (effective?.attemptId === attempt.id && effective.outcome === "pass") {
      count += 1;
    }
  }
  return count;
}

async function getAdminNotifications(): Promise<TopbarNotification[]> {
  const [inviteCount, kycCount, ddApprovalCount, disbursementCount] = await Promise.all([
    getAdminA2fInviteCount(),
    countRows(kycProfiles, eq(kycProfiles.status, "submitted")),
    countRows(dueDiligenceRecords, eq(dueDiligenceRecords.ddStatus, "awaiting_approval")),
    countRows(disbursementsAndRepayments, eq(disbursementsAndRepayments.status, "pending")),
  ]);

  return [
    ...itemIf(inviteCount, {
      id: "admin-a2f-invites",
      title: "A2F invites ready",
      body: `${countLabel(inviteCount, "enterprise")} passed screening and DD. Send the application invite from A2F Administration.`,
      href: "/admin/a2f?tab=pre-screening",
      group: "A2F",
      tone: "warning",
    }),
    ...itemIf(kycCount, {
      id: "admin-kyc-review",
      title: "KYC submissions need review",
      body: `${countLabel(kycCount, "profile")} waiting for admin verification.`,
      href: "/admin/kyc",
      group: "KYC",
      tone: "info",
    }),
    ...itemIf(ddApprovalCount, {
      id: "admin-dd-approval",
      title: "DD reports awaiting approval",
      body: `${countLabel(ddApprovalCount, "DD report")} awaiting validator action.`,
      href: "/admin/due-diligence?status=awaiting_approval",
      group: "Due diligence",
      tone: "warning",
    }),
    ...itemIf(disbursementCount, {
      id: "admin-disbursements",
      title: "Transactions pending verification",
      body: `${countLabel(disbursementCount, "transaction")} waiting for finance verification.`,
      href: "/a2f",
      group: "Finance",
      tone: "warning",
    }),
  ];
}

async function getScreeningNotifications(userId: string): Promise<TopbarNotification[]> {
  const draftCount = await countRows(
    a2fPreScreeningAttempts,
    and(
      eq(a2fPreScreeningAttempts.status, "draft"),
      eq(a2fPreScreeningAttempts.assignedReviewerId, userId)
    )
  );

  const conditionalReadyCount = await countRows(
    a2fPreScreeningAttempts,
    and(
      eq(a2fPreScreeningAttempts.status, "submitted"),
      eq(a2fPreScreeningAttempts.outcome, "conditional"),
      sql`${a2fPreScreeningAttempts.rescreenEligibleAt} IS NOT NULL`,
      sql`${a2fPreScreeningAttempts.rescreenEligibleAt} <= CURRENT_DATE`
    )
  );

  return [
    ...itemIf(draftCount, {
      id: "screening-my-drafts",
      title: "Screening drafts assigned to you",
      body: `${countLabel(draftCount, "enterprise")} waiting for your pre-screening assessment.`,
      href: "/finance-screening?assignment=mine",
      group: "A2F",
      tone: "info",
    }),
    ...itemIf(conditionalReadyCount, {
      id: "screening-rescreen-ready",
      title: "Conditional cases ready for re-screen",
      body: `${countLabel(conditionalReadyCount, "enterprise")} has reached the re-screening date.`,
      href: "/finance-screening?outcome=conditional",
      group: "A2F",
      tone: "warning",
    }),
  ];
}

async function getRedoNotifications(userId: string): Promise<TopbarNotification[]> {
  const [documentIssues, ddApprovals] = await Promise.all([
    countRows(
      a2fDocumentResolutionIssues,
      and(
        eq(a2fDocumentResolutionIssues.assignedToId, userId),
        eq(a2fDocumentResolutionIssues.status, "open")
      )
    ),
    countRows(
      dueDiligenceRecords,
      and(
        eq(dueDiligenceRecords.ddStatus, "awaiting_approval"),
        eq(dueDiligenceRecords.validatorReviewerId, userId)
      )
    ),
  ]);

  return [
    ...itemIf(documentIssues, {
      id: "redo-document-issues",
      title: "Application documents need REDO review",
      body: `${countLabel(documentIssues, "document issue")} assigned to you.`,
      href: "/application-resolutions",
      group: "A2F",
      tone: "warning",
    }),
    ...itemIf(ddApprovals, {
      id: "redo-dd-approvals",
      title: "DD approvals assigned to you",
      body: `${countLabel(ddApprovals, "DD report")} awaiting your validation.`,
      href: "/admin/due-diligence?status=awaiting_approval",
      group: "Due diligence",
      tone: "warning",
    }),
  ];
}

async function getReviewerNotifications(userId: string, role: string): Promise<TopbarNotification[]> {
  const isReviewerOne = role === "reviewer_1";
  const count = await countRows(
    eligibilityResults,
    isReviewerOne
      ? and(
          eq(eligibilityResults.assignedReviewer1Id, userId),
          isNull(eligibilityResults.reviewer1Score)
        )
      : and(
          eq(eligibilityResults.assignedReviewer2Id, userId),
          isNull(eligibilityResults.reviewer2Score)
        )
  );

  return itemIf(count, {
    id: `reviewer-${role}-assigned`,
    title: "Applications assigned for scoring",
    body: `${countLabel(count, "application")} waiting for your review.`,
    href: "/reviewer",
    group: "Applications",
    tone: "info",
  });
}

async function getA2fOfficerNotifications(userId: string, role: string): Promise<TopbarNotification[]> {
  const officerScope =
    role === "admin"
      ? undefined
      : or(eq(a2fPipeline.a2fOfficerId, userId), isNull(a2fPipeline.a2fOfficerId));

  const applicationSubmittedWhere = and(
    eq(a2fPipeline.screeningRequired, false),
    eq(a2fPipeline.status, "a2f_pipeline"),
    officerScope,
    notExists(
      db
        .select({ id: a2fDueDiligenceReports.id })
        .from(a2fDueDiligenceReports)
        .where(
          and(
            eq(a2fDueDiligenceReports.a2fId, a2fPipeline.id),
            eq(a2fDueDiligenceReports.stage, "initial"),
            eq(a2fDueDiligenceReports.isComplete, true)
          )
        )
    ),
    eq(a2fMatchingGrantApplications.status, "submitted")
  );

  const readyForScoringWhere = and(
    eq(a2fPipeline.status, "pre_ic_scoring"),
    officerScope,
    notExists(
      db
        .select({ id: a2fScoring.id })
        .from(a2fScoring)
        .where(eq(a2fScoring.a2fId, a2fPipeline.id))
    )
  );

  const [applicationSubmittedCount, scoringCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(a2fPipeline)
      .innerJoin(
        a2fMatchingGrantApplications,
        eq(a2fMatchingGrantApplications.a2fId, a2fPipeline.id)
      )
      .where(applicationSubmittedWhere)
      .then(([row]) => Number(row?.count ?? 0)),
    countRows(a2fPipeline, readyForScoringWhere),
  ]);

  return [
    ...itemIf(applicationSubmittedCount, {
      id: "a2f-applications-submitted",
      title: "A2F applications ready for officer action",
      body: `${countLabel(applicationSubmittedCount, "case")} has submitted the application form.`,
      href: "/a2f",
      group: "A2F",
      tone: "info",
    }),
    ...itemIf(scoringCount, {
      id: "a2f-scoring-ready",
      title: "Cases ready for scoring",
      body: `${countLabel(scoringCount, "case")} waiting for Pre-IC scoring.`,
      href: "/a2f",
      group: "A2F",
      tone: "warning",
    }),
  ];
}

async function getCommitteeNotifications(): Promise<TopbarNotification[]> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(investmentAppraisals)
    .innerJoin(a2fPipeline, eq(a2fPipeline.id, investmentAppraisals.a2fId))
    .where(
      and(
        eq(investmentAppraisals.documentType, "gair"),
        eq(a2fPipeline.status, "ic_appraisal_review"),
        isNull(investmentAppraisals.icDecision)
      )
    );
  const count = Number(row?.count ?? 0);

  return itemIf(count, {
    id: "committee-gair-review",
    title: "GAIR cases awaiting committee decision",
    body: `${countLabel(count, "case")} ready for IC review.`,
    href: "/a2f/committee",
    group: "Committee",
    tone: "warning",
  });
}

async function getApplicantNotifications(userId: string): Promise<TopbarNotification[]> {
  const application = await db.query.applications.findFirst({
    where: eq(applications.userId, userId),
    orderBy: [desc(applications.updatedAt)],
    columns: {
      id: true,
      kycRequired: true,
      kycStatus: true,
    },
  });

  if (!application) return [];

  const items: TopbarNotification[] = [];
  if (
    application.kycRequired &&
    application.kycStatus !== "verified" &&
    application.kycStatus !== "submitted"
  ) {
    items.push(
      item({
        id: "applicant-kyc",
        title: "Complete your KYC profile",
        body: "Your programme profile needs KYC details before staff can finish verification.",
        href: "/kyc",
        group: "KYC",
        tone: "warning",
      })
    );
  }

  const pipeline = await db.query.a2fPipeline.findFirst({
    where: eq(a2fPipeline.applicationId, application.id),
    columns: { id: true },
  });
  if (pipeline) {
    const [mgApp, effectiveScreening] = await Promise.all([
      db.query.a2fMatchingGrantApplications.findFirst({
        where: eq(a2fMatchingGrantApplications.a2fId, pipeline.id),
        columns: { status: true },
      }),
      getEffectiveScreeningForApplication(application.id),
    ]);
    const effectiveAttempt = effectiveScreening?.attemptId
      ? await db.query.a2fPreScreeningAttempts.findFirst({
          where: eq(a2fPreScreeningAttempts.id, effectiveScreening.attemptId),
          columns: { invitationStatus: true },
        })
      : null;
    const inviteSent = effectiveAttempt?.invitationStatus === "sent";
    if (inviteSent && mgApp?.status !== "submitted") {
      items.push(
        item({
          id: "applicant-a2f-application",
          title: "Access to Finance application is open",
          body: "Complete and submit the Matching Grant application form.",
          href: `/access-to-finance/application/${pipeline.id}`,
          group: "A2F",
          tone: "info",
        })
      );
    }
  }

  return items;
}

export async function getTopbarNotifications(): Promise<
  ActionResponse<TopbarNotificationPayload>
> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId || !role) {
      return successResponse({ items: [], totalCount: 0 });
    }

    const providers: Array<Promise<TopbarNotification[]>> = [];

    if (role === "admin") providers.push(getAdminNotifications());
    if (role === "admin" || role === "bds_edo" || role === "redo") {
      providers.push(getScreeningNotifications(userId));
    }
    if (role === "redo") providers.push(getRedoNotifications(userId));
    if (role === "reviewer_1" || role === "reviewer_2") {
      providers.push(getReviewerNotifications(userId, role));
    }
    if (role === "admin" || role === "a2f_officer") {
      providers.push(getA2fOfficerNotifications(userId, role));
    }
    if (role === "admin" || role === "a2f_committee") {
      providers.push(getCommitteeNotifications());
    }
    if (role === "applicant") providers.push(getApplicantNotifications(userId));

    const items = (await Promise.all(providers)).flat();
    const totalCount = items.reduce((sum, notification) => sum + (notification.count ?? 1), 0);

    return successResponse({
      items: items.slice(0, 12),
      totalCount,
    });
  } catch (error) {
    console.error("Failed to load topbar notifications:", error);
    return errorResponse("Failed to load notifications");
  }
}
