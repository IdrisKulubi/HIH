"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MelReportingDataset } from "@/lib/mel/reporting-data";

export function ReportingTrendChart({ trends }: { trends: MelReportingDataset["trends"] }) {
  if (trends.length === 0) return <p className="py-12 text-center text-sm text-slate-500">No approved trend data is available.</p>;
  return (
    <div className="h-80 w-full" role="img" aria-label="Revenue, profit, and jobs trend by reporting period">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={trends} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="money" tickFormatter={compact} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="jobs" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value, name) => name === "Jobs" ? Number(value).toLocaleString() : `KES ${Number(value).toLocaleString()}`} />
          <Legend />
          <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill="oklch(0.67 0.14 230)" radius={[3, 3, 0, 0]} />
          <Line yAxisId="money" type="monotone" dataKey="profit" name="Profit" stroke="oklch(0.52 0.14 150)" strokeWidth={2} dot={false} />
          <Line yAxisId="jobs" type="monotone" dataKey="jobs" name="Jobs" stroke="oklch(0.62 0.16 50)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function compact(value: number) {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
