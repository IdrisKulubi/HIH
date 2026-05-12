"use client";

import { useMemo, useState, useTransition } from "react";
import { saveCnaQuestionResponse, submitCnaRoleReview, type CnaRoleWorkspace } from "@/lib/actions/role-cna";
import type { CnaRating } from "@/lib/cna/role-based-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Save } from "lucide-react";

const RATING_OPTIONS: { value: CnaRating; label: string }[] = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "great", label: "Great" },
];

function roleLabel(role: string) {
  switch (role) {
    case "mentor":
      return "Mentor";
    case "bds_edo":
      return "BDS / EDO";
    case "investment_analyst":
      return "Investment Analyst";
    case "mel":
      return "MEL";
    default:
      return role;
  }
}

export function RoleCnaWorkspace({
  workspace,
  showHeader = true,
}: {
  workspace: CnaRoleWorkspace;
  showHeader?: boolean;
}) {
  const [pendingQuestionId, setPendingQuestionId] = useState<number | null>(null);
  const [submitting, startSubmitTransition] = useTransition();
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [submitMessage, setSubmitMessage] = useState("");

  const responseByQuestion = useMemo(
    () => new Map(workspace.responses.map((r) => [r.questionId, r])),
    [workspace.responses]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof workspace.questions>();
    for (const question of workspace.questions) {
      const key = `${question.sectionCode} - ${question.sectionName}`;
      const rows = map.get(key) ?? [];
      rows.push(question);
      map.set(key, rows);
    }
    return Array.from(map.entries());
  }, [workspace.questions]);

  const answered = workspace.questions.filter((q) => responseByQuestion.has(q.id)).length;

  async function saveQuestion(formData: FormData) {
    const questionId = Number(formData.get("questionId"));
    const ratingLabel = formData.get("ratingLabel") as CnaRating | null;
    const comment = String(formData.get("comment") ?? "");
    if (!ratingLabel) {
      setMessages((prev) => ({ ...prev, [questionId]: "Choose Poor, Fair, or Great." }));
      return;
    }

    setPendingQuestionId(questionId);
    const res = await saveCnaQuestionResponse({
      businessId: workspace.business.id,
      questionId,
      ratingLabel,
      comment,
      reviewerRole: workspace.viewerRole,
    });
    setPendingQuestionId(null);
    setMessages((prev) => ({
      ...prev,
      [questionId]: res.success ? "Saved" : res.error ?? "Failed to save",
    }));
  }

  function submitReview() {
    setSubmitMessage("");
    startSubmitTransition(async () => {
      const res = await submitCnaRoleReview({
        businessId: workspace.business.id,
        reviewerRole: workspace.viewerRole,
      });
      setSubmitMessage(res.success ? "Review submitted." : res.error ?? "Failed to submit review.");
    });
  }

  if (workspace.questions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No active CNA questions are assigned to {roleLabel(workspace.viewerRole)} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader ? (
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="secondary">{roleLabel(workspace.viewerRole)}</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{workspace.business.name}</h1>
            <p className="text-sm text-muted-foreground">
              {workspace.business.applicantName} · {workspace.business.applicantEmail}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-slate-900">{answered}</span> / {workspace.questions.length} answered
          </div>
        </div>
      </div>
      ) : null}

      {grouped.map(([section, questions]) => (
        <section key={section} className="space-y-3">
          <h2 className="text-lg font-medium text-slate-900">{section}</h2>
          <div className="divide-y rounded-lg border bg-card">
            {questions.map((question) => {
              const response = responseByQuestion.get(question.id);
              const msg = messages[question.id];
              return (
                <form
                  key={question.id}
                  action={saveQuestion}
                  className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px]"
                >
                  <input type="hidden" name="questionId" value={question.id} />
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {response ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium leading-6 text-slate-900">{question.questionText}</p>
                    </div>
                    <Textarea
                      name="comment"
                      rows={2}
                      defaultValue={response?.comment ?? ""}
                      placeholder="Add reason or evidence note"
                      className="text-sm"
                    />
                    {msg ? (
                      <p className={msg === "Saved" ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>
                        {msg}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 overflow-hidden rounded-md border">
                      {RATING_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex min-h-10 cursor-pointer items-center justify-center border-r px-2 text-sm last:border-r-0 has-[:checked]:bg-slate-900 has-[:checked]:text-white"
                        >
                          <input
                            type="radio"
                            name="ratingLabel"
                            value={option.value}
                            defaultChecked={response?.ratingLabel === option.value}
                            className="sr-only"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" variant="outline" disabled={pendingQuestionId === question.id}>
                      <Save className="mr-2 size-4" />
                      {pendingQuestionId === question.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border bg-card p-4">
        {submitMessage ? <p className="text-sm text-muted-foreground">{submitMessage}</p> : null}
        <Button onClick={submitReview} disabled={!workspace.canSubmit || submitting}>
          {submitting ? "Submitting..." : `Submit ${roleLabel(workspace.viewerRole)} review`}
        </Button>
      </div>
    </div>
  );
}
