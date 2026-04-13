"use client";

import { useActionState } from "react";
import { completeMentorshipSessionFromForm } from "@/lib/actions/mentorship";
import type { ActionResponse } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionResponse<void> | null = null;

export function CompleteSessionForm({
  sessionId,
  sessionNumber,
  sessionType,
  status,
}: {
  sessionId: number;
  sessionNumber: number;
  sessionType: "physical" | "virtual";
  status: string;
}) {
  const [state, formAction, pending] = useActionState(
    completeMentorshipSessionFromForm,
    initial
  );

  if (status === "completed") {
    return <p className="text-sm text-emerald-700">Completed</p>;
  }

  const physicalHint =
    sessionType === "physical"
      ? "Physical sessions require notes and evidence URL."
      : "Optional for virtual sessions.";

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
      <div className="space-y-1">
        <Label htmlFor={`photo-${sessionId}`}>Photographic evidence URL</Label>
        <Input
          id={`photo-${sessionId}`}
          name="photographicEvidenceUrl"
          type="text"
          placeholder="https://…"
        />
      </div>
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
