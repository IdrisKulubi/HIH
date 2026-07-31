import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { and, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import { melAuditEvents, melEvidenceReviews, melMonitoringEvidence, melProgrammeResults } from "@/db/schema";
import { requireMelViewer } from "@/lib/mel/access";
import { buildMelReportingDataset, type MelDashboardFilters } from "@/lib/mel/reporting-data";
import { getMelGisData } from "@/lib/actions/mel-reporting";
import { sanitizeExportRows } from "@/lib/mel/import-engine";
import { enforceMelRateLimit, recordMelOperationalEvent, requireMelRolloutFeature } from "@/lib/mel/operations";

const TYPES = ["itt", "monitoring", "jobs", "evidence", "quality", "programme", "gis"] as const;
type ExportType = typeof TYPES[number];

export async function GET(request: Request) {
  try {
    const actor = await requireMelViewer();
    await requireMelRolloutFeature("reporting");
    await enforceMelRateLimit(`mel-export:${actor.id}`, 20, 60);
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as ExportType | null;
    const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    if (!type || !TYPES.includes(type)) return Response.json({ error: "Unsupported MEL export type." }, { status: 400 });
    const filters: MelDashboardFilters = {
      periodId: positiveNumber(url.searchParams.get("periodId")),
      track: url.searchParams.get("track") || null,
      county: url.searchParams.get("county") || null,
      sector: url.searchParams.get("sector") || null,
    };
    const dataset = type === "gis" ? null : await buildMelReportingDataset(filters);
    const rows = sanitizeExportRows(await exportRows(type, dataset)) as Array<Record<string, string | number | boolean | null>>;
    const exportedAt = new Date();
    const metadata = {
      "Source period": dataset?.selectedPeriod.label ?? "Current verified KYC",
      "Exported at": exportedAt.toISOString(),
      "Filter summary": filterSummary(filters),
      "Trusted-data rule": "Only approved and currently valid MEL records are included.",
    };
    await db.insert(melAuditEvents).values({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "mel_export",
      entityId: `${type}:${exportedAt.toISOString()}`,
      action: type === "gis" ? "restricted_geographic_export" : "export",
      reason: `${format.toUpperCase()} ${type} export`,
      after: { filters, rowCount: rows.length },
      correlationId: randomUUID(),
    });
    const fileBase = `mel-${type}-${exportedAt.toISOString().slice(0, 10)}`;
    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName(type));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(Object.entries(metadata).map(([Field, Value]) => ({ Field, Value }))), "Export metadata");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellDates: true });
      return new Response(new Uint8Array(buffer), { headers: downloadHeaders(`${fileBase}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") });
    }
    const enriched = rows.map((row) => ({ ...row, ...metadata }));
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(enriched));
    return new Response(csv, { headers: downloadHeaders(`${fileBase}.csv`, "text/csv; charset=utf-8") });
  } catch (error) {
    console.error("MEL export failed", error);
    await recordMelOperationalEvent({ severity: "error", eventType: "export_failed", message: error instanceof Error ? error.message : "MEL export failed." });
    return Response.json({ error: error instanceof Error ? error.message : "MEL export failed." }, { status: 403 });
  }
}

async function exportRows(type: ExportType, dataset: Awaited<ReturnType<typeof buildMelReportingDataset>> | null): Promise<Array<Record<string, string | number | boolean | null>>> {
  if (type === "gis") {
    const response = await getMelGisData();
    if (!response.success || !response.data) throw new Error(response.error ?? "GIS data unavailable.");
    return response.data.points.map((point) => ({ Enterprise_ID: point.businessId, Enterprise: point.businessName, County: point.county, Sector: point.sector, Track: point.track, Latitude_Rounded: point.latitude, Longitude_Rounded: point.longitude }));
  }
  if (!dataset) return [];
  if (type === "itt") return dataset.ittRows.map((row) => ({ Result_Code: row.resultCode, Indicator_Code: row.code, Indicator: row.name, Result_Level: row.resultLevel, Unit: row.unit, Baseline: row.baseline, Target: row.target, Actual: row.calculation.actual, Numerator: row.calculation.numerator, Denominator: row.calculation.denominator, Achievement_Percentage: row.calculation.achievementPercentage, Traffic_Light: row.calculation.trafficLight, Source_Count: row.calculation.sourceCount, Indicator_Version: row.indicatorVersion, Calculation_Rule: row.calculation.calculationRule }));
  if (type === "monitoring") return dataset.approvedRecords.map((record) => ({ Submission_ID: record.submissionId, Enterprise_ID: record.businessId, Period_ID: record.periodId, Track: record.dimensions.track, County: record.dimensions.county, Sector: record.dimensions.sector, Owner_Gender: record.dimensions.ownerGender, Owner_Youth: record.dimensions.ownerYouth, Revenue_KES: record.revenue, Costs_KES: record.costs, Profit_Loss_KES: record.profitLoss, Finance_Accessed_KES: record.financeValue, New_Market_Segments: record.newMarketSegments }));
  if (type === "jobs") return dataset.approvedRecords.flatMap((record) => ([{ Submission_ID: record.submissionId, Enterprise_ID: record.businessId, Period_ID: record.periodId, Job_Type: "direct", ...jobColumns(record.directJobs) }, { Submission_ID: record.submissionId, Enterprise_ID: record.businessId, Period_ID: record.periodId, Job_Type: "indirect", ...jobColumns(record.indirectJobs) }]));
  if (type === "quality") return [{ Expected_Reports: dataset.quality.expectedReports, Approved_Reports: dataset.quality.approvedReports, Late_Or_Catch_Up: dataset.quality.lateOrCatchUp, Returned_Reports: dataset.quality.returnedReports, Open_DQA_Issues: dataset.quality.unresolvedDqaIssues, Active_Evidence: dataset.quality.activeEvidence, Verified_Evidence: dataset.quality.verifiedEvidence, Enterprises_Without_Verified_GPS: dataset.quality.enterprisesWithoutVerifiedGps }];
  if (type === "programme") {
    const entries = await db.query.melProgrammeResults.findMany({ where: and(eq(melProgrammeResults.status, "approved"), inArray(melProgrammeResults.reportingPeriodId, dataset.periods.map((period) => period.id))), with: { indicator: true, reportingPeriod: true } });
    return entries.map((entry) => ({ Entry_ID: entry.id, Indicator_Code: entry.indicator.code, Indicator: entry.indicator.name, Period: entry.reportingPeriod.label, Segment_Key: entry.segmentKey, Value: entry.value, Value_Text: entry.valueText, Numerator: entry.numerator, Denominator: entry.denominator, Approved_At: entry.approvedAt?.toISOString() ?? null }));
  }
  const submissionIds = dataset.approvedRecords.map((record) => record.submissionId);
  if (submissionIds.length === 0) return [];
  const [evidence, reviews] = await Promise.all([db.query.melMonitoringEvidence.findMany({ where: and(eq(melMonitoringEvidence.status, "active"), inArray(melMonitoringEvidence.submissionId, submissionIds)) }), db.select().from(melEvidenceReviews)]);
  return evidence.map((item) => ({ Evidence_ID: item.id, Submission_ID: item.submissionId, Question_Code: item.questionCode, File_Name: item.fileName, File_Type: item.fileType, File_Size_Bytes: item.fileSize, Review_Status: reviews.some((review) => review.evidenceId === item.id && review.status === "verified") ? "verified" : reviews.some((review) => review.evidenceId === item.id && review.status === "rejected") ? "rejected" : "pending", Uploaded_At: item.createdAt.toISOString() }));
}

function jobColumns(job: { total: number; male: number; female: number; youth: number; plwd: number; refugee: number }) { return { Total: job.total, Male: job.male, Female: job.female, Youth: job.youth, PLWD: job.plwd, Refugee: job.refugee }; }
function positiveNumber(value: string | null) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function filterSummary(filters: MelDashboardFilters) { return [`period=${filters.periodId ?? "latest"}`, `track=${filters.track ?? "all"}`, `county=${filters.county ?? "all"}`, `sector=${filters.sector ?? "all"}`].join("; "); }
function sheetName(type: ExportType) { return ({ itt: "ITT", monitoring: "Monitoring records", jobs: "Jobs", evidence: "Evidence index", quality: "Data quality", programme: "Programme results", gis: "Protected GIS" })[type]; }
function downloadHeaders(fileName: string, contentType: string) { return { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" }; }
