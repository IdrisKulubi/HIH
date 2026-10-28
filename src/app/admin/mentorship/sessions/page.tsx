import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { MentorshipSubmittedSessionsSearch } from "@/components/admin/mentorship/MentorshipSubmittedSessionsSearch";

export default async function AdminMentorshipSubmittedSessionsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin" && user?.role !== "oversight") {
    redirect("/");
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
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
            <RotateCcw className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold text-slate-950">Return sessions</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Search any submitted mentorship report by enterprise name, then send it back to the
          mentor so they can add evidence or correct details.
        </p>
      </div>

      <MentorshipSubmittedSessionsSearch />
    </div>
  );
}
