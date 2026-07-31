"use client";

import { useActionState } from "react";
import { createMelLearningAction, getMelLearningActions, updateMelLearningAction } from "@/lib/actions/mel-review";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type LearningPayload = NonNullable<Awaited<ReturnType<typeof getMelLearningActions>>["data"]>;

export function LearningActionsWorkspace({ payload }: { payload: LearningPayload }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="border-b bg-slate-50 px-4 py-3"><h2 className="font-semibold text-slate-900">Action queue</h2></div>
        {payload.actions.length ? (
          <ul className="divide-y">
            {payload.actions.map((item) => <LearningActionRow key={item.id} item={item} />)}
          </ul>
        ) : <p className="px-4 py-10 text-center text-sm text-slate-500">No learning actions have been created.</p>}
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start"><CreateLearningActionForm owners={payload.owners} /></div>
    </div>
  );
}

function LearningActionRow({ item }: { item: LearningPayload["actions"][number] }) {
  const [state, action, pending] = useActionState(updateMelLearningAction, null);
  const overdue = item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && !["completed", "cancelled"].includes(item.status);
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-medium text-slate-900">{item.finding}</p><p className="mt-1 text-sm text-slate-600">{item.agreedAction}</p></div>
        <div className="flex gap-1.5"><Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge>{overdue ? <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">overdue</Badge> : null}</div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{item.business?.name ?? "Programme-wide"} · Due {item.dueDate ?? "not set"}</p>
      <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <input type="hidden" name="id" value={item.id} />
        <select name="status" defaultValue={item.status} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
        <Input name="followUpNotes" defaultValue={item.followUpNotes ?? ""} placeholder="Follow-up note" className="h-9" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Update"}</Button>
      </form>
      <ActionMessage state={state} />
    </li>
  );
}

function CreateLearningActionForm({ owners }: { owners: LearningPayload["owners"] }) {
  const [state, action, pending] = useActionState(createMelLearningAction, null);
  return (
    <form action={action} className="space-y-4 rounded-lg border bg-background p-4">
      <div><h2 className="font-semibold text-slate-900">Create learning action</h2><p className="mt-1 text-xs text-slate-500">Turn a review finding into owned follow-up work.</p></div>
      <Field name="businessId" label="Enterprise ID (optional)" type="number" />
      <Field name="submissionId" label="Submission ID (optional)" type="number" />
      <div className="space-y-1.5"><Label htmlFor="finding">Lesson or finding</Label><Textarea id="finding" name="finding" rows={3} required /></div>
      <div className="space-y-1.5"><Label htmlFor="agreedAction">Agreed action</Label><Textarea id="agreedAction" name="agreedAction" rows={3} required /></div>
      <div className="space-y-1.5"><Label htmlFor="responsibleUserId">Responsible person</Label><select id="responsibleUserId" name="responsibleUserId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} ({owner.role.replaceAll("_", " ")})</option>)}</select></div>
      <Field name="dueDate" label="Due date" type="date" />
      <ActionMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full bg-brand-blue hover:bg-brand-blue-dark">{pending ? "Creating…" : "Create action"}</Button>
    </form>
  );
}

function Field({ name, label, type }: { name: string; label: string; type: string }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} min={type === "number" ? 1 : undefined} /></div>;
}
