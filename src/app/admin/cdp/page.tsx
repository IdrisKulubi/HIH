import Link from "next/link";
import { getCdpWorkflowRows } from "@/lib/actions/cdp";
import { CdpWorkflowQueue } from "@/components/admin/cdp/CdpWorkflowQueue";

export default async function AdminCdpIndexPage() {
  const res = await getCdpWorkflowRows();

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{res.error ?? "Failed to load CDP workflow queue"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-slate-950 p-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">CNA-driven workflow</p>
          <h1 className="mt-2 text-2xl font-semibold">CDP Work Queue</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Follow the right next step for each qualified final due diligence business: complete CNA, finalize CNA,
            generate CDP from CNA, or continue an existing CDP plan.
          </p>
        </div>
        <Link
          href="/admin/cna"
          className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Open CNA Reviews
        </Link>
      </div>
      <CdpWorkflowQueue rows={res.data} />
    </div>
  );
}
