import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { MentorNav } from "@/components/mentor/MentorNav";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";

export default async function MentorCnaPage() {
  const res = await listBusinessesForCnaRole();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">TA CNA reviews</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a business and complete only the TA diagnostic questions.
            </p>
          </div>
        </div>
        <MentorNav />
      </div>
      {!res.success || !res.data ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
      ) : (
        <AdminCnaBusinessTable rows={res.data} basePath="/mentor/cna" actionLabel="Review" />
      )}
    </div>
  );
}
