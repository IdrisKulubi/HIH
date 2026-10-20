import { redirect } from "next/navigation";
import Link from "next/link";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { MentorNav } from "@/components/mentor/MentorNav";
import { MentorAnalytics } from "@/components/mentor/MentorAnalytics";
import { listMyMentorshipMatches } from "@/lib/actions/mentorship";
import { computeMentorStats } from "@/lib/mentorship/mentor-stats";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function MentorAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/mentor/analytics");
  }
  if (user.role !== "mentor") {
    redirect("/profile");
  }

  const res = await listMyMentorshipMatches();
  const stats = computeMentorStats(res.success ? res.data ?? [] : []);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            <ChartLineUp className="size-3.5" weight="bold" />
            Mentorship
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Your stats</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            See how many of your businesses have approved sessions, and how far each enterprise has
            come through the six-session programme.
          </p>
        </div>
        <MentorNav />
      </div>

      {!res.success ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load your stats"}</p>
      ) : (
        <MentorAnalytics stats={stats} />
      )}

      <Link
        href="/mentor"
        className="inline-flex text-sm font-medium text-emerald-800 hover:underline"
      >
        Back to workspace
      </Link>
    </div>
  );
}
