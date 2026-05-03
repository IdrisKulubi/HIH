import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/db/drizzle";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listCnaDiagnosticsForBusiness } from "@/lib/actions/cna";
import { getAdminCnaBusinessOverview } from "@/lib/actions/role-cna";
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
  const roleBased = await getAdminCnaBusinessOverview(businessId);

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
        <h2 className="text-lg font-medium">Role-based CNA result</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/mentor/cna/${businessId}`}
            className="rounded-md border px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50"
          >
            Submit Mentor review
          </Link>
          <Link
            href={`/bds/cna/${businessId}`}
            className="rounded-md border px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50"
          >
            Submit BDS / EDO review
          </Link>
          <Link
            href={`/investment/cna/${businessId}`}
            className="rounded-md border px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50"
          >
            Submit Investment review
          </Link>
          <Link
            href={`/mel/cna/${businessId}`}
            className="rounded-md border px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50"
          >
            Submit MEL review
          </Link>
        </div>
        {!roleBased.success ? (
          <p className="text-sm text-destructive">{roleBased.error}</p>
        ) : !roleBased.data?.assessment ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No role-based CNA has started for this business yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Overall score</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {roleBased.data.result?.overallScore ?? 0}%
              </p>
              <div className="mt-4 space-y-2">
                {roleBased.data.result?.roleCompletions.map((r) => (
                  <div key={r.role} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{r.role.replace(/_/g, " ")}</span>
                    <span className={r.isComplete ? "text-emerald-700" : "text-amber-700"}>
                      {r.answeredQuestions}/{r.totalQuestions}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Answered</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleBased.data.result?.sections.map((s) => (
                    <TableRow key={s.sectionCode}>
                      <TableCell className="font-medium">
                        {s.sectionCode}. {s.sectionName}
                      </TableCell>
                      <TableCell>
                        {s.answeredQuestions}/{s.totalQuestions}
                      </TableCell>
                      <TableCell>{s.sectionScore}%</TableCell>
                      <TableCell className="capitalize">{s.priorityLevel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Legacy diagnostic (A-L)</h2>
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
