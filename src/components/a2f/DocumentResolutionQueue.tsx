"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  updateDocumentResolutionIssue,
  type A2fDocumentIssueStatus,
} from "@/lib/actions/a2f-document-resolutions";
import { getDocumentViewerHref } from "@/lib/document-view-url";
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
import { ArrowSquareOut, CheckCircle, ClipboardText } from "@phosphor-icons/react";

export type DocumentResolutionQueueItem = {
  id: number;
  a2fId: number;
  businessName: string;
  documentName: string;
  documentUrl: string | null;
  documentFileName: string | null;
  issueDetails: string;
  status: A2fDocumentIssueStatus;
  resolutionNotes: string | null;
  createdAt: Date;
  raisedByName: string;
  assignedToName: string;
};

function statusLabel(status: A2fDocumentIssueStatus) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Open";
}

export function DocumentResolutionQueue({
  initialIssues,
}: {
  initialIssues: DocumentResolutionQueueItem[];
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [activeStatus, setActiveStatus] = useState<"active" | "resolved">("active");
  const [savingId, setSavingId] = useState<number | null>(null);

  const visibleIssues = useMemo(
    () =>
      issues.filter((issue) =>
        activeStatus === "resolved" ? issue.status === "resolved" : issue.status !== "resolved"
      ),
    [issues, activeStatus]
  );

  function updateLocal(
    issueId: number,
    patch: Partial<Pick<DocumentResolutionQueueItem, "status" | "resolutionNotes">>
  ) {
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, ...patch } : issue))
    );
  }

  async function saveIssue(issue: DocumentResolutionQueueItem) {
    setSavingId(issue.id);
    const result = await updateDocumentResolutionIssue({
      issueId: issue.id,
      status: issue.status,
      resolutionNotes: issue.resolutionNotes ?? "",
    });
    setSavingId(null);
    if (result.success) {
      toast.success(result.message ?? "Resolution updated.");
    } else {
      toast.error(result.error ?? "Failed to update resolution.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={activeStatus === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveStatus("active")}
        >
          Active ({issues.filter((issue) => issue.status !== "resolved").length})
        </Button>
        <Button
          type="button"
          variant={activeStatus === "resolved" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveStatus("resolved")}
        >
          Resolved ({issues.filter((issue) => issue.status === "resolved").length})
        </Button>
      </div>

      {visibleIssues.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white px-6 py-12 text-center">
          <CheckCircle className="mx-auto size-9 text-emerald-500" weight="duotone" />
          <p className="mt-3 font-medium text-slate-900">
            {activeStatus === "active" ? "No document issues assigned" : "No resolved issues yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finance assignments will appear here with the enterprise and required follow-up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleIssues.map((issue) => (
            <article key={issue.id} className="rounded-xl border bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{issue.businessName}</h2>
                    <Badge variant="outline">{statusLabel(issue.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-700">{issue.documentName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Raised by {issue.raisedByName} on{" "}
                    {new Date(issue.createdAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {issue.documentUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={getDocumentViewerHref(
                        issue.documentUrl,
                        issue.documentFileName ?? ""
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ArrowSquareOut className="mr-1.5 size-4" />
                      View document
                    </a>
                  </Button>
                )}
              </div>

              <div className="mt-4 rounded-lg bg-amber-50 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <ClipboardText className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <p className="text-sm text-amber-950">{issue.issueDetails}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={issue.status}
                    onValueChange={(value: A2fDocumentIssueStatus) =>
                      updateLocal(issue.id, { status: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`resolution-${issue.id}`}>Follow-up / resolution notes</Label>
                  <Textarea
                    id={`resolution-${issue.id}`}
                    value={issue.resolutionNotes ?? ""}
                    onChange={(event) =>
                      updateLocal(issue.id, { resolutionNotes: event.target.value })
                    }
                    rows={2}
                    placeholder="Record the applicant follow-up and what was corrected."
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => saveIssue(issue)}
                  disabled={savingId === issue.id}
                  className="lg:mb-0.5"
                >
                  {savingId === issue.id ? "Saving..." : "Save update"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
