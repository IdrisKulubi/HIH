import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ENTERPRISE_EXPORT_SECTIONS } from "@/lib/mel/enterprise-export-config";

export function EnterpriseExportPanel({ businessId, today }: { businessId: number; today: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="enterprise-export-heading">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <h2 id="enterprise-export-heading" className="text-base font-semibold text-slate-900">Export enterprise data</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Download reports last saved in the selected period. Excel creates a separate worksheet for every selected section; CSV creates one field-level table.</p>
      </div>
      <form action="/api/mel/enterprise-export" method="get" className="space-y-5 p-4 sm:p-5">
        <input type="hidden" name="businessId" value={businessId} />
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Date reports were last saved</legend>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>From</span>
              <input type="date" name="from" defaultValue={today} required className="block h-10 rounded-md border border-input bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>To</span>
              <input type="date" name="to" defaultValue={today} required className="block h-10 rounded-md border border-input bg-background px-3 text-sm" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Data to include</legend>
          <p className="mt-1 text-xs text-slate-600">Untick any section the manager does not need.</p>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTERPRISE_EXPORT_SECTIONS.map((section) => (
              <label key={section.key} className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" name="section" value={section.key} defaultChecked className="mt-0.5 size-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" />
                <span><span className="font-medium text-slate-900">{section.label}</span><span className="mt-0.5 block text-xs leading-4 text-slate-600">{section.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Button type="submit" name="format" value="xlsx" className="bg-brand-blue hover:bg-brand-blue-dark"><DownloadSimple className="size-4" />Download Excel</Button>
          <Button type="submit" name="format" value="csv" variant="outline"><DownloadSimple className="size-4" />Download CSV</Button>
        </div>
      </form>
    </section>
  );
}
