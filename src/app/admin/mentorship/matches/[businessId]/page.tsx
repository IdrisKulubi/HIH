import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/db/drizzle";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listMentorsForAdmin, listMentorshipMatchesForBusiness } from "@/lib/actions/mentorship";
import { CreateMatchForm } from "@/components/admin/mentorship/CreateMatchForm";
import { CompleteSessionForm } from "@/components/admin/mentorship/CompleteSessionForm";

export default async function AdminMentorshipMatchesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: idStr } = await params;
  const businessId = Number(idStr);
  if (!Number.isFinite(businessId)) notFound();

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    with: { applicant: true },
  });
  if (!business) notFound();

  const [mentorsRes, matchesRes] = await Promise.all([
    listMentorsForAdmin(),
    listMentorshipMatchesForBusiness(businessId),
  ]);

  const mentorOptions =
    mentorsRes.success && mentorsRes.data
      ? mentorsRes.data.map((m) => ({
          id: m.id,
          userEmail: m.userEmail,
          expertiseArea: m.expertiseArea,
        }))
      : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <Link href="/admin/mentorship" className="text-sm text-sky-700 hover:underline">
          ← Mentorship
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">{business.name}</h1>
        <p className="text-sm text-muted-foreground">
          {business.applicant.firstName} {business.applicant.lastName}
        </p>
      </div>

      {!mentorsRes.success && mentorsRes.error ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
          {mentorsRes.error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">New match</h2>
        <CreateMatchForm businessId={businessId} mentors={mentorOptions} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Matches &amp; sessions</h2>
        {!matchesRes.success || !matchesRes.data ? (
          <p className="text-destructive text-sm">{matchesRes.error ?? "Failed to load matches"}</p>
        ) : matchesRes.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches yet.</p>
        ) : (
          <div className="space-y-8">
            {matchesRes.data.map((match) => (
              <div key={match.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">
                    Mentor: {match.mentor.user.email}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({match.mentor.expertiseArea})
                    </span>
                  </p>
                  <span className="text-xs uppercase text-muted-foreground">{match.status}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {match.sessions.map((s) => (
                    <div key={s.id} className="rounded-md border bg-card p-3 space-y-2">
                      <div className="text-sm font-medium">
                        #{s.sessionNumber} · {s.sessionType} · {s.status}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : "—"}
                      </p>
                      <CompleteSessionForm
                        sessionId={s.id}
                        sessionNumber={s.sessionNumber}
                        sessionType={s.sessionType}
                        status={s.status}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
