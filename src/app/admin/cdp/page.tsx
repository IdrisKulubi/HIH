import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";

export default async function AdminCdpIndexPage() {
  const res = await listBusinessesWithApplicantForAdmin();

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{res.error ?? "Failed to load businesses"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Capacity Development Plan (CDP)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          BIRE template: diagnostic summary (A–L), detailed activities, support session log, and quarterly
          progress. Select a business to open or create a plan. Quick CNA scores remain under{" "}
          <a href="/admin/cna" className="text-sky-700 underline">
            CNA
          </a>
          .
        </p>
      </div>
      <AdminCnaBusinessTable rows={res.data} basePath="/admin/cdp" actionLabel="CDP" />
    </div>
  );
}
