"use client";

import { useActionState, useMemo, useState } from "react";
import { saveCnaDiagnosticFromForm } from "@/lib/actions/cna";
import type { ActionResponse } from "@/lib/actions/types";
import { CDP_FOCUS_AREAS, CDP_FOCUS_CODES, type CdpFocusCode } from "@/lib/cdp/focus-areas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SCORE_OPTIONS = [0, 5, 10] as const;

const initial: ActionResponse<{ id: number }> | null = null;

type RowState = Record<CdpFocusCode, { score: 0 | 5 | 10; gap: string }>;

function emptyRows(): RowState {
  const o = {} as RowState;
  for (const code of CDP_FOCUS_CODES) {
    o[code] = { score: 5, gap: "" };
  }
  return o;
}

export function CnaDiagnosticForm({ businessId }: { businessId: number }) {
  const [state, formAction, pending] = useActionState(
    saveCnaDiagnosticFromForm,
    initial
  );
  const [rows, setRows] = useState<RowState>(() => emptyRows());

  const needsReason = useMemo(
    () =>
      CDP_FOCUS_CODES.filter((c) => rows[c].score === 0 || rows[c].score === 5),
    [rows]
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
      <input type="hidden" name="businessId" value={businessId} />
      <p className="text-sm text-muted-foreground max-w-3xl">
        BIRE CNA: score each focus area <strong>0</strong> (poor), <strong>5</strong> (fair), or{" "}
        <strong>10</strong> (great). Scores <strong>0</strong> or <strong>5</strong> require a short{" "}
        <strong>reason / gap note</strong> (mandatory).
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 w-10">Code</th>
              <th className="p-2 min-w-[180px]">Focus area</th>
              <th className="p-2 w-32">Score</th>
              <th className="p-2 min-w-[220px]">Reason / gaps (required if score is 0 or 5)</th>
            </tr>
          </thead>
          <tbody>
            {CDP_FOCUS_CODES.map((code) => (
              <tr key={code} className="border-b last:border-0 align-top">
                <td className="p-2 font-mono font-medium">{code}</td>
                <td className="p-2 text-muted-foreground">{CDP_FOCUS_AREAS[code].label}</td>
                <td className="p-2">
                  <select
                    className="h-9 w-full max-w-[5.5rem] rounded-md border border-input bg-background px-2"
                    name={`score_${code}`}
                    value={rows[code].score}
                    onChange={(e) => {
                      const v = Number(e.target.value) as 0 | 5 | 10;
                      setRows((prev) => ({
                        ...prev,
                        [code]: { ...prev[code], score: v },
                      }));
                    }}
                  >
                    {SCORE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <Textarea
                    name={`gap_${code}`}
                    rows={2}
                    className="text-xs min-h-[3rem]"
                    value={rows[code].gap}
                    onChange={(e) =>
                      setRows((prev) => ({
                        ...prev,
                        [code]: { ...prev[code], gap: e.target.value },
                      }))
                    }
                    placeholder={
                      rows[code].score === 0 || rows[code].score === 5
                        ? "Required: describe the gap or reason for this score"
                        : "Optional for score 10"
                    }
                    aria-required={rows[code].score === 0 || rows[code].score === 5}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {needsReason.length > 0 ? (
        <p className="text-xs text-amber-800">
          Remember to fill reasons for:{" "}
          {needsReason.map((c) => (
            <span key={c} className="font-mono">
              {c}{" "}
            </span>
          ))}
          (scores 0 or 5).
        </p>
      ) : null}
      {state?.success === false && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700">Saved diagnostic #{state.data?.id}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save full CNA (A–L)"}
      </Button>
    </form>
  );
}
