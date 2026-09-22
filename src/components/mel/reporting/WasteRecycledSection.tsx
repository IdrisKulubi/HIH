import Link from "next/link";
import { ArrowSquareOut, Recycle } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import type { MelWasteReportingSummary } from "@/lib/mel/reporting-data";

export function WasteRecycledSection({
  periodLabel,
  periodId,
  waste,
}: {
  periodLabel: string;
  periodId: number;
  waste: MelWasteReportingSummary;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-emerald-200 bg-background" aria-labelledby="waste-recycled-heading">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Recycle className="size-4" weight="duotone" />
            Waste collected and recycled
          </div>
          <h2 id="waste-recycled-heading" className="mt-1 text-base font-semibold text-slate-900">
            OP3.3 · Total kg by waste stream
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
            Baseline is the monthly median kg per stream from each enterprise&apos;s earliest approved monitoring
            report (quarterly ÷ 3). Actual is total kg collected in {periodLabel} by reporting enterprises, divided
            by 3 for a monthly figure. Matches{" "}
            <span className="font-medium text-slate-800">OP3.3-WASTE-RECYCLED</span>.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {formatKg(waste.totalActualMonthlyKilograms)}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">Monthly collected waste (all streams, quarterly ÷ 3)</p>
          <p className="mt-1 text-xs text-slate-600">
            Baseline {formatKg(waste.totalBaselineKilograms)}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {waste.reportingEnterprises} enterprise{waste.reportingEnterprises === 1 ? "" : "s"} reporting waste
          </p>
          {waste.trafficLight ? (
            <div className="mt-2 flex justify-end">
              <TrafficBadge status={waste.trafficLight} />
            </div>
          ) : null}
          {waste.indicatorId ? (
            <Link
              href={`/admin/mel/reporting/indicators/${waste.indicatorId}?periodId=${periodId}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
            >
              View calculation <ArrowSquareOut className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Waste stream</th>
              <th className="px-4 py-3 text-right font-medium">Baseline monthly median (kg)</th>
              <th className="px-4 py-3 text-right font-medium">Actual monthly collected (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {waste.byStream.map((row) => (
              <tr key={row.stream} className="text-slate-800">
                <td className="px-4 py-3 font-medium capitalize text-slate-900">{row.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.baselineMonthlyMedianKilograms !== null
                    ? formatKg(row.baselineMonthlyMedianKilograms)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.actualMonthlyKilograms !== null ? formatKg(row.actualMonthlyKilograms) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50/80 text-xs text-slate-700">
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900">Total</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                {formatKg(waste.totalBaselineKilograms)}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                {formatKg(waste.totalActualMonthlyKilograms)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value)} kg`;
}

function TrafficBadge({ status }: { status: "green" | "amber" | "red" | "not_available" }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    not_available: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
