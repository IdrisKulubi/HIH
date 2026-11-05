import { auth } from "@/auth";
import db from "@/db/drizzle";
import { fieldworkExportEvents } from "@/db/schema";
import { EXPORT_ROW_CAP, isDataset, parseFilters, queryDataset, type Row } from "@/lib/fieldwork/admin-queries";
import { logFieldwork } from "@/lib/fieldwork/log";
import { checkFieldworkRateLimit } from "@/lib/fieldwork/rate-limit";
import { sanitizeExportRows } from "@/lib/mel/import-engine";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Admin-only export of exactly the rows the portal shows for the same filters.
 * Spreadsheet cells are neutralised against formula injection, the row count is bounded,
 * precise coordinates are opt-in and recorded, and every export is logged.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return json("Only administrators can export fieldwork data.", 403);

  const limited = await checkFieldworkRateLimit(session.user.id, "export", 10, 60);
  if (!limited.ok) return json(limited.message, 429);

  const url = new URL(request.url);
  const dataset = url.searchParams.get("dataset");
  if (!isDataset(dataset)) return json("Choose a valid dataset to export.", 400);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const includeLocation = dataset === "visits" && url.searchParams.get("includeLocation") === "1";

  try {
    const { rows, total } = await queryDataset(dataset, filters, { limit: EXPORT_ROW_CAP, includeLocation, fullText: dataset === "reports" });
    if (total > EXPORT_ROW_CAP) return json(`This export has ${total} rows, above the ${EXPORT_ROW_CAP} limit. Narrow the filters (for example a date range) and try again.`, 413);

    await db.insert(fieldworkExportEvents).values({ actorId: session.user.id, dataset, format, filters, rowCount: rows.length, includesPreciseLocation: includeLocation });
    logFieldwork("info", "export_generated", { actorId: session.user.id, dataset, format, rows: rows.length, includeLocation });

    const safe = sanitizeExportRows(rows.length ? (rows as Row[]) : [{ Notice: "No records matched the selected filters." }]);
    const sheet = XLSX.utils.json_to_sheet(safe);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `fieldwork-${dataset}-${stamp}.${format}`;

    if (format === "csv") {
      return new Response(`﻿${XLSX.utils.sheet_to_csv(sheet)}`, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
      });
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, dataset.slice(0, 31));
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
    });
  } catch (error) {
    logFieldwork("error", "export_failed", { dataset, error: error instanceof Error ? error.message : String(error) });
    return json("The export could not be generated. Try again or narrow the filters.", 500);
  }
}
