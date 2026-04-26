import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/db/drizzle";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listCnaDiagnosticsForBusiness } from "@/lib/actions/cna";
import { CnaDiagnosticForm } from "@/components/admin/cna/CnaDiagnosticForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminCnaBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: idStr } = await params;
  const businessId = Number(idStr);
  if (!Number.isFinite(businessId)) notFound();

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    with: { applicant: true },
  });
  if (!business) notFound();

  const history = await listCnaDiagnosticsForBusiness(businessId);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin/cna" className="text-sky-700 hover:underline">
              ← All businesses (CNA)
            </Link>
            <Link href={`/admin/cdp/${businessId}`} className="text-emerald-700 hover:underline font-medium">
              CDP workspace →
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">{business.name}</h1>
          <p className="text-sm text-muted-foreground">
            {business.applicant.firstName} {business.applicant.lastName} · {business.applicant.email}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">New diagnostic (A–L)</h2>
        <CnaDiagnosticForm businessId={businessId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">History</h2>
        {!history.success || !history.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {history.error ?? "No diagnostics recorded yet."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Top risk</TableHead>
                <TableHead>Resilience</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.map((d) => {
                const full = d.cnaScores?.length === 12;
                const legacy =
                  d.financialManagementScore != null &&
                  d.marketReachScore != null &&
                  d.operationsScore != null &&
                  d.complianceScore != null;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {d.conductedAt ? new Date(d.conductedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {full ? (
                        <span className="text-emerald-800">Full A–L</span>
                      ) : legacy ? (
                        <span className="text-muted-foreground">Legacy 4-dim</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs font-mono max-w-[280px] truncate"
                      title={
                        full
                          ? d.cnaScores!.map((s) => `${s.focusCode}:${s.score0to10}`).join(" · ")
                          : undefined
                      }
                    >
                      {full
                        ? d.cnaScores!.map((s) => `${s.focusCode}:${s.score0to10}`).join(" · ")
                        : legacy
                          ? `F${d.financialManagementScore}/M${d.marketReachScore}/O${d.operationsScore}/C${d.complianceScore}`
                          : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{d.topRiskArea ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.resilienceIndex ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
