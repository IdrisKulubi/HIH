import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { businesses, melAuditEvents } from "@/db/schema";
import { requireMelManager } from "@/lib/mel/access";
import {
  ENTERPRISE_EXPORT_SECTIONS,
  isEnterpriseExportSection,
  type EnterpriseExportSection,
} from "@/lib/mel/enterprise-export-config";
import {
  buildEnterpriseExportCsv,
  buildEnterpriseExportWorkbook,
  enterpriseExportDateBounds,
  isWithinEnterpriseExportRange,
  writeEnterpriseExportWorkbook,
  type EnterpriseExportRow,
  type EnterpriseExportSheet,
} from "@/lib/mel/enterprise-export";
import { enforceMelRateLimit, recordMelOperationalEvent, requireMelRolloutFeature } from "@/lib/mel/operations";

export async function GET(request: Request) {
  try {
    const actor = await requireMelManager();
    await requireMelRolloutFeature("reporting");
    await enforceMelRateLimit(`mel-enterprise-export:${actor.id}`, 20, 60);

    const url = new URL(request.url);
    const businessId = positiveNumber(url.searchParams.get("businessId"));
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const sections = selectedSections(url.searchParams.getAll("section"));
    if (!businessId) return Response.json({ error: "Choose a valid enterprise." }, { status: 400 });
    if (sections.length === 0) return Response.json({ error: "Choose at least one data section." }, { status: 400 });
    const bounds = enterpriseExportDateBounds(from, to);

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      with: {
        applicant: true,
        application: true,
        kycProfile: true,
        melMonitoringSubmissions: {
          with: {
            reportingPeriod: true,
            response: true,
            financeEntries: true,
            jobs: true,
            waste: true,
            evidence: { with: { reviews: true } },
            evidenceReferences: { with: { sourceEvidence: { with: { reviews: true } } } },
            reviewDecisions: true,
            dqaIssues: true,
          },
        },
        melLearningActions: true,
      },
    });
    if (!business) return Response.json({ error: "Enterprise was not found." }, { status: 404 });

    const submissions = business.melMonitoringSubmissions
      .filter((submission) => isWithinEnterpriseExportRange(submission.lastSavedAt, bounds))
      .sort((left, right) => left.reportingPeriod.startDate.localeCompare(right.reportingPeriod.startDate));
    const submissionIds = new Set(submissions.map((submission) => submission.id));
    const learningActions = business.melLearningActions.filter((action) =>
      (action.submissionId !== null && submissionIds.has(action.submissionId))
      || isWithinEnterpriseExportRange(action.updatedAt, bounds)
    );

    const sheets: EnterpriseExportSheet[] = [];
    const include = (section: EnterpriseExportSection) => sections.includes(section);
    const add = (section: EnterpriseExportSection, name: string, rows: EnterpriseExportRow[]) => {
      if (include(section)) sheets.push({ name, rows });
    };

    add("profile", "Enterprise profile", [{
      Enterprise_ID: business.id,
      Enterprise: business.name,
      Verification_Status: business.verificationStatus,
      Registered: business.isRegistered,
      Registration_Type: business.registrationType,
      Sector: business.sector,
      Sector_Other: business.sectorOther,
      Description: business.description,
      Country: business.country,
      County: business.county,
      City: business.city,
      Years_Operational: business.yearsOperational,
      Track: business.application?.track ?? null,
      Application_Status: business.application?.status ?? null,
      KYC_Status: business.kycProfile?.status ?? null,
      KYC_Hub: business.kycProfile?.hubName ?? null,
      GPS_Coordinates: business.kycProfile?.gpsCoordinates ?? null,
      Owner_Name: `${business.applicant.firstName} ${business.applicant.lastName}`,
      Owner_Gender: business.applicant.gender,
      Owner_Date_of_Birth: business.applicant.dob,
      Owner_Phone: business.applicant.phoneNumber,
      Owner_Email: business.applicant.email,
    }]);

    add("submissions", "Report history", submissions.map((submission) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Period_Code: submission.reportingPeriod.code,
      Visit_Date: submission.visitDate,
      Status: submission.status,
      Version: submission.submissionVersion,
      Source_Mode: submission.sourceMode,
      Collector_ID: submission.collectorId,
      Collector_Role: submission.collectorRole,
      Assigned_REDO_ID: submission.assignedRedoId,
      Last_Saved_At: submission.lastSavedAt,
      Submitted_At: submission.submittedAt,
      Approved_At: submission.approvedAt,
      Created_At: submission.createdAt,
      Updated_At: submission.updatedAt,
    })));

    add("responses", "Quarterly responses", submissions.flatMap((submission) => {
      const response = submission.response;
      if (!response) return [];
      return [{
        Submission_ID: submission.id,
        Period: submission.reportingPeriod.label,
        Business_Plan_Improved: response.businessPlanImproved,
        Revenue_KES: numeric(response.revenue),
        Costs_KES: numeric(response.costs),
        Profit_Loss_KES: numeric(response.profitLoss),
        Financial_Change_Explanation: response.financialChangeExplanation,
        Market_Research_Completed: response.marketResearchCompleted,
        Market_Intelligence_Accessed: response.marketIntelligenceAccessed,
        New_Market_Segments: response.newMarketSegments,
        Technology_Adopted: response.technologyAdopted,
        Technology_Details: response.technologyDetails,
        New_Products_Developed: response.newProductsDeveloped,
        New_Products_Details: response.newProductsDetails,
        Linked_To_Finance_Provider: response.linkedToFinanceProvider,
        Financial_Plan_Completed: response.financialPlanCompleted,
        Active_Insurance: response.activeInsurance,
        Investor_Readiness_Completed: response.investorReadinessCompleted,
        Life_Cycle_Assessment_Completed: response.lifeCycleAssessmentCompleted,
        Eco_Certification_Active: response.ecoCertificationActive,
        ESG_Report_Completed: response.esgReportCompleted,
        Social_Safeguarding_Guidelines: response.socialSafeguardingGuidelines,
        Strategic_Partnerships: response.strategicPartnerships,
        Strategic_Partnership_Count: response.strategicPartnershipCount,
        Strategic_Partnership_Details: response.strategicPartnershipDetails,
        Forum_Participation: response.forumParticipation,
        Public_Private_Partnership: response.publicPrivatePartnership,
        Public_Private_Partnership_Details: response.publicPrivatePartnershipDetails,
        Main_Challenges: response.mainChallenges,
        Negative_Programme_Impacts: response.negativeProgrammeImpacts,
        Additional_Support_Needed: response.additionalSupportNeeded,
        Collector_Comment: response.collectorComment,
        Completed_Sections: response.completedSections.join("; "),
        Response_Updated_At: response.updatedAt,
      }];
    }));

    add("finance", "Finance accessed", submissions.flatMap((submission) => submission.financeEntries.map((entry) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Finance_Type: entry.financeType,
      Other_Description: entry.otherDescription,
      Amount_KES: numeric(entry.amount),
      Updated_At: entry.updatedAt,
    }))));

    add("jobs", "Jobs", submissions.flatMap((submission) => submission.jobs.map((job) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Job_Type: job.jobType,
      Total: job.quarterlyTotal,
      Male: job.male,
      Female: job.female,
      Youth: job.youth,
      PLWD: job.plwd,
      Refugee: job.refugee,
      Updated_At: job.updatedAt,
    }))));

    add("waste", "Waste", submissions.flatMap((submission) => submission.waste.map((item) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Waste_Stream: item.wasteStream,
      Kilograms: numeric(item.kilograms),
      Notes: item.notes,
      Updated_At: item.updatedAt,
    }))));

    add("evidence", "Evidence index", submissions.flatMap((submission) => [
      ...submission.evidence.map((evidence) => ({
        Submission_ID: submission.id,
        Period: submission.reportingPeriod.label,
        Question_Code: evidence.questionCode,
        Evidence_Mode: "uploaded",
        File_Name: evidence.fileName,
        File_Type: evidence.fileType,
        File_Size_Bytes: evidence.fileSize,
        File_URL: evidence.fileUrl,
        Status: evidence.status,
        Review_Status: latestReviewStatus(evidence.reviews),
        Uploaded_At: evidence.createdAt,
      })),
      ...submission.evidenceReferences.map((reference) => ({
        Submission_ID: submission.id,
        Period: submission.reportingPeriod.label,
        Question_Code: reference.questionCode,
        Evidence_Mode: "reused_reference",
        File_Name: reference.sourceEvidence.fileName,
        File_Type: reference.sourceEvidence.fileType,
        File_Size_Bytes: reference.sourceEvidence.fileSize,
        File_URL: reference.sourceEvidence.fileUrl,
        Status: reference.sourceEvidence.status,
        Review_Status: latestReviewStatus(reference.sourceEvidence.reviews),
        Uploaded_At: reference.createdAt,
      })),
    ]));

    add("review", "Review decisions", submissions.flatMap((submission) => submission.reviewDecisions.map((decision) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Stage: decision.stage,
      Action: decision.action,
      From_Status: decision.fromStatus,
      To_Status: decision.toStatus,
      Reviewer_ID: decision.reviewerId,
      Reviewer_Role: decision.reviewerRole,
      Reason: decision.reason,
      Affected_Questions: decision.affectedQuestions.join("; "),
      Recorded_At: decision.createdAt,
    }))));
    add("review", "DQA issues", submissions.flatMap((submission) => submission.dqaIssues.map((issue) => ({
      Submission_ID: submission.id,
      Period: submission.reportingPeriod.label,
      Rule_Code: issue.ruleCode,
      Category: issue.category,
      Severity: issue.severity,
      Question_Code: issue.questionCode,
      Message: issue.message,
      Status: issue.status,
      Resolution_Reason: issue.resolutionReason,
      Updated_At: issue.updatedAt,
    }))));

    add("learning", "Learning actions", learningActions.map((action) => ({
      Action_ID: action.id,
      Submission_ID: action.submissionId,
      Finding: action.finding,
      Agreed_Action: action.agreedAction,
      Responsible_User_ID: action.responsibleUserId,
      Due_Date: action.dueDate,
      Status: action.status,
      Follow_Up_Notes: action.followUpNotes,
      Evidence_URL: action.evidenceUrl,
      Updated_At: action.updatedAt,
    })));

    const exportedAt = new Date();
    const metadata = {
      Enterprise: business.name,
      Enterprise_ID: business.id,
      From_Date: from,
      To_Date: to,
      Reports_Last_Saved_In_Range: submissions.length,
      Included_Sections: ENTERPRISE_EXPORT_SECTIONS.filter((section) => sections.includes(section.key)).map((section) => section.label).join("; "),
      Exported_At: exportedAt,
      Data_Rule: "Current state of reports last saved in the selected date range; includes draft, returned, review and approved records.",
    };

    await db.insert(melAuditEvents).values({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "mel_enterprise_export",
      entityId: String(business.id),
      action: "export",
      reason: `${format.toUpperCase()} enterprise data export`,
      after: {
        businessId: business.id,
        from,
        to,
        sections,
        reportCount: submissions.length,
        rowCounts: Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.rows.length])),
      },
      correlationId: randomUUID(),
    });

    const fileBase = `mel-enterprise-${business.id}-${slug(business.name)}-${from}-to-${to}`;
    if (format === "csv") {
      return new Response(buildEnterpriseExportCsv(sheets, metadata), {
        headers: downloadHeaders(`${fileBase}.csv`, "text/csv; charset=utf-8"),
      });
    }
    const buffer = writeEnterpriseExportWorkbook(buildEnterpriseExportWorkbook(sheets, metadata));
    return new Response(new Uint8Array(buffer), {
      headers: downloadHeaders(`${fileBase}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    });
  } catch (error) {
    console.error("MEL enterprise export failed", error);
    try {
      await recordMelOperationalEvent({
        severity: "error",
        eventType: "enterprise_export_failed",
        message: error instanceof Error ? error.message : "MEL enterprise export failed.",
      });
    } catch (eventError) {
      console.error("MEL enterprise export failure event could not be recorded", eventError);
    }
    return Response.json({ error: error instanceof Error ? error.message : "Enterprise export failed." }, { status: 500 });
  }
}

function selectedSections(values: string[]): EnterpriseExportSection[] {
  return [...new Set(values.flatMap((value) => value.split(",")).filter(isEnterpriseExportSection))];
}

function latestReviewStatus(reviews: Array<{ status: string; reviewedAt: Date }>) {
  return [...reviews].sort((left, right) => right.reviewedAt.getTime() - left.reviewedAt.getTime())[0]?.status ?? "pending";
}

function positiveNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function numeric(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "enterprise";
}

function downloadHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}
