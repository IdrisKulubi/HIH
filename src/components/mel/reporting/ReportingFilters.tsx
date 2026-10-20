"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pushKeepingScroll } from "@/components/mel/reporting/keep-scroll";
import type { MelReportingDataset } from "@/lib/mel/reporting-data";

const OWNER_YOUTH_FILTER_VALUE = "youth";

export function ReportingFilters({ dataset }: { dataset: MelReportingDataset }) {
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    for (const key of ["periodId", "track", "county", "sector", "ownerGender"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
      else params.delete(key);
    }
    pushKeepingScroll(router, `/admin/mel/reporting?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FilterSelect name="periodId" label="Reporting period" value={String(dataset.selectedPeriod.id)} options={dataset.periods.map((period) => ({ value: String(period.id), label: period.label }))} />
      <FilterSelect name="track" label="Track" value={dataset.filters.track ?? ""} options={dataset.filterOptions.tracks.map(option)} />
      <FilterSelect name="county" label="County" value={dataset.filters.county ?? ""} options={dataset.filterOptions.counties.map(option)} />
      <FilterSelect name="sector" label="Sector" value={dataset.filters.sector ?? ""} options={dataset.filterOptions.sectors.map(option)} />
      <FilterSelect name="ownerGender" label="Owner gender / youth" value={dataset.filters.ownerGender ?? ""} options={ownerDemographicOptions(dataset.filterOptions.ownerGenders)} />
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">Apply filters</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => pushKeepingScroll(router, "/admin/mel/reporting")}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

function option(value: string) {
  return { value, label: value.replaceAll("_", " ") };
}

function ownerDemographicOptions(values: string[]) {
  const preferred = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: OWNER_YOUTH_FILTER_VALUE, label: "Youth" },
  ];
  const extras = values
    .filter((value) => value && !preferred.some((item) => item.value === value))
    .map(ownerDemographicOption);
  return [...preferred, ...extras];
}

function ownerDemographicOption(value: string) {
  if (value === OWNER_YOUTH_FILTER_VALUE) return { value, label: "Youth" };
  if (value === "male") return { value, label: "Male" };
  if (value === "female") return { value, label: "Female" };
  return option(value);
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select name={name} defaultValue={value} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40">
        {name !== "periodId" ? <option value="">All</option> : null}
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
