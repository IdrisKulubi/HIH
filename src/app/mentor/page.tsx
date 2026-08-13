import { redirect } from "next/navigation";
import { MentorNav } from "@/components/mentor/MentorNav";
import { MentorWorkspace } from "@/components/mentor/MentorWorkspace";
import { listMyMentorshipMatches } from "@/lib/actions/mentorship";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function MentorWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (user.role !== "mentor") {
    redirect("/profile");
  }

  const res = await listMyMentorshipMatches();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mentorship workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your assigned businesses and six-session mentorship programme. Complete notes and
            evidence for each session.
          </p>
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
