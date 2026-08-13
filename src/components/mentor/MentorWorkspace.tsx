"use client";

import { useMemo, useState } from "react";
import type { MyMentorshipMatchRow } from "@/lib/actions/mentorship";
import { CompleteSessionForm } from "@/components/admin/mentorship/CompleteSessionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export function MentorWorkspace({ matches }: { matches: MyMentorshipMatchRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const hay = [m.businessName, m.applicantName].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [matches, query]);

  if (matches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No businesses assigned yet. An admin must create a match on Admin → Mentorship.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Label htmlFor="mentor-workspace-search" className="sr-only">
          Search assigned businesses
        </Label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="mentor-workspace-search"
          type="search"
          placeholder="Search business or applicant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {matches.length}
        {query.trim() ? " (filtered)" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No matches for your search.
        </p>
      ) : (
        <div className="space-y-8">
          {filtered.map((match) => (
            <section
              key={match.id}
              className="rounded-lg border bg-card p-4 space-y-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{match.businessName}</h2>
                  <p className="text-sm text-muted-foreground">{match.applicantName}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {match.status}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {match.sessions.map((s) => (
                  <div key={s.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                    <div className="text-sm font-medium">
                      #{s.sessionNumber} · {s.sessionType} · {s.status}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scheduled:{" "}
                      {s.scheduledDate
                        ? new Date(s.scheduledDate).toLocaleDateString()
                        : "—"}
                    </p>
                    <CompleteSessionForm
                      sessionId={s.id}
                      sessionNumber={s.sessionNumber}
                      sessionType={s.sessionType}
                      status={s.status}
                      photographicEvidenceUrl={s.photographicEvidenceUrl}
                      diagnosticNotes={s.diagnosticNotes}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
