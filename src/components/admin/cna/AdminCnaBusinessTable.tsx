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

function formatSectorLabel(sector: string) {
  return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type SortKey =
  | "company_asc"
  | "company_desc"
  | "applicant_asc"
  | "applicant_desc"
  | "email_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "company_asc", label: "Company A–Z" },
  { value: "company_desc", label: "Company Z–A" },
  { value: "applicant_asc", label: "Applicant A–Z" },
  { value: "applicant_desc", label: "Applicant Z–A" },
  { value: "email_asc", label: "Email A–Z" },
];

export function AdminCnaBusinessTable({
  rows,
  basePath = "/admin/cna",
  actionLabel = "Open",
}: {
  rows: BusinessListRow[];
  /** e.g. `/admin/cna` or `/admin/cdp` */
  basePath?: string;
  actionLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("company_asc");

  const sectorOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.sector));
    return Array.from(set).sort((a, b) => formatSectorLabel(a).localeCompare(formatSectorLabel(b)));
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;

    if (sector) {
      out = out.filter((r) => r.sector === sector);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        const hay = [
          r.businessName,
          r.applicantName,
          r.applicantEmail,
          formatSectorLabel(r.sector),
          r.sector,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sort) {
        case "company_desc":
          return b.businessName.localeCompare(a.businessName, undefined, { sensitivity: "base" });
        case "applicant_asc":
          return a.applicantName.localeCompare(b.applicantName, undefined, { sensitivity: "base" });
        case "applicant_desc":
          return b.applicantName.localeCompare(a.applicantName, undefined, { sensitivity: "base" });
        case "email_asc":
          return a.applicantEmail.localeCompare(b.applicantEmail, undefined, { sensitivity: "base" });
        case "company_asc":
        default:
          return a.businessName.localeCompare(b.businessName, undefined, { sensitivity: "base" });
      }
    });

    return sorted;
  }, [rows, query, sector, sort]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[min(100%,280px)] flex-1">
          <Label htmlFor="cna-search" className="sr-only">
            Search businesses and applicants
          </Label>
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            id="cna-search"
            type="search"
            placeholder="Search company, applicant, email, sector…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <div className="flex min-w-[160px] flex-col gap-1.5">
          <Label htmlFor="cna-sector" className="text-xs text-muted-foreground">
            Sector
          </Label>
          <select
            id="cna-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All sectors</option>
            {sectorOptions.map((s) => (
              <option key={s} value={s}>
                {formatSectorLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[180px] flex-col gap-1.5">
          <Label htmlFor="cna-sort" className="text-xs text-muted-foreground">
            Sort
          </Label>
          <select
            id="cna-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length}
        {query.trim() || sector ? " (filtered)" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No businesses match your search or filters.
        </p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-0 w-[32%]">Business</TableHead>
              <TableHead className="min-w-0 w-[22%]">Applicant</TableHead>
              <TableHead className="min-w-0 w-[16%]">Sector</TableHead>
              <TableHead className="min-w-0 w-[22%]">Email</TableHead>
              <TableHead className="w-14 shrink-0 text-right sm:w-16">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.businessId}>
                <TableCell className="min-w-0 truncate font-medium" title={row.businessName}>
                  {row.businessName}
                </TableCell>
                <TableCell className="min-w-0 truncate" title={row.applicantName}>
                  {row.applicantName}
                </TableCell>
                <TableCell
                  className="min-w-0 truncate text-muted-foreground text-sm"
                  title={formatSectorLabel(row.sector)}
                >
                  {formatSectorLabel(row.sector)}
                </TableCell>
                <TableCell className="min-w-0 truncate text-sm" title={row.applicantEmail}>
                  {row.applicantEmail}
                </TableCell>
                <TableCell className="w-14 shrink-0 text-right sm:w-16">
                  <Link
                    href={`${basePath.replace(/\/$/, "")}/${row.businessId}`}
                    className="inline-flex text-sky-700 hover:underline text-sm font-medium whitespace-nowrap"
                  >
                    {actionLabel}
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
