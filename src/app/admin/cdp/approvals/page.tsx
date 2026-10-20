import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { getCdpReportReviewQueue } from "@/lib/actions/cdp";
import { CdpReportReviewQueue } from "@/components/admin/cdp/CdpReportReviewQueue";

export default async function AdminCdpReportApprovalsPage() {
  const reviewRes = await getCdpReportReviewQueue();

  if (!reviewRes.success || !reviewRes.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{reviewRes.error ?? "Failed to load report approvals"}</p>
        <Link href="/admin/cdp" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          Back to CDP Work Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/cdp"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            CDP Work Queue
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FileCheck2 className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">Report approvals</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review submitted session outcomes and evidence, then approve or return each report.
          </p>
        </div>
      </div>

      <CdpReportReviewQueue rows={reviewRes.data} showSectionHeader={false} />
    </div>
  );
}
