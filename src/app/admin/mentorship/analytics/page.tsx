import Link from "next/link";
import { ArrowLeft, ChartLine } from "lucide-react";
import { getMentorshipAnalytics } from "@/lib/actions/mentorship";
import { MentorshipAnalyticsDashboard } from "@/components/admin/mentorship/MentorshipAnalyticsDashboard";
import { MentorshipExportPanel } from "@/components/admin/mentorship/MentorshipExportPanel";

export default async function AdminMentorshipAnalyticsPage() {
  const analyticsRes = await getMentorshipAnalytics();

  if (!analyticsRes.success || !analyticsRes.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{analyticsRes.error ?? "Failed to load analytics"}</p>
        <Link href="/admin/mentorship" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          Back to Mentorship
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
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
              <ChartLine className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">Mentorship analytics</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Programme overview across mentors, enterprises, sessions, approvals, and mentoring hours.
          </p>
        </div>
      </div>

      <MentorshipAnalyticsDashboard data={analyticsRes.data} />
      <MentorshipExportPanel />
    </div>
  );
}
