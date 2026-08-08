import type { ApprovalPrioritySummary } from "@/lib/mel/approval-priorities";
import { groupApprovalPrioritiesBySection } from "@/lib/mel/approval-priorities";

export function NextQuarterPrioritiesPanel({ summary }: { summary: ApprovalPrioritySummary }) {
  const grouped = groupApprovalPrioritiesBySection(summary.priorities);

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-amber-950">Priority for next quarter</h2>
        <p className="mt-1 text-sm text-amber-900/80">
          Focus areas from this verified report to guide your next visit.
        </p>
      </div>

      {summary.priorities.length === 0 ? (
        <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-md p-3">
          All tracked outcome questions were achieved this quarter.
        </p>
      ) : (
        <ul className="space-y-4">
          {grouped.map((group) => (
            <li key={group.sectionLabel}>
              <p className="text-sm font-semibold text-amber-950">{group.sectionLabel}</p>
              <ul className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item.code}
                    className="rounded-md border border-amber-100 bg-white/70 px-3 py-2 text-sm text-amber-950"
                  >
                    <span className="font-medium">
                      {item.status === "not_achieved" ? "Not yet achieved" : "Not answered"}
                    </span>
                    <span className="text-amber-900/80"> — {item.label}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {summary.reviewerNote ? (
        <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Reviewer note</p>
          <p className="mt-1 text-sm text-blue-900">{summary.reviewerNote}</p>
        </div>
      ) : null}

      {summary.learningActions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Open learning actions</p>
          {summary.learningActions.map((action, index) => (
            <div key={index} className="rounded-md border border-amber-100 bg-white/70 p-3 text-sm text-amber-950">
              <p className="font-medium">{action.finding}</p>
              <p className="mt-1 text-amber-900/80">Action: {action.agreedAction}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
