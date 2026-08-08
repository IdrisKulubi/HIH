import {
  MONITORING_QUESTIONS,
  MONITORING_SECTIONS,
  type MonitoringQuestionCode,
} from "./monitoring-question-catalog";

export type ApprovalPriorityItem = {
  section: string;
  sectionLabel: string;
  code: MonitoringQuestionCode;
  label: string;
  status: "not_achieved" | "not_answered";
};

export type ApprovalLearningActionItem = {
  finding: string;
  agreedAction: string;
};

export type ApprovalPrioritySummary = {
  priorities: ApprovalPriorityItem[];
  learningActions: ApprovalLearningActionItem[];
  reviewerNote?: string;
};

type MonitoringResponseLike = Record<string, unknown> | null | undefined;

export function extractApprovalPriorities(input: {
  response: MonitoringResponseLike;
  skipQuestionCodes?: string[];
  reviewerNote?: string;
  learningActions?: ApprovalLearningActionItem[];
}): ApprovalPrioritySummary {
  const skip = new Set(input.skipQuestionCodes ?? []);
  const priorities: ApprovalPriorityItem[] = [];

  for (const [code, question] of Object.entries(MONITORING_QUESTIONS) as [
    MonitoringQuestionCode,
    (typeof MONITORING_QUESTIONS)[MonitoringQuestionCode],
  ][]) {
    if (!question.field || skip.has(code)) continue;
    const rawValue = input.response?.[question.field];
    if (rawValue === true) continue;

    priorities.push({
      section: question.section,
      sectionLabel: MONITORING_SECTIONS[question.section],
      code,
      label: question.label,
      status: rawValue === false ? "not_achieved" : "not_answered",
    });
  }

  priorities.sort((left, right) => {
    const sectionOrder = left.section.localeCompare(right.section);
    if (sectionOrder !== 0) return sectionOrder;
    return left.label.localeCompare(right.label);
  });

  return {
    priorities,
    learningActions: input.learningActions ?? [],
    reviewerNote: input.reviewerNote?.trim() || undefined,
  };
}

export function buildApprovalPrioritySummaryText(summary: ApprovalPrioritySummary): string {
  const lines: string[] = [];

  if (summary.priorities.length > 0) {
    lines.push(
      `Priority for next quarter (${summary.priorities.length} area${summary.priorities.length === 1 ? "" : "s"}):`
    );
    for (const item of summary.priorities) {
      const statusLabel = item.status === "not_achieved" ? "Not yet achieved" : "Not answered";
      lines.push(`• ${item.sectionLabel}: ${statusLabel}`);
    }
  } else {
    lines.push("All tracked outcome questions were achieved this quarter.");
  }

  if (summary.reviewerNote) {
    lines.push(`Reviewer note: ${summary.reviewerNote}`);
  }

  if (summary.learningActions.length > 0) {
    lines.push(
      `Open learning actions (${summary.learningActions.length}): ${summary.learningActions
        .map((action) => action.agreedAction)
        .join("; ")}`
    );
  }

  return lines.join("\n");
}

export function groupApprovalPrioritiesBySection(
  priorities: ApprovalPriorityItem[]
): Array<{ sectionLabel: string; items: ApprovalPriorityItem[] }> {
  const groups = new Map<string, ApprovalPriorityItem[]>();
  for (const item of priorities) {
    const bucket = groups.get(item.sectionLabel) ?? [];
    bucket.push(item);
    groups.set(item.sectionLabel, bucket);
  }
  return [...groups.entries()].map(([sectionLabel, items]) => ({ sectionLabel, items }));
}
