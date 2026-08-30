import { auth } from "@/auth";
import {
  applyMentorshipExportDateFilter,
  buildMentorshipCsv,
  buildMentorshipWorkbook,
  loadMentorshipExportData,
  parseMentorshipExportTypes,
} from "@/lib/mentorship/export";
import { MENTORSHIP_EXPORT_TYPES } from "@/lib/mentorship/export-config";
import {
  mentorshipExportRangeLabel,
  parseMentorshipExportDateParams,
} from "@/lib/mentorship/export-date-range";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function downloadHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const types = parseMentorshipExportTypes(url.searchParams);
    if (types.length === 0) {
      return Response.json(
        { error: `Select at least one export type: ${MENTORSHIP_EXPORT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const dateRange = parseMentorshipExportDateParams(url.searchParams);
    if (!dateRange.ok) {
      return Response.json({ error: dateRange.error }, { status: 400 });
    }

    const data = applyMentorshipExportDateFilter(
      await loadMentorshipExportData(),
      dateRange.from,
      dateRange.to
    );
    const exportedAt = new Date();
    const periodLabel = mentorshipExportRangeLabel(dateRange.from, dateRange.to);
    const metadata = {
      "Exported at": exportedAt.toISOString(),
      "Exported by": session.user.email ?? session.user.id,
      Period: periodLabel,
      "Period from": dateRange.from ?? "All time",
      "Period to": dateRange.to ?? "Present",
      Sections: types.join(", "),
    };
    const fileBase = dateRange.from || dateRange.to
      ? `mentorship-export-${dateRange.from ?? "start"}-to-${dateRange.to ?? exportedAt.toISOString().slice(0, 10)}`
      : `mentorship-export-${exportedAt.toISOString().slice(0, 10)}`;

    if (format === "xlsx") {
      const buffer = buildMentorshipWorkbook(types, data, metadata);
      return new Response(new Uint8Array(buffer), {
        headers: downloadHeaders(
          `${fileBase}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
      });
    }

    const csv = buildMentorshipCsv(types, data, metadata);
    return new Response(csv, {
      headers: downloadHeaders(`${fileBase}.csv`, "text/csv; charset=utf-8"),
    });
  } catch (error) {
    console.error("Mentorship export failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Mentorship export failed." },
      { status: 500 }
    );
  }
}
