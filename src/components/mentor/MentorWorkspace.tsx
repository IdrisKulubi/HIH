"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import type { MyMentorshipMatchRow } from "@/lib/actions/mentorship";
import { CompleteSessionForm } from "@/components/admin/mentorship/CompleteSessionForm";
import { MentorEnterpriseBriefPanel } from "@/components/mentor/MentorEnterpriseBriefPanel";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function defaultMatchId(matches: MyMentorshipMatchRow[]): number | null {
  if (matches.length === 0) return null;
  const active = matches.find((m) => m.status === "active");
  return active?.id ?? matches[0].id;
}

function MatchSection({ match }: { match: MyMentorshipMatchRow }) {
  return (
    <section className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{match.businessName}</h2>
          <p className="text-sm text-muted-foreground">{match.applicantName}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {match.status}
        </span>
      </div>

      <MentorEnterpriseBriefPanel businessId={match.businessId} enterprise={match.enterprise} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {match.sessions.map((s) => (
          <div key={s.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="text-sm font-medium">
              #{s.sessionNumber} · {s.sessionType} · {s.status}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled:{" "}
              {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : "—"}
            </p>
            <CompleteSessionForm
              sessionId={s.id}
              sessionNumber={s.sessionNumber}
              sessionType={s.sessionType}
              status={s.status}
              scheduledDate={s.scheduledDate}
              completedDate={s.completedDate}
              durationMinutes={s.durationMinutes}
              rejectionReason={s.rejectionReason}
              photographicEvidenceUrl={s.photographicEvidenceUrl}
              evidenceFiles={s.evidenceFiles}
              diagnosticNotes={s.diagnosticNotes}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MentorWorkspace({ matches }: { matches: MyMentorshipMatchRow[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(() =>
    defaultMatchId(matches)
  );

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedMatchId(null);
      return;
    }
    if (selectedMatchId == null || !matches.some((m) => m.id === selectedMatchId)) {
      setSelectedMatchId(defaultMatchId(matches));
    }
  }, [matches, selectedMatchId]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? matches[0] ?? null,
    [matches, selectedMatchId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const hay = [m.businessName, m.applicantName].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [matches, search]);

  if (matches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No businesses assigned yet. An admin must create a match on Admin → Mentorship.
      </p>
    );
  }

  if (!selectedMatch) {
    return null;
  }

  return (
    <div className="space-y-6">
      {matches.length > 1 ? (
        <div className="max-w-md space-y-2">
          <Label htmlFor="mentor-enterprise-selector">Enterprise</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id="mentor-enterprise-selector"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-auto min-h-10 w-full justify-between py-2 font-normal"
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate font-medium">{selectedMatch.businessName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {selectedMatch.applicantName}
                  </span>
                </span>
                <CaretUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search enterprise or applicant…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>No matching enterprises.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((match) => (
                      <CommandItem
                        key={match.id}
                        value={`${match.businessName} ${match.applicantName}`}
                        onSelect={() => {
                          setSelectedMatchId(match.id);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            selectedMatchId === match.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{match.businessName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {match.applicantName} · {match.status}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {matches.length} enterprises assigned. Switch to work on a different one.
          </p>
        </div>
      ) : null}

      <MatchSection match={selectedMatch} />
    </div>
  );
}
