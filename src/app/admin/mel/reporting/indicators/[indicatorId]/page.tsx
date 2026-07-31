import Link from "next/link";
import { ArrowLeft, Database, Function, Info } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMelReportingDashboard } from "@/lib/actions/mel-reporting";

export default async function IndicatorLineagePage({ params, searchParams }: {
  params: Promise<{ indicatorId: string }>;
  searchParams: Promise<{ periodId?: string }>;
}) {
  const [{ indicatorId }, query] = await Promise.all([params, searchParams]);
  const result = await getMelReportingDashboard({ periodId: Number(query.periodId) || null });
  const row = result.success ? result.data?.ittRows.find((item) => item.indicatorId === Number(indicatorId)) : null;
  if (!row || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">Indicator lineage is unavailable.</p>;
  const calculation = row.calculation;
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <Link href={`/admin/mel/reporting?periodId=${result.data.selectedPeriod.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> ITT dashboard</Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{row.code}: calculation lineage</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{row.name}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Fact icon={Function} label="Calculation rule" value={calculation.calculationRule} />
        <Fact icon={Database} label="Contributing sources" value={`${calculation.sourceCount} trusted records`} />
        <Fact icon={Info} label="Definition version" value={`Indicator v${row.indicatorVersion}, calculation v1`} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Calculation inputs</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Value label="Baseline" value={format(row.baseline)} /><Value label="Target" value={format(row.target)} />
            <Value label="Numerator" value={format(calculation.numerator)} /><Value label="Denominator" value={format(calculation.denominator)} />
            <Value label="Actual" value={format(calculation.actual)} /><Value label="Achievement" value={calculation.achievementPercentage === null ? "Not available" : `${calculation.achievementPercentage.toFixed(2)}%`} />
            <Value label="Traffic light" value={calculation.trafficLight.replaceAll("_", " ")} /><Value label="Calculation status" value={row.calculatedAt ? `Stored ${row.calculatedAt.toLocaleDateString("en-KE")}` : "Preview only"} />
          </dl>
        </CardContent>
      </Card>
      <section className="grid gap-5 lg:grid-cols-3">
        <SourceList title="Approved monitoring submissions" items={calculation.sourceSubmissionIds.map((id) => ({ id, href: `/admin/mel/review/${id}`, label: `Submission ${id}` }))} />
        <SourceList title="Approved programme entries" items={calculation.sourceProgrammeResultIds.map((id) => ({ id, href: "/admin/mel/programme-results", label: `Programme result ${id}` }))} />
        <SourceList title="Validated system records" items={calculation.sourceSystemIds.map((id) => ({ id, href: "/admin/mel/reporting", label: `System record ${id}` }))} />
      </section>
      {calculation.exclusions.length ? <Card><CardHeader><CardTitle className="text-base">Exclusions and missing-data notes</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-amber-800">{calculation.exclusions.map((note) => <li key={note}>{note}</li>)}</ul></CardContent></Card> : null}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; weight?: "duotone" }>; label: string; value: string }) { return <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4"><Icon className="size-5 text-brand-blue" weight="duotone" /><p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>; }
function Value({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{value}</dd></div>; }
function SourceList({ title, items }: { title: string; items: Array<{ id: number; href: string; label: string }> }) { return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{items.length ? <ul className="grid gap-2">{items.map((item) => <li key={item.id}><Link href={item.href} className="block rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/5">{item.label}</Link></li>)}</ul> : <p className="text-sm text-slate-500">No source records contributed.</p>}</CardContent></Card>; }
function format(value: number | null) { return value === null ? "Not available" : new Intl.NumberFormat("en-KE", { maximumFractionDigits: 4 }).format(value); }
