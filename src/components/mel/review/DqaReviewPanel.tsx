"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
import type { MelDqaIssue } from "@/db/schema";
import { acceptMelDqaIssueAction, runMelDqaAction } from "@/lib/actions/mel-review";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function DqaReviewPanel({ submissionId, issues }: { submissionId: number; issues: MelDqaIssue[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const open = issues.filter((issue) => issue.status === "open");

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-900">Data quality assurance</h2>
          <p className="mt-0.5 text-xs text-slate-500">Errors must be corrected. Warnings require a documented exception.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => {
            const result = await runMelDqaAction(submissionId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
            router.refresh();
          })}
        >
          <Play className="mr-1.5 size-3.5" /> {pending ? "Running…" : "Run DQA"}
        </Button>
      </div>
      {issues.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Run DQA to evaluate this report.</p>
      ) : (
        <ul className="divide-y">
          {issues.map((issue) => <DqaIssueRow key={issue.id} issue={issue} />)}
        </ul>
      )}
      {issues.length > 0 && open.length === 0 ? (
        <div className="flex items-center gap-2 border-t bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4" /> All recorded DQA findings are resolved or accepted.
        </div>
      ) : null}
    </section>
  );
}

function DqaIssueRow({ issue }: { issue: MelDqaIssue }) {
  const [state, action, pending] = useActionState(acceptMelDqaIssueAction, null);
  return (
    <li className="px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${issue.severity === "error" ? "text-red-600" : "text-amber-600"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-900">{issue.message}</p>
            <Badge variant="outline" className={issue.severity === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{issue.severity}</Badge>
            <Badge variant="outline">{issue.category}</Badge>
            {issue.status !== "open" ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{issue.status}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{issue.ruleCode}{issue.questionCode ? ` · ${issue.questionCode.replaceAll("_", " ")}` : ""}</p>
          {issue.resolutionReason ? <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-700">{issue.resolutionReason}</p> : null}
          {issue.severity === "warning" && issue.status === "open" ? (
            <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="issueId" value={issue.id} />
              <Input name="reason" placeholder="Why this exception is acceptable (minimum 10 characters)" minLength={10} required className="flex-1" />
              <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Saving…" : "Accept exception"}</Button>
            </form>
          ) : null}
          <ActionMessage state={state} />
        </div>
      </div>
    </li>
  );
}
