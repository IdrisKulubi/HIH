"use client";

import { useState, useTransition } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recalculateMelIndicatorsAction } from "@/lib/actions/mel-reporting";
import type { MelDashboardFilters } from "@/lib/mel/reporting-data";

export function RecalculateButton({ filters }: { filters: MelDashboardFilters }) {
  const [pending, startTransition] = useTransition();
  const [complete, setComplete] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const response = await recalculateMelIndicatorsAction(filters);
        if (response.success) {
          setComplete(true);
          toast.success(response.message);
        } else toast.error(response.error);
      })}
    >
      <ArrowClockwise className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Recalculating" : complete ? "Results current" : "Recalculate"}
    </Button>
  );
}
