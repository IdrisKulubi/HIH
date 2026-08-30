import { redirect } from "next/navigation";
import Link from "next/link";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { MentorNav } from "@/components/mentor/MentorNav";
import { MentorWorkspace } from "@/components/mentor/MentorWorkspace";
import { listMyMentorshipMatches } from "@/lib/actions/mentorship";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function MentorWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/mentor");
  }
  if (user.role !== "mentor") {
    redirect("/profile");
  }

  const res = await listMyMentorshipMatches();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Mentorship workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your assigned businesses and six-session mentorship programme. Complete notes and
              evidence for each session.
            </p>
          </div>
          <Link
            href="/mentor/analytics"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            <ChartLineUp className="size-4" weight="bold" />
            Your stats
          </Link>
        </div>
        <MentorNav />
      </div>

      {!res.success ? (
        <p className="text-sm text-destructive">{res.error ?? "Failed to load matches"}</p>
      ) : (
        <MentorWorkspace matches={res.data ?? []} />
      )}
    </div>
  );
}
