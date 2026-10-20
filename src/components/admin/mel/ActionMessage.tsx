import type { ActionResponse } from "@/lib/actions/types";

export function ActionMessage({ state }: { state: ActionResponse<unknown> | null }) {
  if (!state?.message && !state?.error) return null;

  return (
    <p
      role="status"
      className={`text-sm ${state.success ? "text-emerald-700" : "text-red-700"}`}
    >
      {state.message ?? state.error}
    </p>
  );
}
