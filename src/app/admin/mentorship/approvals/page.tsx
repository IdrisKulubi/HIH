import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { listMentorshipSessionsPendingApproval } from "@/lib/actions/mentorship";
import { MentorshipSessionReviewQueue } from "@/components/admin/mentorship/MentorshipSessionReviewQueue";

export default async function AdminMentorshipApprovalsPage() {
  const reviewRes = await listMentorshipSessionsPendingApproval();

  if (!reviewRes.success || !reviewRes.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{reviewRes.error ?? "Failed to load session approvals"}</p>
        <Link href="/admin/mentorship" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          Back to Mentorship
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/mentorship"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Mentorship
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FileCheck2 className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">Session approvals</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review logged mentorship sessions, confirm the date and duration, then approve or return
            them to the mentor.
          </p>
        </div>
      </div>

      <MentorshipSessionReviewQueue rows={reviewRes.data} showSectionHeader={false} />
    </div>
  );
}
