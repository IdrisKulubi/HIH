import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
  countMentorshipSessionsPendingApproval,
  listApprovedMentorshipSessions,
} from "@/lib/actions/mentorship";
import { MentorshipApprovedSessionsOverview } from "@/components/admin/mentorship/MentorshipApprovedSessionsOverview";

export default async function AdminMentorshipApprovedSessionsPage() {
  const user = await getCurrentUser();
  if (user?.role === "redo") {
    redirect("/admin/mentorship/approvals");
  }
  if (user?.role !== "admin" && user?.role !== "oversight") {
    redirect("/");
  }

  const [approvedRes, pendingRes] = await Promise.all([
    listApprovedMentorshipSessions(),
    countMentorshipSessionsPendingApproval(),
  ]);

  if (!approvedRes.success || !approvedRes.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{approvedRes.error ?? "Failed to load approved sessions"}</p>
        <Link href="/admin/mentorship" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          Back to Mentorship
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
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
          <h1 className="text-2xl font-semibold text-slate-950">Approved sessions</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Programme view of sessions REDO has signed off, including who approved each one and when.
        </p>
      </div>

      <MentorshipApprovedSessionsOverview
        rows={approvedRes.data}
        pendingCount={pendingRes.success ? pendingRes.data ?? 0 : 0}
      />
    </div>
  );
}
