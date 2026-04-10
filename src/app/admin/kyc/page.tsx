import Link from "next/link";
import { getKycQueue } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "needs_info", label: "Needs info" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

type TabValue = (typeof STATUS_TABS)[number]["value"];

function isTabValue(s: string | undefined): s is TabValue {
  return !!s && (STATUS_TABS as readonly { value: string }[]).some((t) => t.value === s);
}

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminKycPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.status;
  const selected: TabValue = isTabValue(raw) ? raw : "all";

  const queue = await getKycQueue();
  if (!queue.success || !queue.data) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Verification Queue</h1>
        <p className="text-sm text-slate-500">{queue.error || "Unable to load the KYC queue."}</p>
      </div>
    );
  }

  const rows = queue.data;
  const counts: Record<TabValue, number> = {
    all: rows.length,
    not_started: 0,
    in_progress: 0,
    submitted: 0,
    needs_info: 0,
    verified: 0,
    rejected: 0,
  };
  for (const item of rows) {
    const s = item.kycStatus as TabValue;
    if (s !== "all" && s in counts) {
      counts[s] += 1;
    }
  }

  const filtered = selected === "all" ? rows : rows.filter((item) => item.kycStatus === selected);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Verification Queue</h1>
        <p className="text-sm text-slate-500">Review selected enterprises, verify compliance details, and unlock the next modules.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.value];
          const active = selected === tab.value;
          return (
            <Button key={tab.value} asChild variant={active ? "default" : "ghost"} size="sm" className="rounded-full">
              <Link
                href={tab.value === "all" ? "/admin/kyc" : `/admin/kyc?status=${tab.value}`}
                className={cn("inline-flex items-center gap-1.5", !active && "text-slate-600")}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700",
                  )}
                >
                  {count}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {selected === "all"
              ? "All current KYC records."
              : `Showing ${selected.replace(/_/g, " ")} records only.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No KYC records in this view.</p>
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
                {filtered.map((item) => (
                  <TableRow key={item.applicationId}>
                    <TableCell className="font-medium text-slate-900">{item.businessName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-slate-900">{item.applicantName}</span>
                        <span className="text-xs text-slate-500">{item.applicantEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {item.kycStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.profileLockStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Not submitted"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/kyc/${item.applicationId}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
