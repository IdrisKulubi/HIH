import type { WordCloudTerm } from "@/lib/mel/feedback-word-cloud";

const PALETTE = [
  "text-brand-blue",
  "text-slate-800",
  "text-emerald-700",
  "text-sky-700",
  "text-indigo-700",
  "text-teal-700",
];

type WordCloudChartProps = {
  terms: WordCloudTerm[];
  emptyLabel?: string;
  ariaLabel: string;
};

export function WordCloudChart({ terms, emptyLabel = "No responses yet for this period", ariaLabel }: WordCloudChartProps) {
  if (terms.length === 0) {
    return (
      <p className="flex h-36 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...terms.map((term) => term.value));
  const min = Math.min(...terms.map((term) => term.value));

  return (
    <div
      className="h-36 overflow-y-auto overscroll-y-contain rounded-md border border-slate-200 bg-slate-50/60"
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div className="flex min-h-full flex-wrap content-start items-center justify-center gap-x-2 gap-y-1 p-3">
        {terms.map((term, index) => (
          <span
            key={term.text}
            className={`font-semibold leading-snug ${PALETTE[index % PALETTE.length]}`}
            style={{ fontSize: `${fontSize(term.value, min, max)}px` }}
          >
            {term.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function fontSize(value: number, min: number, max: number): number {
  const minPx = 11;
  const maxPx = 20;
  if (max === min) return 18;
  const ratio = (value - min) / (max - min);
  return Math.round(minPx + ratio * (maxPx - minPx));
}
