"use client";

import { useActionState } from "react";
import type { MelIndicatorDefinition, MelReportingPeriod } from "@/db/schema";
import {
  addMelIndicatorTargetAction,
  updateMelIndicatorAction,
  upsertMelIndicatorBaselineAction,
} from "@/lib/actions/mel-admin";
import { ActionMessage } from "./ActionMessage";
import { ActionSubmit } from "./ActionSubmit";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fieldClass = "space-y-1.5";
const selectClass = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function IndicatorDefinitionForm({ indicator }: { indicator: MelIndicatorDefinition }) {
  const [state, action] = useActionState(updateMelIndicatorAction, null);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="indicatorId" value={indicator.id} />
      <div className={fieldClass}>
        <Label htmlFor="indicator-name">Indicator name</Label>
        <Textarea id="indicator-name" name="name" defaultValue={indicator.name} rows={2} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor="definition">Operational definition</Label>
        <Textarea id="definition" name="definition" defaultValue={indicator.definition ?? ""} rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField name="frequency" label="Frequency" value={indicator.frequency} />
        <SelectField name="unit" label="Unit" value={indicator.unit} options={["count", "kes", "percentage", "kilograms", "status", "score"]} />
        <SelectField name="sourceType" label="Source" value={indicator.sourceType} options={["system", "quarterly_enterprise_form", "programme_mel_entry", "integration", "derived"]} />
        <SelectField name="aggregation" label="Aggregation" value={indicator.aggregation} options={["sum", "median", "count", "distinct_count", "ratio", "latest_value"]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor="numeratorDefinition">Numerator definition</Label>
          <Textarea id="numeratorDefinition" name="numeratorDefinition" defaultValue={indicator.numeratorDefinition ?? ""} rows={3} />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="denominatorDefinition">Denominator definition</Label>
          <Textarea id="denominatorDefinition" name="denominatorDefinition" defaultValue={indicator.denominatorDefinition ?? ""} rows={3} />
        </div>
      </div>
      <div className={fieldClass}>
        <Label htmlFor="unresolvedNotes">Unresolved ITT notes</Label>
        <Textarea id="unresolvedNotes" name="unresolvedNotes" defaultValue={indicator.unresolvedNotes ?? ""} rows={3} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <CheckField name="evidenceRequired" label="Evidence required" checked={indicator.evidenceRequired} />
        <CheckField name="isOneTime" label="One-time deliverable" checked={indicator.isOneTime} />
        <CheckField name="isActive" label="Active indicator" checked={indicator.isActive} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit idleLabel={`Save as version ${indicator.version + 1}`} />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function BaselineForm({ indicatorId }: { indicatorId: number }) {
  const [state, action] = useActionState(upsertMelIndicatorBaselineAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="indicatorId" value={indicatorId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="segmentKey" label="Segment key" value="overall" />
        <TextField name="periodLabel" label="Baseline period" placeholder="Programme baseline" />
        <TextField name="value" label="Numeric value" type="number" step="any" />
        <TextField name="valueText" label="Text value" placeholder="Use for status-based indicators" />
      </div>
      <TextField name="notes" label="Notes" />
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit idleLabel="Save baseline" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function TargetForm({
  indicatorId,
  periods,
}: {
  indicatorId: number;
  periods: MelReportingPeriod[];
}) {
  const [state, action] = useActionState(addMelIndicatorTargetAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="indicatorId" value={indicatorId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="programmeYear" label="Programme year" type="number" value="1" />
        <TextField name="segmentKey" label="Segment key" value="overall" />
        <div className={fieldClass}>
          <Label htmlFor="reportingPeriodId">Reporting period</Label>
          <select id="reportingPeriodId" name="reportingPeriodId" className={selectClass}>
            <option value="">Annual target</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </div>
        <TextField name="value" label="Numeric value" type="number" step="any" />
        <TextField name="valueText" label="Text value" placeholder="Use for status-based indicators" />
        <TextField name="notes" label="Notes" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit idleLabel="Add target" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  value,
  placeholder,
  type = "text",
  step,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div className={fieldClass}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value} placeholder={placeholder} type={type} step={step} />
    </div>
  );
}

function SelectField({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <div className={fieldClass}>
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={value} className={selectClass}>
        {options.map((option) => (
          <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function CheckField({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
