import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";

export default async function MelCnaPage() {
  const res = await listBusinessesForCnaRole();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">MEL CNA reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a business and complete the impact and monitoring diagnostic questions.
        </p>
      </div>
      {!res.success || !res.data ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
      ) : (
        <AdminCnaBusinessTable rows={res.data} basePath="/mel/cna" actionLabel="Review" />
      )}
    </div>
  );
}
