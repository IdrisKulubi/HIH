import { Recycle } from "@phosphor-icons/react/dist/ssr";
import type { MelWasteReportingSummary } from "@/lib/mel/reporting-data";

export function WasteRecycledSection({
  waste,
}: {
  periodLabel: string;
  periodId: number;
  waste: MelWasteReportingSummary;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-emerald-200 bg-background" aria-labelledby="waste-recycled-heading">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="waste-recycled-heading"
          className="flex items-center gap-2 text-base font-semibold text-slate-900"
        >
          <Recycle className="size-5 text-emerald-800" weight="duotone" aria-hidden />
          Total waste collected and recycled
        </h2>
        <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-right">
          {formatKg(waste.totalActualMonthlyKilograms)}
        </p>
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
