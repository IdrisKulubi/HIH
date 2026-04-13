"use client";

import { useState, useTransition } from "react";
import { createMentorshipMatch } from "@/lib/actions/mentorship";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type MentorOption = { id: number; userEmail: string; expertiseArea: string };

export function CreateMatchForm({
  businessId,
  mentors,
}: {
  businessId: number;
  mentors: MentorOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage(null);
    setError(null);
    const fd = new FormData(form);
    const mentorId = Number(fd.get("mentorId"));
    if (!Number.isFinite(mentorId)) {
      setError("Choose a mentor.");
      return;
    }
    startTransition(async () => {
      const res = await createMentorshipMatch(businessId, mentorId);
      if (res.success) {
        setMessage(`Match created (id ${res.data?.matchId})`);
        form.reset();
      } else {
        setError(res.error ?? "Failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="mentorId">Mentor</Label>
        <select
          id="mentorId"
          name="mentorId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select mentor…
          </option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.userEmail} · {m.expertiseArea}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={pending || mentors.length === 0}>
        {pending ? "Creating…" : "Create match & 6 sessions"}
      </Button>
      {mentors.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add a mentor above first.</p>
      ) : null}
    </form>
  );
}
