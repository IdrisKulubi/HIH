"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createDocumentResolutionIssue,
  listApplicationDocumentIssues,
  listDocumentResolutionAssignees,
} from "@/lib/actions/a2f-document-resolutions";
import type { MgSupportingDocumentRow } from "@/lib/mg-supporting-documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, WarningCircle, Wrench } from "@phosphor-icons/react";

type Assignee = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ExistingIssue = {
  id: number;
  documentName: string;
  issueDetails: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date;
  assignedToId: string;
  assigneeName: string;
  assigneeRole: string;
};

function roleLabel(role: string) {
  return role === "redo" ? "REDOR" : "EDOR";
}

function statusLabel(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Open";
}

export function DocumentIssueReview({
  a2fId,
  document,
}: {
  a2fId: number;
  document: MgSupportingDocumentRow;
}) {
  const [expanded, setExpanded] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [issues, setIssues] = useState<ExistingIssue[]>([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const loadReviewData = useCallback(async () => {
    const [assigneeResult, issueResult] = await Promise.all([
      listDocumentResolutionAssignees(),
      listApplicationDocumentIssues(a2fId),
    ]);
    if (assigneeResult.success && assigneeResult.data) setAssignees(assigneeResult.data);
    if (issueResult.success && issueResult.data) setIssues(issueResult.data);
  }, [a2fId]);

  useEffect(() => {
    // Server actions resolve asynchronously; this effect refreshes review data when the case changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReviewData();
  }, [loadReviewData]);

  const documentIssues = useMemo(
    () => issues.filter((issue) => issue.documentName === document.document),
    [issues, document.document]
  );

  async function handleSend() {
    setSending(true);
    const result = await createDocumentResolutionIssue({
      a2fId,
      documentName: document.document,
      documentUrl: document.url,
      documentFileName: document.fileName,
      issueDetails: details,
      assignedToId,
    });
    setSending(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to raise issue.");
      return;
    }

    toast.success(result.message ?? "Issue sent.");
    setDetails("");
    setAssignedToId("");
    setExpanded(false);
    await loadReviewData();
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-700">Finance document check</p>
          <p className="text-xs text-muted-foreground">
            Raise an assignment when this file is missing, incorrect, or incomplete.
          </p>
        </div>
        <Button
          type="button"
          variant={expanded ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setExpanded((current) => !current)}
        >
          <Wrench className="size-4" />
          {expanded ? "Cancel" : "Raise issue"}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="space-y-1.5">
            <Label htmlFor={`issue-details-${document.document}`}>What needs to be fixed?</Label>
            <Textarea
              id={`issue-details-${document.document}`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Explain what is missing or incorrect, and what the applicant should provide."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assign to EDOR / REDOR</Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(15rem,var(--radix-select-content-available-height))]">
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name} ({roleLabel(assignee.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignees.length === 0 && (
              <p className="text-xs text-amber-800">
                No EDOR or REDOR users are available. Ask an administrator to assign those roles.
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sending || !assignedToId || details.trim().length < 10}
              className="bg-amber-800 hover:bg-amber-900"
            >
              {sending ? "Sending..." : "Send assignment"}
            </Button>
          </div>
        </div>
      )}

      {documentIssues.length > 0 && (
        <div className="space-y-2">
          {documentIssues.map((issue) => (
            <div key={issue.id} className="rounded-lg border bg-slate-50/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {issue.status === "resolved" ? (
                    <CheckCircle className="size-4 text-emerald-600" weight="fill" />
                  ) : (
                    <WarningCircle className="size-4 text-amber-600" weight="fill" />
                  )}
                  <p className="text-sm font-medium">
                    Assigned to {issue.assigneeName} ({roleLabel(issue.assigneeRole)})
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    issue.status === "resolved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }
                >
                  {statusLabel(issue.status)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{issue.issueDetails}</p>
              {issue.resolutionNotes && (
                <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900">
                  Resolution: {issue.resolutionNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
