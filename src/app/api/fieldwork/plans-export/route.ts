import { auth } from "@/auth";
import db from "@/db/drizzle";
import { fieldworkExportEvents, fieldworkPlans, userProfiles } from "@/db/schema";
import { logFieldwork } from "@/lib/fieldwork/log";
import { checkFieldworkRateLimit } from "@/lib/fieldwork/rate-limit";
import { outcomeLabel, outcomeNumber } from "@/lib/fieldwork/plan-rules";
import { isoToNairobiLocal } from "@/lib/fieldwork/time";
import { sanitizeExportRows } from "@/lib/mel/import-engine";
import { and, eq, inArray, ne, type SQL } from "drizzle-orm";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROW_CAP = 5000;
const STATUSES = ["draft", "submitted", "returned", "approved", "cancelled"] as const;
const json = (error: string, status: number) => Response.json({ error }, { status });
const stamp = (value: Date | null | undefined) => (value ? isoToNairobiLocal(value).replace("T", " ") : null);

/**
 * Export of the plans a person is allowed to see, one row per enterprise visit:
 * EDOs get their own plans, REDOs the plans routed to them (never drafts), admins everything.
 * Coordinates and report text are never included.
 */
export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !["bds_edo", "redo", "admin"].includes(user.role ?? "")) return json("You do not have access to export fieldwork plans.", 403);

  const limited = await checkFieldworkRateLimit(user.id, "plans-export", 10, 60);
  if (!limited.ok) return json(limited.message, 429);

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const statusParam = url.searchParams.get("status");
  const status = (STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as (typeof STATUSES)[number]) : null;

  const scope: (SQL | undefined)[] = [
    user.role === "bds_edo" ? eq(fieldworkPlans.createdById, user.id) : undefined,
    user.role === "redo" ? and(eq(fieldworkPlans.assignedRedoId, user.id), ne(fieldworkPlans.status, "draft")) : undefined,
    status ? eq(fieldworkPlans.status, status) : undefined,
  ];

  try {
    const plans = await db.query.fieldworkPlans.findMany({
      where: and(...scope),
      orderBy: (p, { desc }) => [desc(p.scheduledStartAt)],
      limit: 1000,
      with: {
        attachments: { columns: { fileName: true } },
        visits: {
          orderBy: (v, { asc }) => [asc(v.scheduledStartAt)],
          with: { business: { columns: { name: true, county: true, city: true } }, staff: { columns: { userId: true } }, report: { columns: { status: true } } },
        },
      },
    });

    const userIds = [...new Set(plans.flatMap((p) => [p.createdById, p.assignedRedoId ?? "", ...p.visits.flatMap((v) => v.staff.map((s) => s.userId))]).filter(Boolean))];
    const profiles = userIds.length ? await db.query.userProfiles.findMany({ where: inArray(userProfiles.userId, userIds), columns: { userId: true, firstName: true, lastName: true } }) : [];
    const nameOf = new Map(profiles.map((p) => [p.userId, `${p.firstName} ${p.lastName}`.trim()]));

    const rows = plans.flatMap((plan) => plan.visits.map((visit) => ({
      Plan_ID: plan.id, Plan: plan.title, Plan_Status: plan.status,
      EDO: nameOf.get(plan.createdById) ?? null, REDO: plan.assignedRedoId ? nameOf.get(plan.assignedRedoId) ?? null : null,
      Submitted_At: stamp(plan.submittedAt), Reviewed_At: stamp(plan.reviewedAt), Return_Reason: plan.returnReason, Cancellation_Reason: plan.cancellationReason,
      Visit_Start: stamp(visit.scheduledStartAt), Duration_Min: visit.estimatedDurationMinutes,
      Enterprise: visit.business.name, County: visit.business.county, City: visit.business.city, Agenda: visit.agenda,
      Outcomes: (visit.outcomes ?? []).map((o) => `Outcome ${outcomeNumber(o)}: ${outcomeLabel(o)}`).join("; "),
      Field_Officers: visit.staff.map((s) => nameOf.get(s.userId) ?? "").filter(Boolean).join(", "),
      Visit_Status: visit.status, Location_Verification: visit.verificationStatus, Report_Status: visit.report?.status ?? null,
      Attachments: plan.attachments.map((a) => a.fileName).join("; "),
    })));
    if (rows.length > ROW_CAP) return json(`This export has ${rows.length} rows, above the ${ROW_CAP} limit. Filter by status and try again.`, 413);

    await db.insert(fieldworkExportEvents).values({ actorId: user.id, dataset: "my_plans", format, filters: status ? { status } : {}, rowCount: rows.length, includesPreciseLocation: false });
    logFieldwork("info", "plans_export_generated", { actorId: user.id, role: user.role, rows: rows.length, format });

    const sheet = XLSX.utils.json_to_sheet(sanitizeExportRows(rows.length ? rows : [{ Notice: "You have no plans matching this filter." }]));
    const filename = `fieldwork-plans-${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === "csv") {
      return new Response(`﻿${XLSX.utils.sheet_to_csv(sheet)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Plans");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    logFieldwork("error", "plans_export_failed", { actorId: user.id, error: error instanceof Error ? error.message : String(error) });
    return json("The export could not be generated. Try again.", 500);
  }
}
