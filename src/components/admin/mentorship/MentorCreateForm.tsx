"use client";

import { useActionState, useMemo, useState } from "react";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { createMentorFromForm, type MentorCandidate } from "@/lib/actions/mentorship";
import type { ActionResponse } from "@/lib/actions/types";
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

const initial: ActionResponse<{ id: number }> | null = null;

const sectors = [
  { value: "agriculture_and_agribusiness", label: "Agriculture & agribusiness" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "renewable_energy", label: "Renewable energy" },
  { value: "water_management", label: "Water management" },
  { value: "waste_management", label: "Waste management" },
  { value: "forestry", label: "Forestry" },
  { value: "tourism", label: "Tourism" },
  { value: "transport", label: "Transport" },
  { value: "construction", label: "Construction" },
  { value: "ict", label: "ICT" },
  { value: "trade", label: "Trade" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

const ROLE_FILTERS = [
  { value: "all", label: "All roles" },
  { value: "mentor", label: "TA" },
  { value: "applicant", label: "Applicant" },
] as const;

function roleLabel(role: string) {
  if (role === "mentor") return "TA";
  return role.replace(/_/g, " ");
}

export function MentorCreateForm({ users }: { users: MentorCandidate[] }) {
  const [state, formAction, pending] = useActionState(createMentorFromForm, initial);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]["value"]>("all");
  const [selectedEmail, setSelectedEmail] = useState("");

  const selected = users.find((u) => u.email === selectedEmail) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      const hay = [u.name, u.email, u.id, u.role, roleLabel(u.role)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, roleFilter]);

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <input type="hidden" name="userEmail" value={selectedEmail} required />

      <div className="space-y-2">
        <Label htmlFor="mentor-user">Existing user</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as (typeof ROLE_FILTERS)[number]["value"])}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-36"
          >
            {ROLE_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id="mentor-user"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-10 w-full justify-between font-normal"
              >
                <span className="truncate text-left">
                  {selected ? (
                    <>
                      {selected.name} · {selected.email}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Search name, email, ID, or TA…</span>
                  )}
                </span>
                <CaretUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search by name, email, ID, or role…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>No matching users.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={u.email}
                        onSelect={() => {
                          setSelectedEmail(u.email);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            selectedEmail === u.email ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email} · {roleLabel(u.role)} · {u.id.slice(0, 8)}
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
        <p className="text-xs text-muted-foreground">
          Pick an existing account. Filter by TA, or search name, email, or user ID.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expertiseArea">Expertise sector</Label>
        <select
          id="expertiseArea"
          name="expertiseArea"
          required
          defaultValue={sectors[0].value}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sectors.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {state?.success === false && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700">Mentor created (id {state.data?.id})</p>
      ) : null}
      <Button type="submit" disabled={pending || !selectedEmail}>
        {pending ? "Saving…" : "Create mentor"}
      </Button>
    </form>
  );
}
