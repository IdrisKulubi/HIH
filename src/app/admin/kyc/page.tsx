import Link from "next/link";
import { getKycQueue } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Oversight Queue</h1>
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Oversight Queue</h1>
        <p className="text-sm text-slate-500">
          Review reviewer-entered KYC records, confirm the uploaded agreement, and inspect geolocation progress.
        </p>
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
                  <TableHead>Application</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="sticky right-0 z-20 min-w-[5.5rem] bg-white text-right shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)] dark:bg-zinc-950">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.profileId} className="group">
                    <TableCell className="font-medium text-slate-900">#{item.applicationId}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-slate-900" title={item.businessName}>
                      {item.businessName}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-slate-900" title={item.applicantName}>
                          {item.applicantName}
                        </span>
                        <span className="truncate text-xs text-slate-500" title={item.applicantEmail}>
                          {item.applicantEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.track?.replace(/_/g, " ") ?? "Not set"}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      <div className="flex flex-col">
                        <span className="capitalize">{item.county?.replace(/_/g, " ") ?? "No county"}</span>
                        <span>{item.city}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {item.kycStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={item.hasLetterOfAgreement ? "default" : "outline"}>
                          {item.hasLetterOfAgreement ? "Agreement uploaded" : "Agreement pending"}
                        </Badge>
                        <Badge variant={item.geolocationCaptured ? "default" : "outline"}>
                          {item.geolocationCaptured ? "Geo saved" : "Geo pending"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Not submitted"}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 min-w-[5.5rem] bg-white text-right shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)] group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900">
                      <Link
                        href={`/admin/kyc/${item.applicationId}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Review
                      </Link>
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
