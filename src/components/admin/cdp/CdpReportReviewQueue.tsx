"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveCdpSupportSession,
  rejectCdpSupportSession,
  type CdpReportReviewRow,
} from "@/lib/actions/cdp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, ExternalLink, FileCheck2, X } from "lucide-react";
import { toast } from "sonner";

export function CdpReportReviewQueue({ rows }: { rows: CdpReportReviewRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const review = (row: CdpReportReviewRow, decision: "approve" | "reject") => {
    if (decision === "reject" && !confirm("Reject this report? The session owner can edit and resubmit it.")) {
      return;
    }

    setActiveSessionId(row.sessionId);
    startTransition(async () => {
      const result =
        decision === "approve"
          ? await approveCdpSupportSession(row.sessionId)
          : await rejectCdpSupportSession(row.sessionId);
      setActiveSessionId(null);

      if (!result.success) {
        toast.error(result.error ?? `Failed to ${decision} report`);
        return;
      }

      toast.success(decision === "approve" ? "Report approved" : "Report rejected");
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-emerald-700" />
            <h2 className="text-base font-semibold text-slate-950">Report approvals</h2>
            <Badge variant="secondary">{rows.length} pending</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submitted session outcomes and evidence before approving or returning a report.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-slate-900">No reports waiting for approval</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted session reports will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Enterprise</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Report summary</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isActive = pending && activeSessionId === row.sessionId;
                return (
                  <TableRow key={row.sessionId}>
                    <TableCell>
                      <p className="font-medium text-slate-950">{row.businessName}</p>
                      <p className="text-xs text-muted-foreground">{row.applicantName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">Session {row.sessionNumber} · {row.focusCode}</p>
                      <p className="max-w-56 truncate text-xs text-muted-foreground">{row.topic}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(row.sessionDate).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{row.submittedByName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.submittedAt).toLocaleString()}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                      {row.reportSummary}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.evidenceCount} item{row.evidenceCount === 1 ? "" : "s"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/cdp/${row.businessId}?planId=${row.planId}`}>
                            <ExternalLink className="mr-1 size-3.5" />
                            Details
                          </Link>
                        </Button>
                        {row.canReview ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => review(row, "approve")}
                              disabled={pending}
                            >
                              <Check className="mr-1 size-3.5" />
                              {isActive ? "Saving..." : "Approve"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => review(row, "reject")}
                              disabled={pending}
                            >
                              <X className="mr-1 size-3.5" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span className="self-center text-xs text-muted-foreground">
                            Another approver required
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
