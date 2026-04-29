import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";

export default async function InvestmentCnaPage() {
  const res = await listBusinessesForCnaRole();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Investment analyst CNA reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a business and complete only the investment readiness and finance diagnostic questions.
        </p>
      </div>
      {!res.success || !res.data ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
      ) : (
        <AdminCnaBusinessTable rows={res.data} basePath="/investment/cna" actionLabel="Review" />
      )}
    </div>
  );
}
