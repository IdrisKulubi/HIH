"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  assignMelEnterpriseAction,
  startMelMonitoringAction,
} from "@/lib/actions/mel-monitoring";
import type { MelReportingPeriod } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";

const selectClass = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";

export function StartMonitoringForm({
  businessId,
  periods,
}: {
  businessId: number;
  periods: MelReportingPeriod[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(startMelMonitoringAction, null);

  useEffect(() => {
    if (state?.success && state.data) {
      router.push(`/admin/mel/monitoring/${state.data.businessId}/${state.data.periodId}`);
    }
  }, [router, state]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="businessId" value={businessId} />
      <div className="flex flex-wrap gap-2">
        <select name="periodId" className={`${selectClass} min-w-48`} aria-label="Reporting period" required>
          <option value="">Select period</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}{period.status === "closed" ? " (catch-up)" : ""}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending} className="bg-brand-blue hover:bg-brand-blue-dark">
          {pending ? "Opening…" : "Start or resume"}
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function AssignmentForm({
  businessId,
  collectors,
}: {
  businessId: number;
  collectors: Array<{ id: string; name: string; role: string }>;
}) {
  const [state, action, pending] = useActionState(assignMelEnterpriseAction, null);

  return (
    <form action={action} className="mt-3 space-y-2 border-t pt-3">
      <input type="hidden" name="businessId" value={businessId} />
      <div className="flex gap-2">
        <select name="collectorId" className={`${selectClass} min-w-44 flex-1`} required>
          <option value="">Assign collector</option>
          {collectors.map((collector) => (
            <option key={collector.id} value={collector.id}>
              {collector.name} ({collector.role.replace("_", " ")})
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
