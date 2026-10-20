"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fPipeline,
  applicants,
  applications,
  businesses,
  capacityDevelopmentPlans,
  cnaAssessments,
  dueDiligenceRecords,
  kycProfiles,
  mentorshipMatches,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { errorResponse, successResponse, type ActionResponse } from "./types";

export type EnterpriseStageState = "not_started" | "in_progress" | "completed" | "stopped";

export type EnterpriseStageProgress = {
  state: EnterpriseStageState;
  label: string;
};

export type EnterpriseProgressRow = {
  applicationId: number;
  businessId: number;
  businessName: string;
  applicantName: string;
  applicantEmail: string;
  track: string;
  sector: string;
  county: string;
  application: EnterpriseStageProgress;
  dueDiligence: EnterpriseStageProgress;
  kyc: EnterpriseStageProgress;
  cna: EnterpriseStageProgress;
  cdp: EnterpriseStageProgress;
  mentorship: EnterpriseStageProgress;
  accessToFinance: EnterpriseStageProgress;
  currentStage: string;
  currentStageLabel: string;
  progressPercent: number;
  nextActionHref: string;
  lastUpdatedAt: string;
};

const ENTERPRISE_PROGRESS_ROLES = [
  "admin",
  "oversight",
  "redo",
  "mentor",
  "bds_edo",
  "investment_analyst",
  "mel",
] as const;

function humanize(value: string | null | undefined, fallback = "Not started") {
  if (!value) return fallback;
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function applicationProgress(status: string): EnterpriseStageProgress {
  if (status === "rejected") return { state: "stopped", label: "Rejected" };
  if (status === "approved" || status === "finalist") return { state: "completed", label: humanize(status) };
  return { state: "in_progress", label: humanize(status) };
}

function dueDiligenceProgress(row: { ddStatus: string | null; finalVerdict: string | null } | undefined): EnterpriseStageProgress {
  if (!row) return { state: "not_started", label: "Not started" };
  if (row.finalVerdict === "fail") return { state: "stopped", label: "Failed" };
  if (row.finalVerdict === "pass" || row.ddStatus === "approved") return { state: "completed", label: "Approved" };
  return { state: "in_progress", label: humanize(row.ddStatus) };
}

function kycProgress(status: string | null | undefined): EnterpriseStageProgress {
  if (!status || status === "not_started") return { state: "not_started", label: "Not started" };
  if (status === "verified") return { state: "completed", label: "Verified" };
  if (status === "rejected") return { state: "stopped", label: "Rejected" };
  return { state: "in_progress", label: humanize(status) };
}

function cnaProgress(status: string | undefined): EnterpriseStageProgress {
  if (!status) return { state: "not_started", label: "Not started" };
  if (status === "locked" || status === "archived") return { state: "completed", label: humanize(status) };
  return { state: "in_progress", label: humanize(status) };
}

function cdpProgress(status: string | undefined): EnterpriseStageProgress {
  if (!status) return { state: "not_started", label: "Not started" };
  if (status === "archived") return { state: "completed", label: "Completed" };
  return { state: "in_progress", label: humanize(status) };
}

function mentorshipProgress(status: string | undefined): EnterpriseStageProgress {
  if (!status) return { state: "not_started", label: "Not started" };
  if (status === "completed") return { state: "completed", label: "Completed" };
  if (status === "terminated") return { state: "stopped", label: "Terminated" };
  return { state: "in_progress", label: humanize(status) };
}

function a2fProgress(status: string | undefined): EnterpriseStageProgress {
  if (!status) return { state: "not_started", label: "Not started" };
  if (status === "post_ta_monitoring") return { state: "completed", label: "Post-TA monitoring" };
  return { state: "in_progress", label: humanize(status) };
}

function firstByKey<Row, Key>(rows: Row[], keyFor: (row: Row) => Key) {
  const map = new Map<Key, Row>();
  for (const row of rows) {
    const key = keyFor(row);
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

function isUndefinedTableError(error: unknown): boolean {
  let current: unknown = error;

  while (current && typeof current === "object") {
    if ("code" in current && current.code === "42P01") return true;
    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

async function loadOptionalRows<Row>(label: string, query: PromiseLike<Row[]>): Promise<Row[]> {
  try {
    return await query;
  } catch (error) {
    if (!isUndefinedTableError(error)) throw error;

    console.warn(`Enterprise progress: ${label} table is unavailable; showing that stage as not started.`);
    return [];
  }
}

export async function getEnterpriseProgressRows(): Promise<ActionResponse<EnterpriseProgressRow[]>> {
  try {
    const session = await auth();
    const role = session?.user?.role ?? "";
    if (!session?.user?.id || !ENTERPRISE_PROGRESS_ROLES.includes(role as (typeof ENTERPRISE_PROGRESS_ROLES)[number])) {
      return errorResponse("Unauthorized");
    }

    const [baseRows, ddRows, cnaRows, cdpRows, mentorshipRows, a2fRows] = await Promise.all([
      db
        .select({
          applicationId: applications.id,
          businessId: businesses.id,
          businessName: businesses.name,
          applicantFirstName: applicants.firstName,
          applicantLastName: applicants.lastName,
          applicantEmail: applicants.email,
          track: applications.track,
          sector: businesses.sector,
          county: businesses.county,
          applicationStatus: applications.status,
          applicationUpdatedAt: applications.updatedAt,
          kycStatus: kycProfiles.status,
          kycUpdatedAt: kycProfiles.updatedAt,
        })
        .from(applications)
        .innerJoin(businesses, eq(businesses.id, applications.businessId))
        .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
        .leftJoin(kycProfiles, eq(kycProfiles.applicationId, applications.id))
        .orderBy(desc(applications.updatedAt)),
      db
        .select({
          applicationId: dueDiligenceRecords.applicationId,
          ddStatus: dueDiligenceRecords.ddStatus,
          finalVerdict: dueDiligenceRecords.finalVerdict,
          updatedAt: dueDiligenceRecords.updatedAt,
        })
        .from(dueDiligenceRecords)
        .orderBy(desc(dueDiligenceRecords.updatedAt)),
      db
        .select({ businessId: cnaAssessments.businessId, status: cnaAssessments.status, updatedAt: cnaAssessments.updatedAt })
        .from(cnaAssessments)
        .orderBy(desc(cnaAssessments.updatedAt)),
      db
        .select({ businessId: capacityDevelopmentPlans.businessId, status: capacityDevelopmentPlans.status, updatedAt: capacityDevelopmentPlans.updatedAt })
        .from(capacityDevelopmentPlans)
        .orderBy(desc(capacityDevelopmentPlans.updatedAt)),
      loadOptionalRows(
        "mentorship",
        db
          .select({ businessId: mentorshipMatches.businessId, status: mentorshipMatches.status, updatedAt: mentorshipMatches.updatedAt })
          .from(mentorshipMatches)
          .orderBy(desc(mentorshipMatches.updatedAt)),
      ),
      db
        .select({ id: a2fPipeline.id, applicationId: a2fPipeline.applicationId, status: a2fPipeline.status, updatedAt: a2fPipeline.updatedAt })
        .from(a2fPipeline)
        .orderBy(desc(a2fPipeline.updatedAt)),
    ]);

    const ddByApplication = firstByKey(ddRows, (row) => row.applicationId);
    const cnaByBusiness = firstByKey(cnaRows, (row) => row.businessId);
    const cdpByBusiness = firstByKey(cdpRows, (row) => row.businessId);
    const mentorshipByBusiness = firstByKey(mentorshipRows, (row) => row.businessId);
    const a2fByApplication = firstByKey(a2fRows, (row) => row.applicationId);

    const rows = baseRows.map<EnterpriseProgressRow>((base) => {
      const dd = ddByApplication.get(base.applicationId);
      const cna = cnaByBusiness.get(base.businessId);
      const cdp = cdpByBusiness.get(base.businessId);
      const mentorship = mentorshipByBusiness.get(base.businessId);
      const a2f = a2fByApplication.get(base.applicationId);
      const stages = {
        application: applicationProgress(base.applicationStatus),
        dueDiligence: dueDiligenceProgress(dd),
        kyc: kycProgress(base.kycStatus),
        cna: cnaProgress(cna?.status),
        cdp: cdpProgress(cdp?.status),
        mentorship: mentorshipProgress(mentorship?.status),
        accessToFinance: a2fProgress(a2f?.status),
      };
      const stageEntries = [
        { key: "application", label: "Application", progress: stages.application, href: `/admin/applications/${base.applicationId}` },
        { key: "due_diligence", label: "Due Diligence", progress: stages.dueDiligence, href: `/admin/due-diligence/${base.applicationId}` },
        { key: "kyc", label: "KYC", progress: stages.kyc, href: `/admin/kyc/${base.applicationId}` },
        { key: "cna", label: "CNA", progress: stages.cna, href: `/admin/cna/${base.businessId}` },
        { key: "cdp", label: "CDP", progress: stages.cdp, href: `/admin/cdp/${base.businessId}` },
        { key: "mentorship", label: "Mentorship", progress: stages.mentorship, href: `/admin/mentorship/matches/${base.businessId}` },
        { key: "access_to_finance", label: "Access to Finance", progress: stages.accessToFinance, href: a2f ? `/a2f/${a2f.id}` : "/admin/a2f" },
      ];
      const activeStage = [...stageEntries].reverse().find((stage) => stage.progress.state !== "not_started") ?? stageEntries[0];
      const completed = stageEntries.filter((stage) => stage.progress.state === "completed").length;
      const timestamps = [base.applicationUpdatedAt, base.kycUpdatedAt, dd?.updatedAt, cna?.updatedAt, cdp?.updatedAt, mentorship?.updatedAt, a2f?.updatedAt]
        .filter((value): value is Date => value instanceof Date)
        .map((value) => value.getTime());

      return {
        applicationId: base.applicationId,
        businessId: base.businessId,
        businessName: base.businessName,
        applicantName: `${base.applicantFirstName} ${base.applicantLastName}`.trim(),
        applicantEmail: base.applicantEmail,
        track: humanize(base.track, "Unassigned"),
        sector: humanize(base.sector),
        county: humanize(base.county, "Not recorded"),
        ...stages,
        currentStage: activeStage.key,
        currentStageLabel: activeStage.label,
        progressPercent: Math.round((completed / stageEntries.length) * 100),
        nextActionHref: activeStage.href,
        lastUpdatedAt: new Date(Math.max(...timestamps, 0)).toISOString(),
      };
    });

    return successResponse(rows);
  } catch (error) {
    console.error("getEnterpriseProgressRows", error);
    return errorResponse("Failed to load enterprise progress");
  }
}
