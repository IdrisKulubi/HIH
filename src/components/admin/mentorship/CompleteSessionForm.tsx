"use client";

import { useActionState, useState } from "react";
import { completeMentorshipSessionFromForm } from "@/lib/actions/mentorship";
import type { ActionResponse } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MentorshipEvidenceField } from "@/components/admin/mentorship/MentorshipEvidenceField";
import { ExternalLink } from "lucide-react";
import { getDocumentViewerHref } from "@/lib/document-view-url";

const initial: ActionResponse<void> | null = null;

export function CompleteSessionForm({
  sessionId,
  sessionNumber,
  sessionType,
  status,
  photographicEvidenceUrl,
  diagnosticNotes,
}: {
  sessionId: number;
  sessionNumber: number;
  sessionType: "physical" | "virtual";
  status: string;
  photographicEvidenceUrl?: string | null;
  diagnosticNotes?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeMentorshipSessionFromForm,
    initial
  );
  const [evidenceUrl, setEvidenceUrl] = useState(photographicEvidenceUrl ?? "");
  const [evidenceFileName, setEvidenceFileName] = useState<string | undefined>();

  if (status === "completed") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-700">Completed</p>
        {diagnosticNotes ? (
          <p className="text-xs text-muted-foreground line-clamp-3">{diagnosticNotes}</p>
        ) : null}
        {photographicEvidenceUrl ? (
          <a
            href={getDocumentViewerHref(photographicEvidenceUrl, "session-evidence")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
          >
            <ExternalLink className="size-3" />
            View evidence
          </a>
        ) : null}
      </div>
    );
  }

  const physicalHint =
    sessionType === "physical"
      ? "Physical sessions require notes and evidence (upload or URL)."
      : "Evidence is optional for virtual sessions.";

  return (
    <form action={formAction} className="space-y-3 rounded-md border bg-muted/30 p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="text-xs text-muted-foreground">
        Session {sessionNumber} · {sessionType} · {physicalHint}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`notes-${sessionId}`}>Diagnostic notes</Label>
        <Textarea
          id={`notes-${sessionId}`}
          name="diagnosticNotes"
          rows={2}
          placeholder="Session summary…"
        />
      </div>
      <MentorshipEvidenceField
        inputId={`photo-${sessionId}`}
        value={evidenceUrl}
        fileName={evidenceFileName}
        onChange={(url, name) => {
          setEvidenceUrl(url);
          setEvidenceFileName(name);
        }}
        required={sessionType === "physical"}
        disabled={pending}
      />
      {state?.success === false && state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? <p className="text-xs text-emerald-700">Marked complete.</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Mark complete"}
      </Button>
    </form>
  );
}
