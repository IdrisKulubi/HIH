"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { changeMelProgrammeResultStatusAction, getMelProgrammeResultWorkspace, saveMelProgrammeResultAction } from "@/lib/actions/mel-reporting";

type Workspace = NonNullable<Awaited<ReturnType<typeof getMelProgrammeResultWorkspace>>["data"]>;

export function ProgrammeResultWorkspace({ data }: { data: Workspace }) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState<Record<number, string>>({});
  function save(formData: FormData) {
    startTransition(async () => {
      const response = await saveMelProgrammeResultAction(formData);
      if (response.success) toast.success(response.message);
      else toast.error(response.error);
    });
  }
  function decide(id: number, decision: "approve" | "reopen" | "void") {
    startTransition(async () => {
      const response = await changeMelProgrammeResultStatusAction(id, decision, reason[id] ?? "");
      if (response.success) toast.success(response.message);
      else toast.error(response.error);
    });
  }
  return (
    <div className="space-y-6">
      {data.canManage ? <form action={save} className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Indicator"><select name="indicatorId" required className={control}><option value="">Select indicator</option>{data.indicators.map((indicator) => <option key={indicator.id} value={indicator.id}>{indicator.code}: {indicator.name}</option>)}</select></Field>
        <Field label="Reporting period"><select name="reportingPeriodId" required className={control}><option value="">Select period</option>{data.periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select></Field>
        <Field label="Segment key"><input name="segmentKey" defaultValue="overall" className={control} /></Field>
        <Field label="Numeric value"><input name="value" type="number" min="0" step="0.0001" className={control} /></Field>
        <Field label="Numerator"><input name="numerator" type="number" min="0" step="0.0001" className={control} /></Field>
        <Field label="Denominator"><input name="denominator" type="number" min="0" step="0.0001" className={control} /></Field>
        <Field label="Text result"><input name="valueText" className={control} /></Field>
        <Field label="Evidence URL"><input name="evidenceUrl" type="url" className={control} /></Field>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3"><span>Notes</span><textarea name="notes" rows={2} className={`${control} h-auto py-2`} /></label>
        <div className="flex items-end"><Button type="submit" disabled={pending} className="w-full">{pending ? "Saving" : "Save draft"}</Button></div>
      </form> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-background"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Indicator</th><th className="px-4 py-3">Period / segment</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Decision</th></tr></thead><tbody className="divide-y divide-slate-100">{data.results.map((item) => <tr key={item.id} className="align-top"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{item.indicator.code}</p><p className="max-w-md text-slate-600">{item.indicator.name}</p></td><td className="px-4 py-3"><p>{item.reportingPeriod.label}</p><p className="text-xs text-slate-500">{item.segmentKey}</p></td><td className="px-4 py-3 tabular-nums"><p>{item.value ?? item.valueText ?? "Ratio entry"}</p>{item.numerator !== null ? <p className="text-xs text-slate-500">{item.numerator} / {item.denominator}</p> : null}{item.evidenceUrl ? <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline">Evidence</a> : null}</td><td className="px-4 py-3"><Status status={item.status} /></td><td className="px-4 py-3">{data.canManage ? <div className="w-64 space-y-2"><input value={reason[item.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Reason for reopen or void" className={control} /><div className="flex gap-1.5">{item.status !== "approved" && item.status !== "voided" ? <Button size="sm" disabled={pending} onClick={() => decide(item.id, "approve")}>Approve</Button> : null}{item.status === "approved" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => decide(item.id, "reopen")}>Reopen</Button> : null}{item.status !== "voided" ? <Button size="sm" variant="destructive" disabled={pending} onClick={() => decide(item.id, "void")}>Void</Button> : null}</div></div> : <span className="text-xs text-slate-500">Read only</span>}</td></tr>)}</tbody></table></div>{data.results.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No programme-level results have been entered.</p> : null}</div>
    </div>
  );
}

const control = "h-10 w-full rounded-md border border-slate-300 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function Status({ status }: { status: "draft" | "approved" | "reopened" | "voided" }) { const styles = { draft: "border-slate-200 bg-slate-50 text-slate-700", approved: "border-emerald-200 bg-emerald-50 text-emerald-700", reopened: "border-amber-200 bg-amber-50 text-amber-800", voided: "border-red-200 bg-red-50 text-red-700" }; return <Badge variant="outline" className={styles[status]}>{status}</Badge>; }
