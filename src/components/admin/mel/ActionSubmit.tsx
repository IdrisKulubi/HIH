"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ActionSubmit({
  idleLabel,
  pendingLabel = "Saving…",
}: {
  idleLabel: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="bg-brand-blue hover:bg-brand-blue-dark">
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
