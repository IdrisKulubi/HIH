"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { BusinessListRow } from "@/lib/actions/cna";
import {
  assignMentorToEnterprises,
  type MentorListRow,
} from "@/lib/actions/mentorship";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MentorshipMentorsTable({
  mentors,
  businesses,
}: {
  mentors: MentorListRow[];
  businesses: BusinessListRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mentor, setMentor] = useState<MentorListRow | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const assignedIds = useMemo(
    () => new Set(mentor?.assignedBusinessIds ?? []),
    [mentor]
  );

  const filteredBusinesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((row) =>
      [row.businessName, row.applicantName, row.applicantEmail, row.sector]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [businesses, query]);

  const newlySelectedIds = useMemo(
    () => [...selectedIds].filter((id) => !assignedIds.has(id)),
    [assignedIds, selectedIds]
  );

  function openAssign(nextMentor: MentorListRow) {
    setMentor(nextMentor);
    setQuery("");
    setSelectedIds(new Set(nextMentor.assignedBusinessIds));
  }

  function closeAssign() {
    if (pending) return;
    setMentor(null);
    setQuery("");
    setSelectedIds(new Set());
  }

  function toggleBusiness(businessId: number, alreadyAssigned: boolean) {
    if (alreadyAssigned) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  }

  function selectFilteredUnassigned() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of filteredBusinesses) {
        if (!assignedIds.has(row.businessId)) next.add(row.businessId);
      }
      return next;
    });
  }

  function clearNewSelections() {
    setSelectedIds(new Set(assignedIds));
  }

  function handleSave() {
    if (!mentor || newlySelectedIds.length === 0) return;

    startTransition(async () => {
      const res = await assignMentorToEnterprises(mentor.id, newlySelectedIds);
      if (!res.success) {
        toast.error(res.error ?? "Could not assign enterprises.");
        return;
      }

      const assignedCount = res.data?.assignedCount ?? 0;
      if (assignedCount === 0) {
        toast.info("Those enterprises are already assigned to this mentor.");
        return;
      }

      toast.success(
        assignedCount === 1
          ? `Assigned 1 enterprise to ${mentor.userName || mentor.userEmail}.`
          : `Assigned ${assignedCount} enterprises to ${mentor.userName || mentor.userEmail}.`
      );
      setMentor(null);
      setQuery("");
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  return (
    <>
      {mentors.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No mentors yet. Register a mentor above, then assign enterprises here.
        </p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Enterprises</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Assign</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mentors.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => openAssign(row)}
            >
              <TableCell>{row.userEmail}</TableCell>
              <TableCell>{row.userName ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{row.expertiseArea}</TableCell>
              <TableCell>
                {row.enterpriseCount === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{row.enterpriseCount}</p>
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {row.enterpriseNames.join(", ")}
                    </p>
                  </div>
                )}
              </TableCell>
              <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                <Button type="button" size="sm" variant="outline" onClick={() => openAssign(row)}>
                  Assign
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}

      <Dialog open={mentor != null} onOpenChange={(open) => !open && closeAssign()}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign enterprises
              {mentor ? ` to ${mentor.userName || mentor.userEmail}` : ""}
            </DialogTitle>
            <DialogDescription>
              Tick the enterprises this mentor should support, then save. Already assigned
              enterprises stay selected. The mentor receives one email listing the new
              assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 min-h-0 flex-1">
            <div className="relative">
              <Label htmlFor="assign-enterprise-search" className="sr-only">
                Search enterprises
              </Label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="assign-enterprise-search"
                type="search"
                placeholder="Search enterprise or applicant…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                {newlySelectedIds.length} new selected
                {assignedIds.size > 0 ? ` · ${assignedIds.size} already assigned` : ""}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectFilteredUnassigned}>
                  Select visible
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearNewSelections}>
                  Clear new
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[min(50vh,28rem)] overflow-hidden rounded-md border">
              {businesses.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No enterprises are available to assign yet.
                </p>
              ) : filteredBusinesses.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No enterprises match your search.
                </p>
              ) : (
                <ul className="divide-y">
                  {filteredBusinesses.map((row) => {
                    const alreadyAssigned = assignedIds.has(row.businessId);
                    const checked = selectedIds.has(row.businessId);
                    return (
                      <li key={row.businessId}>
                        <label className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-slate-50 has-[:disabled]:cursor-default">
                          <Checkbox
                            checked={checked}
                            disabled={alreadyAssigned || pending}
                            onCheckedChange={() =>
                              toggleBusiness(row.businessId, alreadyAssigned)
                            }
                            aria-label={`Assign ${row.businessName}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-900">
                              {row.businessName}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {row.applicantName}
                              {alreadyAssigned ? " · Already assigned" : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAssign} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={pending || newlySelectedIds.length === 0}
            >
              {pending
                ? "Saving…"
                : newlySelectedIds.length === 0
                  ? "Save"
                  : newlySelectedIds.length === 1
                    ? "Save 1 assignment"
                    : `Save ${newlySelectedIds.length} assignments`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
