import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getMelMonitoringDetail } from "@/lib/actions/mel-monitoring";
import { QuarterlyMonitoringForm } from "@/components/mel/monitoring/QuarterlyMonitoringForm";
import { Badge } from "@/components/ui/badge";

export default async function QuarterlyMonitoringPage({
  params,
}: {
  params: Promise<{ businessId: string; periodId: string }>;
}) {
  const resolved = await params;
  const businessId = Number(resolved.businessId);
  const periodId = Number(resolved.periodId);
  if (!Number.isInteger(businessId) || !Number.isInteger(periodId)) notFound();

  const result = await getMelMonitoringDetail(businessId, periodId);
  if (!result.success || !result.data) notFound();
  const detail = result.data;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <Link href="/admin/mel/monitoring" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-blue">
          <ArrowLeft className="size-4" weight="bold" /> Monitoring workspace
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{detail.period.label}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{detail.profile.businessName}</h1>
            <p className="mt-1 text-sm text-slate-600">Quarterly enterprise monitoring report</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{detail.submission.status}</Badge>
            <Badge variant="outline">version {detail.submission.submissionVersion}</Badge>
            {detail.submission.sourceMode === "catch_up" ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">catch-up</Badge>
            ) : null}
          </div>
        </div>
      </div>
      <QuarterlyMonitoringForm detail={detail} />
    </div>
  );
}
