import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";

export default async function AdminCnaPage() {
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
        <h1 className="text-2xl font-semibold text-slate-900">Capacity needs assessment (CNA)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a business to enter diagnostic scores. Top risk area and resilience index are computed on save.
        </p>
      </div>
      <AdminCnaBusinessTable rows={res.data} />
    </div>
  );
}
