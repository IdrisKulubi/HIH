import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { getMelIndicatorDetail } from "@/lib/actions/mel-admin";
import { BaselineForm, IndicatorDefinitionForm, TargetForm } from "@/components/admin/mel/IndicatorForms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MelIndicatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const indicatorId = Number(id);
  if (!Number.isInteger(indicatorId) || indicatorId < 1) notFound();

  const result = await getMelIndicatorDetail(indicatorId);
  if (!result.success || !result.data) notFound();
  const { indicator, baselines, targets, periods, canManage } = result.data;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <Link href="/admin/mel" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-blue">
          <ArrowLeft className="size-4" weight="bold" /> Back to MEL configuration
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{indicator.code} · {indicator.resultLevel.replace("_", " ")}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{indicator.name}</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">version {indicator.version}</Badge>
            <Badge variant="outline">{indicator.isActive ? "active" : "inactive"}</Badge>
          </div>
        </div>
      </div>

      {indicator.unresolvedNotes ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Decision still required</p>
          <p className="mt-1 text-sm text-amber-800">{indicator.unresolvedNotes}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Definition and calculation</CardTitle></CardHeader>
        <CardContent>
          {canManage ? <IndicatorDefinitionForm indicator={indicator} /> : (
            <div className="space-y-3 text-sm text-slate-700">
              <p>{indicator.definition ?? "No operational definition recorded."}</p>
              <p><span className="font-medium">Source:</span> {indicator.sourceType.replaceAll("_", " ")}</p>
              <p><span className="font-medium">Aggregation:</span> {indicator.aggregation.replaceAll("_", " ")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Baselines</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <ValueTable
              rows={baselines.map((baseline) => ({
                id: baseline.id,
                segment: baseline.segmentKey,
                period: baseline.periodLabel ?? "—",
                value: baseline.value ?? baseline.valueText ?? "—",
              }))}
            />
            {canManage ? <div className="border-t pt-5"><BaselineForm indicatorId={indicator.id} /></div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Targets</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <ValueTable
              rows={targets.map((target) => ({
                id: target.id,
                segment: target.segmentKey,
                period: target.reportingPeriodId ? periods.find((period) => period.id === target.reportingPeriodId)?.label ?? `Period ${target.reportingPeriodId}` : `Programme year ${target.programmeYear}`,
                value: target.value ?? target.valueText ?? "—",
              }))}
            />
            {canManage ? <div className="border-t pt-5"><TargetForm indicatorId={indicator.id} periods={periods} /></div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ValueTable({ rows }: { rows: Array<{ id: number; segment: string; period: string; value: string }> }) {
  if (rows.length === 0) return <p className="py-5 text-center text-sm text-slate-500">No values configured.</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-3 py-2">Segment</th><th className="px-3 py-2">Period</th><th className="px-3 py-2">Value</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => <tr key={row.id}><td className="px-3 py-2">{row.segment}</td><td className="px-3 py-2 text-slate-600">{row.period}</td><td className="px-3 py-2 font-medium">{row.value}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
