"use client";

import { useActionState, useState } from "react";
import type { MelReviewDetail } from "@/lib/actions/mel-review";
import { decideMelReviewAction, reassignMelRedoReviewerAction } from "@/lib/actions/mel-review";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const CORRECTION_AREAS = [
  "visit_profile", "capacity", "profitability", "jobs", "market_innovation",
  "financial_linkages", "green_growth", "partnerships", "feedback", "evidence",
] as const;

export function ReviewDecisionPanel({ detail }: { detail: MelReviewDetail }) {
  const [state, action, pending] = useActionState(decideMelReviewAction, null);
  const [selected, setSelected] = useState<string[]>([]);
  const status = detail.submission.status;
  const administrative = status === "approved";
  if (administrative && !detail.reviewer.canAdminister) {
    return <p className="text-sm text-slate-600">This approved report is read-only. MEL or an administrator can reopen it with a reason.</p>;
  }
  if (["voided", "reopened", "returned", "returned_by_redo", "returned_by_mel", "draft"].includes(status)) {
    return <p className="text-sm text-slate-600">No reviewer decision is available while this report is {status.replaceAll("_", " ")}.</p>;
  }

  return (
    <div className="space-y-5">
    <form action={action} className="space-y-4">
      <input type="hidden" name="submissionId" value={detail.submission.id} />
      <input type="hidden" name="affectedQuestions" value={selected.join(",")} />
      {!administrative ? (
        <div>
          <p className="text-sm font-medium text-slate-900">Correction areas</p>
          <p className="mt-1 text-xs text-slate-500">Select the sections affected if returning the report.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CORRECTION_AREAS.map((area) => (
              <label key={area} className="flex items-center gap-2 text-xs text-slate-700">
                <Checkbox checked={selected.includes(area)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, area] : current.filter((item) => item !== area))} />
                {area.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor="review-reason" className="text-sm font-medium">Decision reason or note</label>
        <Textarea id="review-reason" name="reason" rows={4} placeholder={administrative ? "Required for reopen or void" : "Required when returning the report"} />
      </div>
      <ActionMessage state={state} />
      <div className="flex flex-col gap-2">
        {administrative ? (
          <>
            <Button type="submit" name="decision" value="reopen" variant="outline" disabled={pending}>Reopen report</Button>
            <Button type="submit" name="decision" value="void" variant="destructive" disabled={pending}>Void report</Button>
          </>
        ) : (
          <>
            <Button type="submit" name="decision" value="approve" disabled={pending} className="bg-emerald-700 hover:bg-emerald-800">
              {detail.submission.collectorRole === "bds_edo" && detail.submission.status !== "mel_review" ? "Advance to MEL review" : "Approve report"}
            </Button>
            <Button type="submit" name="decision" value="return" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={pending}>Return for correction</Button>
          </>
        )}
      </div>
    </form>
    {detail.reviewer.role === "admin" && ["submitted", "resubmitted", "redo_review"].includes(status) && detail.submission.collectorRole === "bds_edo" ? (
      <RedoReassignmentForm submissionId={detail.submission.id} reviewers={detail.redoReviewers} currentId={detail.submission.assignedRedoId} />
    ) : null}
    </div>
  );
}

function RedoReassignmentForm({
  submissionId,
  reviewers,
  currentId,
}: {
  submissionId: number;
  reviewers: MelReviewDetail["redoReviewers"];
  currentId: string | null;
}) {
  const [state, action, pending] = useActionState(reassignMelRedoReviewerAction, null);
  return (
    <form action={action} className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium text-slate-900">REDO assignment</p>
      <input type="hidden" name="submissionId" value={submissionId} />
      <select name="assignedRedoId" defaultValue={currentId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
        <option value="">Select REDO reviewer</option>
        {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
      </select>
      <Textarea name="reassignmentReason" rows={2} minLength={10} placeholder="Reason for assignment or reassignment" required />
      <ActionMessage state={state} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>{pending ? "Assigning…" : "Assign reviewer"}</Button>
    </form>
  );
}
