import Link from "next/link";
import { ArrowLeft, CheckCircle, ClockCounterClockwise, FileX, MapPin, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMelReportingDashboard } from "@/lib/actions/mel-reporting";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MelDataQualityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const periodId = Number(typeof params.periodId === "string" ? params.periodId : "") || null;
  const result = await getMelReportingDashboard({ periodId });
  if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>;
  const { quality, selectedPeriod } = result.data;
  const completion = quality.expectedReports ? (quality.approvedReports / quality.expectedReports) * 100 : 0;
  const evidenceRate = quality.activeEvidence ? (quality.verifiedEvidence / quality.activeEvidence) * 100 : 0;
  return (
    <div className="container mx-auto space-y-7 px-4 py-8">
      <header className="flex items-end justify-between gap-4">
        <div><Link href="/admin/mel/reporting" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> Reporting dashboard</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">Data-quality dashboard</h1><p className="mt-1 text-sm text-slate-600">{selectedPeriod.label}: reporting, review, DQA, evidence, and location readiness.</p></div>
        <Button variant="outline" asChild><a href={`/api/mel/exports?type=quality&format=xlsx&periodId=${selectedPeriod.id}`}>Export quality workbook</a></Button>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QualityMetric icon={CheckCircle} label="Reporting completion" value={`${completion.toFixed(1)}%`} detail={`${quality.approvedReports} approved of ${quality.expectedReports} expected`} tone={completion >= 80 ? "good" : "warning"} />
        <QualityMetric icon={ClockCounterClockwise} label="Late or catch-up" value={String(quality.lateOrCatchUp)} detail="Reports requiring timeliness context" tone={quality.lateOrCatchUp ? "warning" : "good"} />
        <QualityMetric icon={FileX} label="Returned reports" value={String(quality.returnedReports)} detail="Waiting for collector correction" tone={quality.returnedReports ? "warning" : "good"} />
        <QualityMetric icon={WarningCircle} label="Open DQA issues" value={String(quality.unresolvedDqaIssues)} detail="Unresolved automated checks" tone={quality.unresolvedDqaIssues ? "danger" : "good"} />
        <QualityMetric icon={CheckCircle} label="Evidence verified" value={`${evidenceRate.toFixed(1)}%`} detail={`${quality.verifiedEvidence} of ${quality.activeEvidence} active files`} tone={evidenceRate >= 80 ? "good" : "warning"} />
        <QualityMetric icon={MapPin} label="GPS gaps" value={String(quality.enterprisesWithoutVerifiedGps)} detail="Enterprises without verified coordinates" tone={quality.enterprisesWithoutVerifiedGps ? "warning" : "good"} />
      </section>
      <Card><CardHeader><CardTitle className="text-base">Resolution workspaces</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><WorkspaceLink href="/admin/mel/review" label="Review queue" detail="Resolve returned reports and DQA findings" /><WorkspaceLink href="/admin/mel/evidence" label="Evidence repository" detail="Verify or reject active evidence" /><WorkspaceLink href="/admin/mel/learning" label="Learning actions" detail="Track corrective and adaptive actions" /><WorkspaceLink href="/admin/mel/gis" label="GPS validation" detail="Inspect invalid or missing coordinates" /></CardContent></Card>
    </div>
  );
}

function QualityMetric({ icon: Icon, label, value, detail, tone }: { icon: React.ComponentType<{ className?: string; weight?: "duotone" }>; label: string; value: string; detail: string; tone: "good" | "warning" | "danger" }) {
  const styles = { good: "border-emerald-200 bg-emerald-50/60", warning: "border-amber-200 bg-amber-50/60", danger: "border-red-200 bg-red-50/60" };
  return <div className={`rounded-lg border p-4 ${styles[tone]}`}><div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="size-4 text-brand-blue" weight="duotone" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}
function WorkspaceLink({ href, label, detail }: { href: string; label: string; detail: string }) { return <Link href={href} className="rounded-md border border-slate-200 p-3 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></Link>; }
