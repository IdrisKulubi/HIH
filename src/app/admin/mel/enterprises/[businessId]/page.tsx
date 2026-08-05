import Link from "next/link";
import { ArrowLeft, Briefcase, ChartLineUp, FileText, Lightbulb } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMelEnterpriseDashboard } from "@/lib/actions/mel-reporting";
import { EnterpriseExportPanel } from "@/components/mel/reporting/EnterpriseExportPanel";

export default async function MelEnterpriseDashboardPage({ params }: { params: Promise<{ businessId: string }> }) {
  const result = await getMelEnterpriseDashboard(Number((await params).businessId));
  if (!result.success || !result.data) return <p className="container mx-auto px-4 py-12 text-sm text-red-700">{result.error}</p>;
  const business = result.data;
  const approved = business.melMonitoringSubmissions.filter((submission) => submission.status === "approved");
  const directJobs = approved.flatMap((submission) => submission.jobs).filter((job) => job.jobType === "direct").reduce((sum, job) => sum + (job.quarterlyTotal ?? 0), 0);
  const indirectJobs = approved.flatMap((submission) => submission.jobs).filter((job) => job.jobType === "indirect").reduce((sum, job) => sum + (job.quarterlyTotal ?? 0), 0);
  const activeEvidence = approved.flatMap((submission) => submission.evidence).filter((item) => item.status === "active").length;
  const openActions = business.melLearningActions.filter((action) => action.status === "open" || action.status === "in_progress");
  const baseline = business.financialBaseline;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return <div className="container mx-auto space-y-7 px-4 py-8">
    <header><Link href="/admin/mel/reporting" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"><ArrowLeft className="size-4" /> Reporting dashboard</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{business.name}</h1><Badge variant="outline">{business.application?.track ?? "track unavailable"}</Badge></div><p className="mt-1 text-sm text-slate-600">{business.county ?? "County unavailable"} · {business.sector.replaceAll("_", " ")} · {business.applicant.firstName} {business.applicant.lastName}</p></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={FileText} label="Approved periods" value={approved.length} detail={`${business.melMonitoringSubmissions.length} total submissions`} /><Metric icon={Briefcase} label="Cumulative jobs" value={directJobs + indirectJobs} detail={`${directJobs} direct, ${indirectJobs} indirect`} /><Metric icon={ChartLineUp} label="Active evidence" value={activeEvidence} detail="Across approved reports" /><Metric icon={Lightbulb} label="Open learning actions" value={openActions.length} detail="Requires follow-up" /></section>
    {business.canManage ? <EnterpriseExportPanel businessId={business.id} today={today} /> : null}
    {baseline ? <Card><CardHeader><CardTitle className="text-base">Opening financial baseline · {baseline.effectiveDate}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><BaselineMetric label="Monthly revenue" value={baseline.monthlyRevenue} /><BaselineMetric label="Monthly costs" value={baseline.monthlyCosts} /><BaselineMetric label="Monthly profit/loss" value={baseline.monthlyProfit} /></div></CardContent></Card> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No active individual financial baseline is available for this enterprise.</div>}
    <Card><CardHeader><CardTitle className="text-base">Progressive quarterly financial history</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Period</th><th className="pb-3">Status</th><th className="pb-3">Monthly revenue</th><th className="pb-3">Monthly costs</th><th className="pb-3">Monthly profit/loss</th><th className="pb-3">Profit vs baseline</th><th className="pb-3">Explanation</th></tr></thead><tbody className="divide-y divide-slate-100">{business.melMonitoringSubmissions.map((submission) => { const response = submission.response; const monthlyProfit = response?.profitLoss == null ? null : Number(response.profitLoss) / 3; const variance = baseline && monthlyProfit !== null ? monthlyProfit - Number(baseline.monthlyProfit) : null; return <tr key={submission.id}><td className="py-3"><Link href={`/admin/mel/review/${submission.id}`} className="font-medium text-brand-blue hover:underline">{submission.reportingPeriod.label}</Link></td><td className="py-3">{submission.status.replaceAll("_", " ")}</td><td className="py-3 tabular-nums">{monthlyMoney(response?.revenue)}</td><td className="py-3 tabular-nums">{monthlyMoney(response?.costs)}</td><td className="py-3 tabular-nums">{monthlyProfit === null ? "Not reported" : money(monthlyProfit)}</td><td className={`py-3 tabular-nums ${variance !== null && variance < 0 ? "text-red-700" : "text-emerald-700"}`}>{variance === null ? "Unavailable" : money(variance)}</td><td className="max-w-xs py-3 text-xs text-slate-600">{response?.financialChangeExplanation ?? "No alert explanation required"}</td></tr>; })}</tbody></table></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Learning and follow-up</CardTitle></CardHeader><CardContent>{openActions.length ? <ul className="space-y-3">{openActions.map((action) => <li key={action.id} className="rounded-md border border-slate-200 p-3"><p className="font-medium text-slate-900">{action.agreedAction}</p><p className="mt-1 text-xs text-slate-500">{action.status.replaceAll("_", " ")}{action.dueDate ? ` · due ${action.dueDate}` : ""}</p></li>)}</ul> : <p className="text-sm text-slate-500">No open learning actions.</p>}</CardContent></Card>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string; weight?: "duotone" }>; label: string; value: number; detail: string }) { return <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4"><div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="size-4 text-brand-blue" weight="duotone" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>; }
function money(value: string | number | null | undefined) { return value == null ? "Not reported" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value)); }
function monthlyMoney(value: string | null | undefined) { return value == null ? "Not reported" : money(Number(value) / 3); }
function BaselineMetric({ label, value }: { label: string; value: string | null }) { return <div className="rounded-md bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-lg font-semibold tabular-nums ${Number(value) < 0 ? "text-red-700" : "text-slate-900"}`}>{money(value)}</p></div>; }
