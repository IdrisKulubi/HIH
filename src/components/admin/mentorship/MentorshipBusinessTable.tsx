"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BusinessListRow } from "@/lib/actions/cna";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export function MentorshipBusinessTable({ rows }: { rows: BusinessListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const hay = [row.businessName, row.applicantName].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="relative min-w-[min(100%,280px)] max-w-md">
        <Label htmlFor="mentorship-business-search" className="sr-only">
          Search businesses and applicants
        </Label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="mentorship-business-search"
          type="search"
          placeholder="Search business or applicant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length}
        {query.trim() ? " (filtered)" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No businesses match your search.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead className="text-right">Matches</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.businessId}>
                <TableCell className="font-medium">{row.businessName}</TableCell>
                <TableCell>{row.applicantName}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/mentorship/matches/${row.businessId}`}
                    className="text-sky-700 hover:underline text-sm font-medium"
                  >
                    Manage
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
