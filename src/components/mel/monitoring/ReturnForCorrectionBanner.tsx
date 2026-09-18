import type { MelReturnFeedback } from "@/lib/actions/mel-monitoring";

export function ReturnForCorrectionBanner({ feedback }: { feedback: MelReturnFeedback }) {
  const stageLabel =
    feedback.stage === "redo"
      ? "REDO review"
      : feedback.stage === "mel"
        ? "MEL review"
        : feedback.reviewerRole.replaceAll("_", " ");

  const affectedLabels = feedback.affectedQuestions.map((code) => humanizeArea(code));

  return (
    <section
      className="rounded-lg border border-red-200 bg-red-50/90 p-5"
      aria-labelledby="return-feedback-heading"
    >
      <h2 id="return-feedback-heading" className="text-base font-semibold text-red-950">
        Returned for correction
      </h2>
      <p className="mt-1 text-sm text-red-900/90">
        Feedback from {stageLabel}. Address the points below, then save and resubmit.
      </p>
      <div className="mt-4 rounded-md border border-red-100 bg-white/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Reviewer comments</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-red-950">{feedback.reason}</p>
      </div>
      {affectedLabels.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Sections to review</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-950">
            {affectedLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-red-800/80">
        Returned {formatReturnedAt(feedback.createdAt)}
      </p>
    </section>
  );
}

function humanizeArea(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatReturnedAt(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
