import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import { listMentorsForAdmin, listUsersForMentorOnboarding } from "@/lib/actions/mentorship";
import { MentorCreateForm } from "@/components/admin/mentorship/MentorCreateForm";
import { MentorshipBusinessTable } from "@/components/admin/mentorship/MentorshipBusinessTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminMentorshipPage() {
  const [mentorsRes, businessesRes, usersRes] = await Promise.all([
    listMentorsForAdmin(),
    listBusinessesWithApplicantForAdmin(),
    listUsersForMentorOnboarding(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mentorship</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register mentors, then open a business to create a six-session match (sessions 1 &amp; 6 physical, 2–5 virtual).
        </p>
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
        {!mentorsRes.success || !mentorsRes.data ? (
          <p className="text-destructive text-sm">{mentorsRes.error ?? "Failed to load"}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentorsRes.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.userEmail}</TableCell>
                  <TableCell>{m.userName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.expertiseArea}</TableCell>
                  <TableCell>{m.isActive ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Businesses</h2>
        {!businessesRes.success || !businessesRes.data ? (
          <p className="text-destructive text-sm">{businessesRes.error ?? "Failed to load"}</p>
        ) : (
          <MentorshipBusinessTable rows={businessesRes.data} />
        )}
      </section>
    </div>
  );
}
