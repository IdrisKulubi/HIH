import Link from "next/link";
import { getCdpReportReviewQueue, getCdpWorkflowRows } from "@/lib/actions/cdp";
import { CdpWorkflowQueue } from "@/components/admin/cdp/CdpWorkflowQueue";
import { CdpReportApprovalsEntry } from "@/components/admin/cdp/CdpReportApprovalsEntry";

export default async function AdminCdpIndexPage() {
  const [res, reviewRes] = await Promise.all([
    getCdpWorkflowRows(),
    getCdpReportReviewQueue(),
  ]);

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{res.error ?? "Failed to load CDP workflow queue"}</p>
      </div>
    );
  }

  const pendingReports =
    reviewRes.success && reviewRes.data ? reviewRes.data.length : 0;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 rounded-xl border bg-slate-950 p-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">CNA-driven workflow</p>
          <h1 className="mt-2 text-2xl font-semibold">CDP Work Queue</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Follow the right next step for each qualified final due diligence business: complete CNA, finalize CNA,
            generate CDP from CNA, or continue an existing CDP plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/cdp/approvals"
            className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/15 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
          >
            Report approvals{pendingReports > 0 ? ` (${pendingReports})` : ""}
          </Link>
          <Link
            href="/admin/cna"
            className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Open CNA Reviews
          </Link>
        </div>
      </div>

      {reviewRes.success && reviewRes.data ? (
        <CdpReportApprovalsEntry pendingCount={pendingReports} />
      ) : null}

      <CdpWorkflowQueue rows={res.data} />
    </div>
  );
}
