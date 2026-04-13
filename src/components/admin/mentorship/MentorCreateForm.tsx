"use client";

import { useActionState } from "react";
import { createMentorFromForm } from "@/lib/actions/mentorship";
import type { ActionResponse } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const initial: ActionResponse<{ id: number }> | null = null;

const sectors = [
  { value: "agriculture_and_agribusiness", label: "Agriculture & agribusiness" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "renewable_energy", label: "Renewable energy" },
  { value: "water_management", label: "Water management" },
  { value: "waste_management", label: "Waste management" },
  { value: "forestry", label: "Forestry" },
  { value: "tourism", label: "Tourism" },
  { value: "transport", label: "Transport" },
  { value: "construction", label: "Construction" },
  { value: "ict", label: "ICT" },
  { value: "trade", label: "Trade" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

export function MentorCreateForm() {
  const [state, formAction, pending] = useActionState(createMentorFromForm, initial);

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="userEmail">User email (existing account)</Label>
        <Input id="userEmail" name="userEmail" type="email" required placeholder="mentor@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expertiseArea">Expertise sector</Label>
        <select
          id="expertiseArea"
          name="expertiseArea"
          required
          defaultValue={sectors[0].value}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sectors.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {state?.success === false && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700">Mentor created (id {state.data?.id})</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create mentor"}
      </Button>
    </form>
  );
}
