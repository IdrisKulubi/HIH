import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CdpReportApprovalsEntry({ pendingCount }: { pendingCount: number }) {
  const hasPending = pendingCount > 0;

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        hasPending
          ? "border-amber-200 bg-amber-50/70"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg",
              hasPending ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
            )}
          >
            <FileCheck2 className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-slate-950">Report approvals</h2>
          <Badge
            className={cn(
              "rounded-full border-0 font-medium",
              hasPending
                ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
            )}
          >
            {pendingCount} pending
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-slate-600">
          {hasPending
            ? "Session reports are waiting for review. Open the approvals page to approve or return them."
            : "No session reports are waiting for review right now."}
        </p>
      </div>

      <Button
        asChild
        className={cn(
          "shrink-0",
          hasPending
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
        )}
        variant={hasPending ? "default" : "outline"}
      >
        <Link href="/admin/cdp/approvals">
          {hasPending ? "Review reports" : "Open approvals"}
          <ArrowRight className="ml-1.5 size-4" />
        </Link>
      </Button>
    </section>
  );
}
