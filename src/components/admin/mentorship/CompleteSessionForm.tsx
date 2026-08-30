"use client";

import { useActionState, useState } from "react";
import { completeMentorshipSessionFromForm } from "@/lib/actions/mentorship";
import type { ActionResponse } from "@/lib/actions/types";
import {
  formatMentorshipDurationMinutes,
  splitDurationMinutes,
  toDateInputValue,
} from "@/lib/mentorship/session-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MentorshipEvidenceField } from "@/components/admin/mentorship/MentorshipEvidenceField";
import { ExternalLink } from "lucide-react";

const initial: ActionResponse<void> | null = null;

function SessionSummary({
  completedDate,
  durationMinutes,
  diagnosticNotes,
  photographicEvidenceUrl,
}: {
  completedDate?: Date | string | null;
  durationMinutes?: number | null;
  diagnosticNotes?: string | null;
  photographicEvidenceUrl?: string | null;
}) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {completedDate ? (
        <p>
          Session date:{" "}
          <span className="text-foreground">{new Date(completedDate).toLocaleDateString()}</span>
        </p>
      ) : null}
      {durationMinutes ? (
        <p>
          Duration:{" "}
          <span className="text-foreground">
            {formatMentorshipDurationMinutes(durationMinutes)}
          </span>
        </p>
      ) : null}
      {diagnosticNotes ? (
        <p className="line-clamp-3 text-foreground/80">{diagnosticNotes}</p>
      ) : null}
      {photographicEvidenceUrl?.trim() ? (
        <a
          href={photographicEvidenceUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sky-700 hover:underline"
        >
          <ExternalLink className="size-3" />
          View evidence
        </a>
      ) : null}
    </div>
  );
}

export function CompleteSessionForm({
  sessionId,
  sessionNumber,
  sessionType,
  status,
  scheduledDate,
  completedDate,
  durationMinutes,
  rejectionReason,
  photographicEvidenceUrl,
  diagnosticNotes,
}: {
  sessionId: number;
  sessionNumber: number;
  sessionType: "physical" | "virtual";
  status: string;
  scheduledDate?: Date | string | null;
  completedDate?: Date | string | null;
  durationMinutes?: number | null;
  rejectionReason?: string | null;
  photographicEvidenceUrl?: string | null;
  diagnosticNotes?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeMentorshipSessionFromForm,
    initial
  );
  const initialDuration = splitDurationMinutes(durationMinutes);
  const [evidenceUrl, setEvidenceUrl] = useState(photographicEvidenceUrl ?? "");
  const [evidenceFileName, setEvidenceFileName] = useState<string | undefined>();

  if (status === "completed") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-700">Completed</p>
        <SessionSummary
          completedDate={completedDate}
          durationMinutes={durationMinutes}
          diagnosticNotes={diagnosticNotes}
          photographicEvidenceUrl={photographicEvidenceUrl}
        />
      </div>
    );
  }

  if (status === "pending_approval") {
    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
        <p className="text-sm font-medium text-amber-900">Awaiting REDO approval</p>
        <SessionSummary
          completedDate={completedDate}
          durationMinutes={durationMinutes}
          diagnosticNotes={diagnosticNotes}
          photographicEvidenceUrl={photographicEvidenceUrl}
        />
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
      {scheduledDate ? (
        <p className="text-xs text-muted-foreground">
          Scheduled: {new Date(scheduledDate).toLocaleDateString()}
        </p>
      ) : null}
      {rejectionReason ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <p className="font-medium">Returned for edits</p>
          <p className="mt-1 whitespace-pre-wrap">{rejectionReason}</p>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={`completed-date-${sessionId}`}>Session date</Label>
        <Input
          id={`completed-date-${sessionId}`}
          name="completedDate"
          type="date"
          required
          defaultValue={toDateInputValue(completedDate)}
          disabled={pending}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`duration-hours-${sessionId}`}>Hours</Label>
          <Input
            id={`duration-hours-${sessionId}`}
            name="durationHours"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={initialDuration.hours}
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`duration-minutes-${sessionId}`}>Minutes</Label>
          <Input
            id={`duration-minutes-${sessionId}`}
            name="durationMinutes"
            type="number"
            min={0}
            max={59}
            step={1}
            required
            defaultValue={initialDuration.minutes}
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`notes-${sessionId}`}>Diagnostic notes</Label>
        <Textarea
          id={`notes-${sessionId}`}
          name="diagnosticNotes"
          rows={2}
          placeholder="Session summary…"
          defaultValue={diagnosticNotes ?? ""}
          disabled={pending}
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
      {state?.success ? (
        <p className="text-xs text-emerald-700">Submitted for admin approval.</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Submitting…" : "Submit for approval"}
      </Button>
    </form>
  );
}
