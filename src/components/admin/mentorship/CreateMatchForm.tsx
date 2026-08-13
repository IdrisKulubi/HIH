"use client";

import { useMemo, useState, useTransition } from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { createMentorshipMatch } from "@/lib/actions/mentorship";
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

type MentorOption = {
  id: number;
  userEmail: string;
  userName?: string | null;
  expertiseArea: string;
};

export function CreateMatchForm({
  businessId,
  mentors,
}: {
  businessId: number;
  mentors: MentorOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mentorId, setMentorId] = useState<number | "">("");

  const selected = mentors.find((m) => m.id === mentorId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) => {
      const hay = [m.userEmail, m.userName ?? "", m.expertiseArea, String(m.id)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [mentors, search]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (mentorId === "" || !Number.isFinite(mentorId)) {
      setError("Choose a mentor.");
      return;
    }
    startTransition(async () => {
      const res = await createMentorshipMatch(businessId, mentorId);
      if (res.success) {
        setMessage(`Match created (id ${res.data?.matchId})`);
        setMentorId("");
      } else {
        setError(res.error ?? "Failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="mentorId">Mentor</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="mentorId"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={mentors.length === 0}
              className="h-10 w-full justify-between font-normal"
            >
              <span className="truncate text-left">
                {selected ? (
                  <>
                    {selected.userName || selected.userEmail} · {selected.userEmail}
                  </>
                ) : (
                  <span className="text-muted-foreground">Search mentor by name or email…</span>
                )}
              </span>
              <CaretUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search name, email, or sector…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No matching mentors.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={`${m.userName ?? ""} ${m.userEmail} ${m.expertiseArea}`}
                      onSelect={() => {
                        setMentorId(m.id);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4 shrink-0",
                          mentorId === m.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.userName || m.userEmail}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.userEmail} · {m.expertiseArea}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={pending || mentors.length === 0 || mentorId === ""}>
        {pending ? "Creating…" : "Create match & 6 sessions"}
      </Button>
      {mentors.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No mentors yet. Anyone with the TA role is added automatically when you open this page.
          You can also register a mentor on the Mentorship page.
        </p>
      ) : null}
    </form>
  );
}
