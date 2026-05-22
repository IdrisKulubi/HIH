import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";
import Link from "next/link";

export default async function BdsCnaPage() {
  const res = await listBusinessesForCnaRole();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">BA / EDO CNA reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a business and complete only the BA / EDO diagnostic questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/cdp" className="rounded-md border px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
            Open CDP work queue
          </Link>
          <Link href="/a2f" className="rounded-md border px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50">
            Open A2F portal
          </Link>
        </div>
      </div>
      {!res.success || !res.data ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
      ) : (
        <AdminCnaBusinessTable rows={res.data} basePath="/bds/cna" actionLabel="Review" />
      )}
    </div>
  );
}
