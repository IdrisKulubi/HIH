import { AdminCnaBusinessTable } from "@/components/admin/cna/AdminCnaBusinessTable";
import { MelOfficerHub } from "@/components/mel/MelOfficerHub";
import { listBusinessesForCnaRole } from "@/lib/actions/role-cna";
import { countMelReviewPendingForMel } from "@/lib/mel/hub-counts";
import Link from "next/link";

export default async function MelCnaPage() {
  const [res, melReviewPending] = await Promise.all([
    listBusinessesForCnaRole(),
    countMelReviewPendingForMel(),
  ]);

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <MelOfficerHub summary={{ melReviewPending }} />

      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">CNA reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a business and complete the impact and monitoring diagnostic questions.
            </p>
          </div>
          <Link href="/admin/cdp" className="rounded-md border px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
            Open CDP work queue
          </Link>
        </div>
        {!res.success || !res.data ? (
          <p className="text-sm text-destructive">{res.error ?? "Failed to load businesses"}</p>
        ) : (
          <AdminCnaBusinessTable rows={res.data} basePath="/mel/cna" actionLabel="Review" />
        )}
      </section>
    </div>
  );
}
