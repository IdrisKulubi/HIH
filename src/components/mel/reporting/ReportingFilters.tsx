import { Button } from "@/components/ui/button";
import type { MelReportingDataset } from "@/lib/mel/reporting-data";

export function ReportingFilters({ dataset }: { dataset: MelReportingDataset }) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <FilterSelect name="periodId" label="Reporting period" value={String(dataset.selectedPeriod.id)} options={dataset.periods.map((period) => ({ value: String(period.id), label: period.label }))} />
      <FilterSelect name="track" label="Track" value={dataset.filters.track ?? ""} options={dataset.filterOptions.tracks.map(option)} />
      <FilterSelect name="county" label="County" value={dataset.filters.county ?? ""} options={dataset.filterOptions.counties.map(option)} />
      <FilterSelect name="sector" label="Sector" value={dataset.filters.sector ?? ""} options={dataset.filterOptions.sectors.map(option)} />
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">Apply filters</Button>
        <Button type="button" variant="outline" asChild><a href="/admin/mel/reporting">Reset</a></Button>
      </div>
    </form>
  );
}

function option(value: string) {
  return { value, label: value.replaceAll("_", " ") };
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
