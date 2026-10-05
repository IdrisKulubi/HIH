import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { listMentorshipSessionsPendingApproval } from "@/lib/actions/mentorship";
import { MentorshipSessionReviewQueue } from "@/components/admin/mentorship/MentorshipSessionReviewQueue";
import { canReviewMentorshipSessions } from "@/lib/mentorship/session-approval";

export default async function AdminMentorshipApprovalsPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin" || user?.role === "oversight") {
    redirect("/admin/mentorship/approved");
  }
  if (!user?.role || !canReviewMentorshipSessions(user.role)) {
    redirect("/");
  }

  const reviewRes = await listMentorshipSessionsPendingApproval();

  if (!reviewRes.success || !reviewRes.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{reviewRes.error ?? "Failed to load session approvals"}</p>
        <Link
          href={user.role === "bds_edo" ? "/bds/cna" : "/oversight"}
          className="mt-4 inline-block text-sm text-emerald-700 hover:underline"
        >
          Back to hub
        </Link>
      </div>
    );
  }

  const isEdo = reviewRes.data.reviewerRole === "bds_edo";
  const backHref = isEdo ? "/bds/cna" : "/oversight";
  const backLabel = isEdo ? "BDS hub" : "Approver hub";

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FileCheck2 className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">Session approvals</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {isEdo
              ? "First-stage review of logged mentorship sessions for your assigned enterprises. Approve to send to REDO, or return to the mentor with a reason."
              : "Final REDO review after EDO approval. Confirm the date and duration, give final approval, or return to the mentor with a reason."}
          </p>
        </div>
      </div>

      <MentorshipSessionReviewQueue
        rows={reviewRes.data.rows}
        reviewerRole={reviewRes.data.reviewerRole}
        showSectionHeader={false}
      />
    </div>
  );
}
