import db from "@/db/drizzle";
import {
  applications,
  businesses,
  capacityDevelopmentPlans,
  cdpActivities,
  cdpGapItems,
  cnaQuestionBank,
  kycProfiles,
} from "@/db/schema";
import type { CdpFocusCode } from "@/lib/cdp/focus-areas";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export type MentorEnterpriseGap = {
  id: number;
  focusName: string;
  questionText: string;
  priority: string;
  status: string;
  recommendedIntervention: string | null;
  reviewerComment: string | null;
};

export type MentorEnterpriseActivity = {
  id: number;
  focusCode: string;
  gapChallenge: string | null;
  intervention: string;
  targetDate: string | null;
};

export type MentorEnterpriseBrief = {
  applicantEmail: string;
  applicantPhone: string;
  county: string | null;
  city: string;
  sector: string;
  track: string | null;
  secondaryContactName: string | null;
  secondaryContactPhone: string | null;
  secondaryContactEmail: string | null;
  cdpPlanStatus: string | null;
  mentorGaps: MentorEnterpriseGap[];
  mentorActivities: MentorEnterpriseActivity[];
};

export async function loadMentorEnterpriseBriefs(
  businessIds: number[]
): Promise<Map<number, MentorEnterpriseBrief>> {
  const result = new Map<number, MentorEnterpriseBrief>();
  if (businessIds.length === 0) return result;

  const mentorQuestions = await db.query.cnaQuestionBank.findMany({
    where: and(eq(cnaQuestionBank.assignedRole, "mentor"), eq(cnaQuestionBank.isActive, true)),
    columns: { sectionCode: true },
  });
  const mentorFocusCodes = new Set(
    mentorQuestions.map((row) => row.sectionCode as CdpFocusCode)
  );

  const [businessRows, applicationRows, kycRows, planRows] = await Promise.all([
    db.query.businesses.findMany({
      where: inArray(businesses.id, businessIds),
      with: { applicant: true },
    }),
    db.query.applications.findMany({
      where: inArray(applications.businessId, businessIds),
      orderBy: [desc(applications.createdAt)],
      columns: { businessId: true, track: true },
    }),
    db.query.kycProfiles.findMany({
      where: inArray(kycProfiles.businessId, businessIds),
      columns: {
        businessId: true,
        secondaryContactName: true,
        secondaryContactPhone: true,
        secondaryContactEmail: true,
      },
    }),
    db.query.capacityDevelopmentPlans.findMany({
      where: and(
        inArray(capacityDevelopmentPlans.businessId, businessIds),
        inArray(capacityDevelopmentPlans.status, ["active", "draft"])
      ),
      orderBy: [desc(capacityDevelopmentPlans.updatedAt)],
      with: {
        gapItems: {
          orderBy: [asc(cdpGapItems.priority), asc(cdpGapItems.id)],
        },
        activities: {
          orderBy: [asc(cdpActivities.sortOrder), asc(cdpActivities.id)],
        },
      },
    }),
  ]);

  const trackByBusiness = new Map<number, string | null>();
  for (const app of applicationRows) {
    if (!trackByBusiness.has(app.businessId)) {
      trackByBusiness.set(app.businessId, app.track);
    }
  }

  const kycByBusiness = new Map(kycRows.map((row) => [row.businessId, row]));

  const planByBusiness = new Map<number, (typeof planRows)[number]>();
  for (const plan of planRows) {
    const existing = planByBusiness.get(plan.businessId);
    if (!existing) {
      planByBusiness.set(plan.businessId, plan);
      continue;
    }
    if (existing.status !== "active" && plan.status === "active") {
      planByBusiness.set(plan.businessId, plan);
    }
  }

  for (const business of businessRows) {
    const kyc = kycByBusiness.get(business.id);
    const plan = planByBusiness.get(business.id);
    const mentorActivities = (plan?.activities ?? [])
      .filter((activity) => mentorFocusCodes.has(activity.focusCode as CdpFocusCode))
      .map((activity) => ({
        id: activity.id,
        focusCode: activity.focusCode,
        gapChallenge: activity.gapChallenge,
        intervention: activity.intervention,
        targetDate: activity.targetDate ?? null,
      }));

    result.set(business.id, {
      applicantEmail: business.applicant.email,
      applicantPhone: business.applicant.phoneNumber,
      county: business.county,
      city: business.city,
      sector: business.sector,
      track: trackByBusiness.get(business.id) ?? null,
      secondaryContactName: kyc?.secondaryContactName ?? null,
      secondaryContactPhone: kyc?.secondaryContactPhone ?? null,
      secondaryContactEmail: kyc?.secondaryContactEmail ?? null,
      cdpPlanStatus: plan?.status ?? null,
      mentorGaps: (plan?.gapItems ?? [])
        .filter((gap) => gap.reviewerRole === "mentor")
        .map((gap) => ({
        id: gap.id,
        focusName: gap.focusName,
        questionText: gap.questionText,
        priority: gap.priority,
        status: gap.status,
        recommendedIntervention: gap.recommendedIntervention,
        reviewerComment: gap.reviewerComment,
      })),
      mentorActivities,
    });
  }

  return result;
}
