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
          <Link href="/admin/cna" className="text-sm text-sky-700 hover:underline">
            ← All businesses
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">{business.name}</h1>
          <p className="text-sm text-muted-foreground">
            {business.applicant.firstName} {business.applicant.lastName} · {business.applicant.email}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">New diagnostic</h2>
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
                <TableHead>F / M / O / C</TableHead>
                <TableHead>Top risk</TableHead>
                <TableHead>Resilience</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {d.conductedAt
                      ? new Date(d.conductedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {d.financialManagementScore}/{d.marketReachScore}/{d.operationsScore}/
                    {d.complianceScore}
                  </TableCell>
                  <TableCell>{d.topRiskArea ?? "—"}</TableCell>
                  <TableCell>{d.resilienceIndex ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
