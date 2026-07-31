"use client";

import { useActionState } from "react";
import {
  createMelReportingPeriodAction,
  updateMelProgrammeSettingsAction,
  updateMelReportingPeriodStatusAction,
} from "@/lib/actions/mel-admin";
import type { MelProgrammeSettings, MelReportingPeriod } from "@/db/schema";
import { ActionMessage } from "./ActionMessage";
import { ActionSubmit } from "./ActionSubmit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const fieldClass = "space-y-1.5";

export function ReportingPeriodForm() {
  const [state, action] = useActionState(createMelReportingPeriodAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor="period-label">Period label</Label>
          <Input id="period-label" name="label" placeholder="Quarter 1 — Jun to Aug 2026" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={fieldClass}>
            <Label htmlFor="programme-year">Programme year</Label>
            <Input id="programme-year" name="programmeYear" type="number" min={1} defaultValue={1} required />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="sequence">Sequence</Label>
            <Input id="sequence" name="sequence" type="number" min={1} defaultValue={1} required />
          </div>
        </div>
        <DateField id="start-date" name="startDate" label="Period starts" />
        <DateField id="end-date" name="endDate" label="Period ends" />
        <DateField id="collection-open" name="collectionOpenDate" label="Collection opens" />
        <DateField id="collection-close" name="collectionCloseDate" label="Collection closes" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <Checkbox name="allowCatchUp" defaultChecked />
        Allow a late catch-up submission while preserving its real submission time
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit idleLabel="Create reporting period" pendingLabel="Creating…" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function DateField({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <div className={fieldClass}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="date" required />
    </div>
  );
}

export function ProgrammeSettingsForm({ settings }: { settings: MelProgrammeSettings | null }) {
  const [state, action] = useActionState(updateMelProgrammeSettingsAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor="programme-name">Programme name</Label>
          <Input
            id="programme-name"
            name="programmeName"
            defaultValue={settings?.programmeName ?? "BIRE Programme"}
            required
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="timezone">Reporting timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={settings?.timezone ?? "Africa/Nairobi"} required />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="red-threshold">Red below (%)</Label>
          <Input id="red-threshold" name="redThreshold" type="number" min={0} max={100} step="0.01" defaultValue={settings?.redThreshold ?? "50"} required />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="green-threshold">Green from (%)</Label>
          <Input id="green-threshold" name="greenThreshold" type="number" min={0} max={100} step="0.01" defaultValue={settings?.greenThreshold ?? "80"} required />
        </div>
      </div>
      <div className={fieldClass}>
        <Label htmlFor="resilient-definition">Financially resilient definition</Label>
        <Textarea
          id="resilient-definition"
          name="financiallyResilientDefinition"
          defaultValue={settings?.financiallyResilientDefinition ?? ""}
          placeholder="Record the agreed programme definition once confirmed."
          rows={3}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <Checkbox
          name="includeRefugeeDisaggregation"
          defaultChecked={settings?.includeRefugeeDisaggregation ?? true}
        />
        Include refugee status in enterprise disaggregation
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit idleLabel="Save programme settings" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function PeriodStatusForm({ period }: { period: MelReportingPeriod }) {
  const [state, action] = useActionState(updateMelReportingPeriodStatusAction, null);
  const options =
    period.status === "planned"
      ? ["open", "archived"]
      : period.status === "open"
        ? ["closed"]
        : period.status === "closed"
          ? ["open", "archived"]
          : [];

  if (options.length === 0) return null;

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="periodId" value={period.id} />
      <div className="flex gap-2">
        <select
          name="status"
          className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
          aria-label={`New status for ${period.label}`}
        >
          {options.map((status) => (
            <option key={status} value={status}>
              Mark {status}
            </option>
          ))}
        </select>
        <ActionSubmit idleLabel="Update" pendingLabel="Updating…" />
      </div>
      <Input name="reason" placeholder="Reason (required when archiving)" />
      <ActionMessage state={state} />
    </form>
  );
}
