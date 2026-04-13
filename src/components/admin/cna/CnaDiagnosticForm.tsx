"use client";

import { useActionState } from "react";
import { saveCnaDiagnosticFromForm } from "@/lib/actions/cna";
import type { ActionResponse } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResponse<{ id: number }> | null = null;

export function CnaDiagnosticForm({ businessId }: { businessId: number }) {
  const [state, formAction, pending] = useActionState(
    saveCnaDiagnosticFromForm,
    initial
  );

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <input type="hidden" name="businessId" value={businessId} />
      <div className="space-y-2">
        <Label htmlFor="financialManagementScore">Financial management (1–5)</Label>
        <Input
          id="financialManagementScore"
          name="financialManagementScore"
          type="number"
          min={1}
          max={5}
          required
          defaultValue={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="marketReachScore">Market reach (1–5)</Label>
        <Input
          id="marketReachScore"
          name="marketReachScore"
          type="number"
          min={1}
          max={5}
          required
          defaultValue={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operationsScore">Operations (1–5)</Label>
        <Input
          id="operationsScore"
          name="operationsScore"
          type="number"
          min={1}
          max={5}
          required
          defaultValue={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="complianceScore">Compliance (1–5)</Label>
        <Input
          id="complianceScore"
          name="complianceScore"
          type="number"
          min={1}
          max={5}
          required
          defaultValue={3}
        />
      </div>
      {state?.success === false && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700">Saved diagnostic #{state.data?.id}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save diagnostic"}
      </Button>
    </form>
  );
}
