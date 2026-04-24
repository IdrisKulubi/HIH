import Link from "next/link";
import { getReviewerKycQueue } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewerKycSearchControls } from "@/components/kyc/ReviewerKycSearchControls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function isTabValue(value: string | undefined): value is TabValue {
  return !!value && STATUS_TABS.some((tab) => tab.value === value);
}

type ReviewerKycQueuePageProps = {
  searchParams: Promise<{ search?: string; status?: string }>;
};

export default async function ReviewerKycQueuePage({ searchParams }: ReviewerKycQueuePageProps) {
  const params = await searchParams;
  const selectedStatus: TabValue = isTabValue(params.status) ? params.status : "all";
  const search = params.search?.trim() ?? "";

  const queue = await getReviewerKycQueue(search || undefined);

  if (!queue.success || !queue.data) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reviewer KYC</h1>
          <p className="text-sm text-slate-500">{queue.error || "Unable to load the reviewer KYC workspace."}</p>
        </div>
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

  for (const row of rows) {
    const value = row.kycStatus as TabValue;
    if (value in counts && value !== "all") {
      counts[value] += 1;
    }
  }

  const filteredRows = selectedStatus === "all" ? rows : rows.filter((row) => row.kycStatus === selectedStatus);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reviewer KYC Workspace</h1>
          <p className="text-sm text-slate-500">
            Same list as Qualified Applications (due diligence completed with a score of at least 60%). Search, upload
            the Letter of Agreement, and capture geolocation later on-site.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Find an entrepreneur by application number, business, applicant, or location.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewerKycSearchControls initialSearch={search} selectedStatus={selectedStatus} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_TABS.map((tab) => {
          const href = new URLSearchParams();
          if (tab.value !== "all") {
            href.set("status", tab.value);
          }
          if (search) {
            href.set("search", search);
          }
          const hrefString = href.toString();

          return (
            <Button key={tab.value} asChild variant={selectedStatus === tab.value ? "default" : "ghost"} size="sm" className="rounded-full">
              <Link href={hrefString ? `/reviewer/kyc?${hrefString}` : "/reviewer/kyc"}>
                <span className={cn("inline-flex items-center gap-1.5", selectedStatus !== tab.value && "text-slate-600")}>
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      selectedStatus === tab.value ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {counts[tab.value]}
                  </span>
                </span>
              </Link>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selected Enterprises</CardTitle>
          <CardDescription>
            {search
              ? `Showing results for "${search}".`
              : "Qualified Applications cohort (DD approved, ≥60% score). Agreement means a Letter of Agreement saved on this KYC record (use Save KYC Details on the enterprise page)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No KYC records matched this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.applicationId}>
                    <TableCell className="font-medium text-slate-900">#{row.applicationId}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{row.businessName}</span>
                        <span className="text-xs text-slate-500 capitalize">{row.county?.replace(/_/g, " ") || "No county"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-slate-900">{row.applicantName}</span>
                        <span className="text-xs text-slate-500">{row.applicantEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{row.track?.replace(/_/g, " ") || "Not set"}</TableCell>
                    <TableCell className="text-sm text-slate-600">{row.city}</TableCell>
                    <TableCell>
                      <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {row.kycStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={row.hasLetterOfAgreement ? "default" : "outline"}>
                          {row.hasLetterOfAgreement ? "Agreement uploaded" : "Agreement pending"}
                        </Badge>
                        <Badge variant={row.geolocationCaptured ? "default" : "outline"}>
                          {row.geolocationCaptured ? "Geo saved" : "Geo pending"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/reviewer/kyc/${row.applicationId}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        {row.kycStatus === "not_started" ? "Start" : "Open"}
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
