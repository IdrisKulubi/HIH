"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendMelCollectionRemindersAction } from "@/lib/actions/mel-collection-reminders";

export function CollectionReminderPanel({ canManage }: { canManage: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await sendMelCollectionRemindersAction();
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <section className="rounded-lg border bg-background p-4">
      <h2 className="font-semibold text-slate-900">EDO collection reminders</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Assigned EDOs are emailed while a reporting period is open for collection and today falls
        inside that period&apos;s collection window. Windows are the dates on MEL configuration,
        normally the 1st to the 10th after the quarter ends. An opening reminder goes out in the
        first part of the window, and a closing reminder in the last three days. Each EDO receives
        each reminder once, and only for enterprises that still need a report.
      </p>
      {canManage ? (
        <Button className="mt-4" variant="outline" disabled={pending} onClick={handleSend}>
          {pending ? "Sending…" : "Send due reminders now"}
        </Button>
      ) : null}
    </section>
  );
}
