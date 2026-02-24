"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { applications, applicants, eligibilityResults } from "@/db/schema";
import { desc, and, SQL, inArray, gte, lte } from "drizzle-orm";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { stringify } from 'csv-stringify/sync';
import { getDDQueue } from "./due-diligence";
import { getObservationApplications } from "./observation";

// Helper function to format values for export
const formatExportValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && value.trim() === "") return "";
  if (typeof value === "number") return value.toString();
  return String(value);
};

// Export data function for bulk exports
export async function exportData(params: {
  type: "applications" | "applicants" | "eligibility" | "due_diligence_qualified" | "due_diligence_queue" | "observation_applications";
  format: "csv" | "json" | "xlsx";
  filters: {
    status?: string[];
    country?: string[];
    track?: string[];
    county?: string[];
    sector?: string[];
    gender?: string[];
    isEligible?: boolean;
    submittedAfter?: Date;
    submittedBefore?: Date;
  };
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Build query conditions based on filters
    const conditions: SQL[] = [];

    // Filter by status
    if (params.filters.status && params.filters.status.length > 0) {
      conditions.push(
        inArray(
          applications.status,
          params.filters.status as ("submitted" | "under_review" | "pending_senior_review" | "approved" | "rejected" | "scoring_phase" | "finalist")[]
        )
      );
    }

    // Filter by track
    if (params.filters.track && params.filters.track.length > 0) {
      conditions.push(
        inArray(
          applications.track,
          params.filters.track as ("foundation" | "acceleration")[]
        )
      );
    }

    // Filter by date range
    if (params.filters.submittedAfter) {
      conditions.push(gte(applications.submittedAt, params.filters.submittedAfter));
    }
    if (params.filters.submittedBefore) {
      conditions.push(lte(applications.submittedAt, params.filters.submittedBefore));
    }

    let data: Record<string, unknown>[] = [];
    let fileName = "";

    switch (params.type) {
      case "applications": {
        // Fetch all applications with related data
        const applicationsData = await db.query.applications.findMany({
          where: conditions.length ? and(...conditions) : undefined,
          orderBy: [desc(applications.createdAt)],
          with: {
            business: {
              with: {
                applicant: true,
                funding: true,
                targetCustomers: true,
              },
            },
            eligibilityResults: {
              with: {
                evaluator: {
                  with: {
                    userProfile: true,
                  },
                },
              },
            },
          },
        });

        // Apply post-query filters
        let filteredApplications = applicationsData;

        // Filter by country
        if (params.filters.country && params.filters.country.length > 0) {
          filteredApplications = filteredApplications.filter(app =>
            params.filters.country!.includes(app.business?.country || "")
          );
        }

        // Filter by county
        if (params.filters.county && params.filters.county.length > 0) {
          filteredApplications = filteredApplications.filter(app =>
            params.filters.county!.includes(app.business?.county || "")
          );
        }

        // Filter by sector
        if (params.filters.sector && params.filters.sector.length > 0) {
          filteredApplications = filteredApplications.filter(app =>
            params.filters.sector!.includes(app.business?.sector || "")
          );
        }

        // Filter by gender
        if (params.filters.gender && params.filters.gender.length > 0) {
          filteredApplications = filteredApplications.filter(app =>
            params.filters.gender!.includes(app.business?.applicant?.gender || "")
          );
        }

        // Filter by eligibility
        if (params.filters.isEligible !== undefined) {
          filteredApplications = filteredApplications.filter(app => {
            const hasEligibility = app.eligibilityResults && app.eligibilityResults.length > 0;
            if (!hasEligibility) return false;
            return app.eligibilityResults[0].isEligible === params.filters.isEligible;
          });
        }

        // Transform data for export
        data = filteredApplications.map(app => {
          const eligibility = app.eligibilityResults?.[0];
          const funding = app.business?.funding?.[0];
          const targetCustomers = app.business?.targetCustomers?.map(tc => tc.customerSegment).join(", ") || "";

          return {
            // Application Info
            "Application ID": app.id,
            "Track": app.track ? app.track.charAt(0).toUpperCase() + app.track.slice(1) : "N/A",
            "Status": app.status.replace(/_/g, " ").toUpperCase(),
            "Submitted At": formatExportValue(app.submittedAt),
            "Created At": formatExportValue(app.createdAt),
            "Referral Source": formatExportValue(app.referralSource),

            // Applicant Info
            "First Name": app.business?.applicant?.firstName || "",
            "Last Name": app.business?.applicant?.lastName || "",
            "Email": app.business?.applicant?.email || "",
            "Phone": app.business?.applicant?.phoneNumber || "",
            "Gender": app.business?.applicant?.gender || "",
            "ID/Passport": app.business?.applicant?.idPassportNumber || "",

            // Business Info
            "Business Name": app.business?.name || "",
            "Business Years Operational": app.business?.yearsOperational || "N/A",
            "Business Country": app.business?.country?.toUpperCase() || "N/A",
            "Business County": app.business?.county?.replace(/_/g, " ").toUpperCase() || "N/A",
            "Business City": app.business?.city || "",
            "Is Registered": formatExportValue(app.business?.isRegistered),
            "Registration Type": app.business?.registrationType?.replace(/_/g, " ") || "",
            "Sector": app.business?.sector?.replace(/_/g, " ") || "",
            "Business Description": app.business?.description || "",
            "Problem Solved": app.business?.problemSolved || "",
            "Revenue Last Year (USD)": formatExportValue(app.business?.revenueLastYear),

            // Employee Info
            "Full-time Employees Total": app.business?.fullTimeEmployeesTotal,
            "Full-time Employees Women": app.business?.fullTimeEmployeesWomen,
            "Full-time Employees Youth": app.business?.fullTimeEmployeesYouth,
            "Full-time Employees PWD": app.business?.fullTimeEmployeesPwd,

            // Climate & Product Info
            "Environmental Impact": app.business?.environmentalImpact || "",
            "Environmental Impact Description": app.business?.environmentalImpactDescription || "",
            "Target Customer Segments": targetCustomers,

            // Market Info
            "Market Differentiation": app.business?.marketDifferentiation || "",
            "Competitive Advantage": app.business?.competitiveAdvantage || "",

            // Funding Info
            "Has External Funding": formatExportValue(funding?.hasExternalFunding),
            "Funding Source": formatExportValue(funding?.fundingSource?.replace(/_/g, " ")),
            "Funder Name": formatExportValue(funding?.funderName),
            "Funding Amount (USD)": formatExportValue(funding?.amountUsd),
            "Funding Date": formatExportValue(funding?.fundingDate),
            "Funding Instrument": formatExportValue(funding?.fundingInstrument?.replace(/_/g, " ")),

            // Eligibility Info
            "Is Eligible": formatExportValue(eligibility?.isEligible),
            "Total Score": formatExportValue(eligibility?.totalScore),
            "Evaluation Notes": formatExportValue(eligibility?.evaluationNotes),
            "Evaluated By": formatExportValue(eligibility?.evaluator?.userProfile?.firstName ? `${eligibility.evaluator.userProfile.firstName} ${eligibility.evaluator.userProfile.lastName}` : eligibility?.evaluatedBy),
            "Evaluated At": formatExportValue(eligibility?.evaluatedAt),

            // Two-Tier Review Info
            "Reviewer 1 Score": formatExportValue(eligibility?.reviewer1Score),
            "Reviewer 1 Notes": formatExportValue(eligibility?.reviewer1Notes),
            "Reviewer 1 At": formatExportValue(eligibility?.reviewer1At),
            "Reviewer 2 Score": formatExportValue(eligibility?.reviewer2Score),
            "Reviewer 2 Notes": formatExportValue(eligibility?.reviewer2Notes),
            "Reviewer 2 At": formatExportValue(eligibility?.reviewer2At),
            "Reviewer 2 Overrode R1": formatExportValue(eligibility?.reviewer2OverrodeReviewer1),
            "Is Locked": formatExportValue(eligibility?.isLocked),
            "Lock Reason": formatExportValue(eligibility?.lockReason),
          };
        });

        fileName = `BIRE_applications_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      case "applicants": {
        // Fetch applicants data with associated businesses for filtering
        const applicantsData = await db.query.applicants.findMany({
          orderBy: [desc(applicants.createdAt)],
          with: {
            businesses: true
          }
        });

        // Use 'let' for variable reassignment during filtering
        let filteredApplicants = applicantsData;

        // Filter by gender
        if (params.filters.gender && params.filters.gender.length > 0) {
          filteredApplicants = filteredApplicants.filter(applicant =>
            params.filters.gender!.includes(applicant.gender)
          );
        }

        // Filter by county (via businesses)
        if (params.filters.county && params.filters.county.length > 0) {
          filteredApplicants = filteredApplicants.filter(applicant =>
            applicant.businesses.some(b => params.filters.county!.includes(b.county || ""))
          );
        }

        // Filter by sector (via businesses)
        if (params.filters.sector && params.filters.sector.length > 0) {
          filteredApplicants = filteredApplicants.filter(applicant =>
            applicant.businesses.some(b => params.filters.sector!.includes(b.sector || ""))
          );
        }

        // Filter by country (via businesses)
        if (params.filters.country && params.filters.country.length > 0) {
          filteredApplicants = filteredApplicants.filter(applicant =>
            applicant.businesses.some(b => params.filters.country!.includes(b.country || ""))
          );
        }

        data = filteredApplicants.map(applicant => {
          // Extract business info for export (since filtering was based on it)
          const businessNames = applicant.businesses.map(b => b.name).filter(Boolean);
          const businessCounties = applicant.businesses.map(b => b.county?.toString().replace(/_/g, " ").toUpperCase()).filter(Boolean);
          const businessSectors = applicant.businesses.map(b => b.sector?.replace(/_/g, " ")).filter(Boolean);

          return {
            "ID": applicant.id,
            "User ID": applicant.userId,
            "First Name": applicant.firstName,
            "Last Name": applicant.lastName,
            "Email": applicant.email,
            "Phone": applicant.phoneNumber,
            "Gender": applicant.gender,
            "ID/Passport": applicant.idPassportNumber,
            "Business Names": formatExportValue(businessNames),
            "Business Counties": formatExportValue(businessCounties),
            "Business Sectors": formatExportValue(businessSectors),
            "Created At": formatExportValue(applicant.createdAt),
          };
        });

        fileName = `BIRE_applicants_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      case "eligibility": {
        // Fetch eligibility results with application data
        const eligibilityData = await db.query.eligibilityResults.findMany({
          orderBy: [desc(eligibilityResults.createdAt)],
          with: {
            application: {
              with: {
                business: {
                  with: {
                    applicant: true,
                  },
                },
              },
            },
            evaluator: {
              with: {
                userProfile: true,
              },
            },
          },
        });

        // Filter by eligibility if specified
        let filteredEligibility = eligibilityData;
        if (params.filters.isEligible !== undefined) {
          filteredEligibility = eligibilityData.filter(result =>
            result.isEligible === params.filters.isEligible
          );
        }

        // Filter by county
        if (params.filters.county && params.filters.county.length > 0) {
          filteredEligibility = filteredEligibility.filter(result =>
            params.filters.county!.includes(result.application?.business?.county || "")
          );
        }

        // Filter by sector
        if (params.filters.sector && params.filters.sector.length > 0) {
          filteredEligibility = filteredEligibility.filter(result =>
            params.filters.sector!.includes(result.application?.business?.sector || "")
          );
        }

        data = filteredEligibility.map(result => ({
          "Application ID": result.applicationId,
          "Track": result.application?.track ? result.application.track.charAt(0).toUpperCase() + result.application.track.slice(1) : "N/A",
          "Applicant Name": `${result.application?.business?.applicant?.firstName || ""} ${result.application?.business?.applicant?.lastName || ""}`.trim(),
          "Email": result.application?.business?.applicant?.email || "",
          "Phone": result.application?.business?.applicant?.phoneNumber || "",
          "Gender": result.application?.business?.applicant?.gender || "",
          "ID/Passport": result.application?.business?.applicant?.idPassportNumber || "",
          "Business Name": result.application?.business?.name || "",
          "County": result.application?.business?.county?.replace(/_/g, " ").toUpperCase() || "N/A",
          "City": result.application?.business?.city || "",
          "Sector": result.application?.business?.sector?.replace(/_/g, " ") || "",

          // Eligibility Status
          "Is Eligible": formatExportValue(result.isEligible),
          "Total Score": formatExportValue(result.totalScore),
          "Evaluated By": formatExportValue(result.evaluator?.userProfile?.firstName ? `${result.evaluator.userProfile.firstName} ${result.evaluator.userProfile.lastName}` : result.evaluatedBy),
          "Evaluated At": formatExportValue(result.evaluatedAt),

          // Two-Tier Review
          "Reviewer 1 Score": formatExportValue(result.reviewer1Score),
          "Reviewer 1 Notes": formatExportValue(result.reviewer1Notes),
          "Reviewer 1 At": formatExportValue(result.reviewer1At),
          "Reviewer 2 Score": formatExportValue(result.reviewer2Score),
          "Reviewer 2 Notes": formatExportValue(result.reviewer2Notes),
          "Reviewer 2 At": formatExportValue(result.reviewer2At),
          "Reviewer 2 Overrode R1": formatExportValue(result.reviewer2OverrodeReviewer1),
          "Is Locked": formatExportValue(result.isLocked),
          "Lock Reason": formatExportValue(result.lockReason),

          // Application Status
          "Application Status": result.application?.status?.replace(/_/g, " ").toUpperCase() || "",
          "Created At": formatExportValue(result.createdAt),
        }));

        fileName = `BIRE_eligibility_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      case "due_diligence_qualified": {
        // For DD qualified, we want to ignore the 'status' and some other filters
        // to find all applicants who scored >= 60%
        const ddConditions: SQL[] = [];
        if (params.filters.track && params.filters.track.length > 0) {
          ddConditions.push(inArray(applications.track, params.filters.track as ("foundation" | "acceleration")[]));
        }
        if (params.filters.submittedAfter) ddConditions.push(gte(applications.submittedAt, params.filters.submittedAfter));
        if (params.filters.submittedBefore) ddConditions.push(lte(applications.submittedAt, params.filters.submittedBefore));

        // Fetch applications
        const ddQualifiedData = await db.query.applications.findMany({
          where: ddConditions.length ? and(...ddConditions) : undefined,
          orderBy: [desc(applications.createdAt)],
          with: {
            business: {
              with: {
                applicant: true,
              },
            },
            eligibilityResults: true,
          },
        });

        // Apply filters and check for score >= 60%
        // IMPORTANT: Only include applications that have completed BOTH reviews
        // AND have moved past the pending review stages
        const validDDStatuses = ['scoring_phase', 'finalist', 'approved'];

        let filteredDD = ddQualifiedData.filter(app => {
          // First check status - must have completed review process
          if (!validDDStatuses.includes(app.status)) return false;

          const res = app.eligibilityResults?.[0];
          if (!res) return false;

          // Check that BOTH reviewers have scored (completed two-tier review)
          const r1 = res.reviewer1Score ? parseFloat(res.reviewer1Score) : 0;
          const r2 = res.reviewer2Score ? parseFloat(res.reviewer2Score) : 0;

          // Must have both reviewer scores to be considered DD-qualified
          if (r1 <= 0 || r2 <= 0) return false;

          const avgScore = (r1 + r2) / 2;
          return avgScore >= 60;
        });

        // Filter by county
        if (params.filters.county && params.filters.county.length > 0) {
          filteredDD = filteredDD.filter(app =>
            params.filters.county!.includes(app.business?.county || "")
          );
        }

        // Filter by track
        if (params.filters.track && params.filters.track.length > 0) {
          filteredDD = filteredDD.filter(app =>
            params.filters.track!.includes(app.track || "")
          );
        }

        data = filteredDD.map(app => {
          const eligibility = app.eligibilityResults?.[0];
          return {
            "Application ID": app.id,
            "Business Name": app.business?.name || "",
            "Applicant Name": `${app.business?.applicant?.firstName || ""} ${app.business?.applicant?.lastName || ""}`.trim(),
            "Email": app.business?.applicant?.email || "",
            "Phone": app.business?.applicant?.phoneNumber || "",
            "County": app.business?.county?.replace(/_/g, " ").toUpperCase() || "N/A",
            "Track": app.track ? app.track.charAt(0).toUpperCase() + app.track.slice(1) : "N/A",
            "Total Score": formatExportValue(eligibility?.totalScore),
            "Status": app.status.replace(/_/g, " ").toUpperCase(),
            "Submitted At": formatExportValue(app.submittedAt),
          };
        });

        fileName = `BIRE_DD_Qualified_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      case "due_diligence_queue": {
        const result = await getDDQueue();
        if (!result.success || !result.data) {
          throw new Error(result.message || "Failed to fetch DD queue");
        }

        let queueData = result.data;

        // Filter by status if provided
        if (params.filters.status && params.filters.status.length > 0) {
          queueData = queueData.filter(item =>
            params.filters.status!.includes(item.ddStatus)
          );
        }

        data = queueData.map(item => ({
          "Application ID": item.applicationId,
          "Business Name": item.businessName,
          "Aggregate Score (%)": item.aggregateScore,
          "Due Diligence Score (%)": item.ddScore !== null ? item.ddScore : "N/A",
          "Status": item.ddStatus.replace(/_/g, " ").toUpperCase(),
          "Oversight Initiated": item.isOversightInitiated ? "Yes" : "No",
          "Primary Reviewer": item.primaryReviewerName || "Unassigned",
          "Validator": item.validatorReviewerName || "Unassigned",
          "Deadline": item.approvalDeadline ? format(new Date(item.approvalDeadline), "yyyy-MM-dd HH:mm") : "N/A",
          "Score Disparity (pts)": item.scoreDisparity !== null ? item.scoreDisparity : "N/A",
        }));

        fileName = `BIRE_DD_Queue_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      case "observation_applications": {
        const result = await getObservationApplications();
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to fetch observation applications");
        }

        let obsData = result.data;

        // Filter by revisit if provided (using status filter as a proxy)
        if (params.filters.status && params.filters.status.includes("revisit")) {
          obsData = obsData.filter(item => item.markedForRevisit);
        }

        data = obsData.map(item => ({
          "Application ID": item.id,
          "Business Name": item.business.name,
          "Sector": item.business.sector?.replace(/_/g, " ") || "N/A",
          "Applicant Name": `${item.applicant.firstName} ${item.applicant.lastName}`,
          "Email": item.applicant.email,
          "Phone": item.applicant.phoneNumber,
          "Location": `${item.business.city}, ${item.business.county?.replace(/_/g, " ") || "N/A"}`,
          "Revenue (Last Year)": item.business.revenueLastYear || "N/A",
          "Employees": item.business.fullTimeEmployeesTotal ?? "N/A",
          "Submitted Date": item.submittedAt ? format(new Date(item.submittedAt), "yyyy-MM-dd") : "N/A",
          "Marked for Revisit": item.markedForRevisit ? "Yes" : "No",
        }));

        fileName = `BIRE_Observation_Applications_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;
      }

      default:
        return { success: false, error: "Invalid export type" };
    }

    if (data.length === 0) {
      return { success: false, error: "No data found matching the specified filters" };
    }

    // Format data based on requested format
    let exportDataResult: string;
    let contentType: string;
    let fileExtension: string;
    let isBase64 = false;

    switch (params.format) {
      case "csv":
        exportDataResult = stringify(data, {
          header: true,
          quoted: true,
          escape: '"',
          quote: '"'
        });
        contentType = "text/csv";
        fileExtension = "csv";
        break;

      case "json":
        exportDataResult = JSON.stringify(data, null, 2);
        contentType = "application/json";
        fileExtension = "json";
        break;

      case "xlsx": {
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Auto-size columns
        if (data.length > 0) {
          const colWidths = Object.keys(data[0]).map(key => ({
            wch: Math.max(key.length, 15)
          }));
          worksheet['!cols'] = colWidths;
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, params.type.charAt(0).toUpperCase() + params.type.slice(1));
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Convert buffer to base64 string
        exportDataResult = Buffer.from(buffer).toString('base64');
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileExtension = "xlsx";
        isBase64 = true;
        break;
      }

      default:
        return { success: false, error: "Invalid export format" };
    }

    const finalFileName = `${fileName}.${fileExtension}`;

    return {
      success: true,
      data: exportDataResult,
      fileName: finalFileName,
      contentType,
      recordCount: data.length,
      isBase64
    };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: "Failed to export data" };
  }
}
