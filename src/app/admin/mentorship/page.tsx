import Link from "next/link";
import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import { listMentorsForAdmin } from "@/lib/actions/mentorship";
import { MentorCreateForm } from "@/components/admin/mentorship/MentorCreateForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminMentorshipPage() {
  const [mentorsRes, businessesRes] = await Promise.all([
    listMentorsForAdmin(),
    listBusinessesWithApplicantForAdmin(),
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
        <MentorCreateForm />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead className="text-right">Matches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessesRes.data.map((b) => (
                <TableRow key={b.businessId}>
                  <TableCell className="font-medium">{b.businessName}</TableCell>
                  <TableCell>{b.applicantName}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/mentorship/matches/${b.businessId}`}
                      className="text-sky-700 hover:underline text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
