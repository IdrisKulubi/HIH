import Link from "next/link";
import { ChartLine, FileCheck2 } from "lucide-react";
import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import {
  listMentorsForAdmin,
  listUsersForMentorOnboarding,
} from "@/lib/actions/mentorship";
import { MentorCreateForm } from "@/components/admin/mentorship/MentorCreateForm";
import { MentorshipBusinessTable } from "@/components/admin/mentorship/MentorshipBusinessTable";
import { MentorshipMentorsTable } from "@/components/admin/mentorship/MentorshipMentorsTable";

export default async function AdminMentorshipPage() {
  const [mentorsRes, businessesRes, usersRes] = await Promise.all([
    listMentorsForAdmin(),
    listBusinessesWithApplicantForAdmin(),
    listUsersForMentorOnboarding(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mentorship</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign enterprises from the mentors list. Open a business to review six-session matches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/mentorship/approved"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <FileCheck2 className="size-4" />
            Approved sessions
          </Link>
          <Link
            href="/admin/mentorship/analytics"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <ChartLine className="size-4" />
            Analytics
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Create mentor</h2>
        <MentorCreateForm users={usersRes.success && usersRes.data ? usersRes.data : []} />
        {!usersRes.success && usersRes.error ? (
          <p className="text-sm text-destructive">{usersRes.error}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Mentors</h2>
        <p className="text-sm text-muted-foreground">
          Click a mentor or Assign, tick the enterprises they should support, then save.
        </p>
        {!mentorsRes.success || !mentorsRes.data ? (
          <p className="text-destructive text-sm">{mentorsRes.error ?? "Failed to load"}</p>
        ) : (
          <MentorshipMentorsTable
            mentors={mentorsRes.data}
            businesses={businessesRes.success && businessesRes.data ? businessesRes.data : []}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Businesses</h2>
        <p className="text-sm text-muted-foreground">
          Open Manage to review matches and session evidence for a business.
        </p>
        {!businessesRes.success || !businessesRes.data ? (
          <p className="text-destructive text-sm">{businessesRes.error ?? "Failed to load"}</p>
        ) : (
          <MentorshipBusinessTable rows={businessesRes.data} />
        )}
      </section>
    </div>
  );
}
