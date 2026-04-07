import Link from "next/link";
import { getKycQueue } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function AdminKycPage() {
  const queue = await getKycQueue();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Verification Queue</h1>
        <p className="text-sm text-slate-500">Review selected enterprises, verify compliance details, and unlock the next modules.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>All current KYC records across draft, submitted, verified, and follow-up states.</CardDescription>
        </CardHeader>
        <CardContent>
          {!queue.success || !queue.data ? (
            <p className="text-sm text-slate-500">{queue.error || "Unable to load the KYC queue."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lock</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No KYC records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.data.map((item) => (
                    <TableRow key={item.applicationId}>
                      <TableCell className="font-medium text-slate-900">{item.businessName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-slate-900">{item.applicantName}</span>
                          <span className="text-xs text-slate-500">{item.applicantEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">{item.kycStatus.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.profileLockStatus.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Not submitted"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/kyc/${item.applicationId}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
