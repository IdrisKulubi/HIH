"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sendMelProfitabilityFeedbackBulkAction,
  sendMelProfitabilityFeedbackTrialAction,
} from "@/lib/actions/mel-profitability-feedback";
import type { MelDashboardFilters } from "@/lib/mel/reporting-data";
import type { ProfitabilityFeedbackSummary } from "@/lib/mel/notifications/dispatch-profitability-feedback";

function filtersQuery(filters: MelDashboardFilters, periodId: number): string {
  const params = new URLSearchParams({ periodId: String(periodId) });
  if (filters.track) params.set("track", filters.track);
  if (filters.county) params.set("county", filters.county);
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.ownerGender) params.set("ownerGender", filters.ownerGender);
  if (filters.panelBusinessId) params.set("panelBusinessId", String(filters.panelBusinessId));
  if (filters.panelSource) params.set("panelSource", filters.panelSource);
  return params.toString();
}

export function ProfitabilityFeedbackPanel({
  canManage,
  periodId,
  periodLabel,
  filters,
  summary,
  productionEnabled,
}: {
  canManage: boolean;
  periodId: number;
  periodLabel: string;
  filters: MelDashboardFilters;
  summary: ProfitabilityFeedbackSummary;
  productionEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const defaultId =
    summary.enterprises.find((item) => item.hasEmail)?.businessId ??
    summary.enterprises[0]?.businessId ??
    null;
  const [businessId, setBusinessId] = useState<number | null>(defaultId);

  const previewHref = useMemo(() => {
    if (!businessId) return null;
    const query = filtersQuery(filters, periodId);
    return `/admin/mel/reporting/profitability-feedback/preview?${query}&businessId=${businessId}`;
  }, [businessId, filters, periodId]);

  function handleTrialSend() {
    if (!businessId) return;
    startTransition(async () => {
      const result = await sendMelProfitabilityFeedbackTrialAction({ filters, businessId });
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  function handleBulkSend() {
    if (!productionEnabled) return;
    const confirmed = window.confirm(
      `Send profitability feedback to all ${summary.withEmailCount} matched owners with email for ${periodLabel}?`
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await sendMelProfitabilityFeedbackBulkAction(filters);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  if (summary.matchedCount === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-background p-4">
        <h2 className="text-base font-semibold text-slate-900">Profitability feedback (trial)</h2>
        <p className="mt-1 text-sm text-slate-600">
          No panel-matched enterprises for the current filters. Adjust filters or period to preview
          owner feedback emails.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-background p-4">
      <h2 className="text-base font-semibold text-slate-900">Profitability feedback (trial)</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Send panel-matched owners a profitability-only summary (revenue, costs, profit vs baseline).
        Trial on staging first: preview HTML, then send a copy to your staff email before enabling
        bulk delivery.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">{summary.matchedCount}</span> matched enterprises;{" "}
        <span className="font-medium">{summary.withEmailCount}</span> have a valid owner (applicant)
        email.
      </p>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Run <code className="text-xs bg-slate-100 px-1 rounded">npm run email:dev</code> locally to inspect the React Email template.</li>
        <li>Pick an enterprise, open Preview, then Send trial to my email.</li>
        <li>After sign-off, set <code className="text-xs bg-slate-100 px-1 rounded">MEL_PROFITABILITY_FEEDBACK_ENABLED=true</code> and use bulk send (requires RESEND_API_KEY).</li>
      </ol>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[220px]">
          <label className="text-xs font-medium text-slate-600">Enterprise</label>
          <Select
            value={businessId ? String(businessId) : undefined}
            onValueChange={(value) => setBusinessId(Number(value))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select enterprise" />
            </SelectTrigger>
            <SelectContent>
              {summary.enterprises.map((enterprise) => (
                <SelectItem key={enterprise.businessId} value={String(enterprise.businessId)}>
                  {enterprise.businessName}
                  {enterprise.hasEmail ? "" : " (no owner email)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {previewHref ? (
              <Button variant="outline" asChild>
                <Link href={previewHref} target="_blank" rel="noopener noreferrer">
                  Preview
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" disabled={pending || !businessId} onClick={handleTrialSend}>
              {pending ? "Sending…" : "Send trial to my email"}
            </Button>
            {productionEnabled ? (
              <Button
                className="bg-brand-blue hover:bg-brand-blue-dark"
                disabled={pending || summary.withEmailCount === 0}
                onClick={handleBulkSend}
              >
                Send to all matched owners
              </Button>
            ) : (
              <Button variant="secondary" disabled title="Set MEL_PROFITABILITY_FEEDBACK_ENABLED=true">
                Bulk send disabled
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">MEL manager access is required to send trial or bulk emails.</p>
        )}
      </div>
    </section>
  );
}
