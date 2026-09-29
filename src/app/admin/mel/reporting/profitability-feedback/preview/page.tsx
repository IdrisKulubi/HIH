import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireMelViewer } from "@/lib/mel/access";
import { requireMelRolloutFeature } from "@/lib/mel/operations";
import { renderProfitabilityFeedbackEmailHtml } from "@/lib/mel/notifications/dispatch-profitability-feedback";
import type { MelDashboardFilters } from "@/lib/mel/reporting-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfitabilityFeedbackPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireMelViewer();
  await requireMelRolloutFeature("reporting");

  const params = await searchParams;
  const businessId = positiveNumber(params.businessId);
  if (!businessId) {
    return <PreviewError message="Missing businessId query parameter." />;
  }

  const filters: MelDashboardFilters = {
    periodId: positiveNumber(params.periodId),
    track: scalar(params.track),
    county: scalar(params.county),
    sector: scalar(params.sector),
    ownerGender: scalar(params.ownerGender),
    panelBusinessId: positiveNumber(params.panelBusinessId),
    panelSource: params.panelSource === "system" ? "system" : "workbook",
  };

  const rendered = await renderProfitabilityFeedbackEmailHtml({
    filters,
    businessId,
    trialNote: null,
  });

  if ("error" in rendered) {
    return <PreviewError message={rendered.error} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b bg-white px-4 py-3">
        <Link
          href="/admin/mel/reporting"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to reporting
        </Link>
        <p className="mt-1 text-xs text-slate-500">Staff-only HTML preview — enterprise {businessId}</p>
      </div>
      <iframe
        title="Profitability feedback email preview"
        className="w-full min-h-[calc(100vh-4rem)] border-0 bg-white"
        srcDoc={rendered.html}
      />
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <p className="text-sm text-red-700">{message}</p>
      <Link href="/admin/mel/reporting" className="mt-4 inline-block text-sm text-brand-blue hover:underline">
        Back to reporting
      </Link>
    </div>
  );
}

function scalar(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

function positiveNumber(value: string | string[] | undefined): number | null {
  const raw = scalar(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
