"use client";

import { useState, useTransition } from "react";
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

export function ProfitabilityFeedbackPanel({
  canManage,
  periodLabel,
  filters,
  summary,
  productionEnabled,
  trialCompleted,
}: {
  canManage: boolean;
  periodLabel: string;
  filters: MelDashboardFilters;
  summary: ProfitabilityFeedbackSummary;
  productionEnabled: boolean;
  trialCompleted: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [trialDone, setTrialDone] = useState(trialCompleted);
  const defaultId =
    summary.enterprises.find((item) => item.hasEmail)?.businessId ??
    summary.enterprises[0]?.businessId ??
    null;
  const [businessId, setBusinessId] = useState<number | null>(defaultId);

  const canSendToOwners = productionEnabled && trialDone;

  function handleTrialSend() {
    if (!businessId) return;
    startTransition(async () => {
      const result = await sendMelProfitabilityFeedbackTrialAction({ filters, businessId });
      if (result.success) {
        setTrialDone(true);
        toast.success(result.message);
      } else toast.error(result.error);
    });
  }

  function handleBulkSend() {
    if (!canSendToOwners) return;
    const confirmed = window.confirm(
      `You are about to email ${summary.withEmailCount} enterprise owners for ${periodLabel}.\n\nHave you checked the trial email in your inbox and are you happy with the wording and numbers?`
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
        <h2 className="text-base font-semibold text-slate-900">Email owners their profitability summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          There are no matched enterprises for the filters and period you have selected. Change the
          filters above and try again.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-background p-4">
      <h2 className="text-base font-semibold text-slate-900">Email owners their profitability summary</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Owners receive a short email about their revenue, costs, and profit compared with their
        baseline for the selected reporting period.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">{summary.matchedCount}</span> enterprises will receive this
        email; <span className="font-medium">{summary.withEmailCount}</span> have an email address on
        file.
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>Choose an enterprise from the list (the numbers in the trial will be for that business).</li>
        <li>
          Click <span className="font-medium text-slate-800">Send trial to my email</span> and check
          your inbox. The subject line starts with [TRIAL].
        </li>
        <li>
          When you are satisfied, click{" "}
          <span className="font-medium text-slate-800">Send to all matched owners</span>.
        </li>
      </ol>

      {!trialDone && canManage && productionEnabled ? (
        <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Send a trial to yourself first. The button to email all owners stays unavailable until you
          do.
        </p>
      ) : null}
      {trialDone && canManage ? (
        <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          Trial sent for this reporting period. You can now email all matched owners if the trial
          looked correct.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[220px]">
          <label className="text-xs font-medium text-slate-600">Enterprise (for trial)</label>
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
            <Button variant="outline" disabled={pending || !businessId} onClick={handleTrialSend}>
              {pending ? "Sending…" : "Send trial to my email"}
            </Button>
            {productionEnabled ? (
              <Button
                className="bg-brand-blue hover:bg-brand-blue-dark"
                disabled={pending || summary.withEmailCount === 0 || !canSendToOwners}
                onClick={handleBulkSend}
              >
                Send to all matched owners
              </Button>
            ) : (
              <p className="text-sm text-slate-500 self-center">
                Owner emails are not turned on in this environment. Contact your administrator.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">You need manager access to send these emails.</p>
        )}
      </div>
    </section>
  );
}
