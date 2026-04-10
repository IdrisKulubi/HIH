import Link from "next/link";
import { listBusinessesWithApplicantForAdmin } from "@/lib/actions/cna";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminCnaPage() {
  const res = await listBusinessesWithApplicantForAdmin();

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{res.error ?? "Failed to load businesses"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Capacity needs assessment (CNA)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a business to enter diagnostic scores. Top risk area and resilience index are computed on save.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {res.data.map((row) => (
            <TableRow key={row.businessId}>
              <TableCell className="font-medium">{row.businessName}</TableCell>
              <TableCell>{row.applicantName}</TableCell>
              <TableCell>{row.applicantEmail}</TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/cna/${row.businessId}`}
                  className="text-sky-700 hover:underline text-sm font-medium"
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
