"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { createFieldworkPlan, searchFieldworkBusinesses, updateFieldworkPlan } from "@/lib/actions/fieldwork";
import { addMinutesLocal, isoToNairobiLocal, nairobiLocalToIso } from "@/lib/fieldwork/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type BuilderBusiness = { id: number; name: string; county: string | null; city: string };
export type BuilderStaff = { userId: string; firstName: string; lastName: string; role: string };
export type BuilderPlan = {
  id: number;
  title: string;
  visits: { agenda: string; scheduledStartAt: Date | string; estimatedDurationMinutes: number; business: BuilderBusiness; staffIds: string[] }[];
};

type Row = { business: BuilderBusiness; agenda: string; startAt: string; duration: number; staffIds: string[] };

function defaultStart() {
  const tomorrow = isoToNairobiLocal(new Date(Date.now() + 24 * 3_600_000)).slice(0, 10);
  return `${tomorrow}T09:00`;
}

function rowProblem(row: Row) {
  if (row.agenda.trim().length < 3) return "Add an agenda";
  if (!nairobiLocalToIso(row.startAt)) return "Set a start time";
  if (!row.duration || row.duration < 15) return "Duration must be at least 15 minutes";
  if (!row.staffIds.length) return "Assign an officer";
  return null;
}

export function FieldworkPlanBuilder({ staff, counties, editing, onDone }: {
  staff: BuilderStaff[];
  counties: string[];
  editing?: BuilderPlan | null;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    (editing?.visits ?? []).map((v) => ({ business: v.business, agenda: v.agenda, startAt: isoToNairobiLocal(v.scheduledStartAt), duration: v.estimatedDurationMinutes, staffIds: v.staffIds })),
  );
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [results, setResults] = useState<BuilderBusiness[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(rows.map((r) => r.business.id)), [rows]);

  // Server-side, paginated enterprise search (debounced) so the full directory is reachable.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      const result = await searchFieldworkBusinesses({ query, county: county || undefined, offset: 0 });
      if (cancelled) return;
      setSearching(false);
      if (!result.success) return setSearchError(result.error);
      setSearchError(null);
      setResults(result.data.rows);
      setHasMore(result.data.hasMore);
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, county]);

  async function loadMore() {
    setSearching(true);
    const result = await searchFieldworkBusinesses({ query, county: county || undefined, offset: results.length });
    setSearching(false);
    if (!result.success) return setSearchError(result.error);
    setResults((current) => [...current, ...result.data.rows]);
    setHasMore(result.data.hasMore);
  }

  function addBusinesses(list: BuilderBusiness[]) {
    setRows((current) => {
      const next = [...current];
      for (const business of list) {
        if (next.some((r) => r.business.id === business.id)) continue;
        const last = next[next.length - 1];
        // Chain visits: each defaults to start where the previous one ends.
        const startAt = last ? addMinutesLocal(last.startAt, last.duration) : defaultStart();
        next.push({ business, agenda: "", startAt, duration: 60, staffIds: last?.staffIds ?? [] });
      }
      return next;
    });
  }

  const toggle = (business: BuilderBusiness) =>
    selectedIds.has(business.id) ? setRows((c) => c.filter((r) => r.business.id !== business.id)) : addBusinesses([business]);
  const patch = (id: number, change: Partial<Row>) => setRows((c) => c.map((r) => (r.business.id === id ? { ...r, ...change } : r)));
  const toggleStaff = (id: number, userId: string) =>
    setRows((c) => c.map((r) => r.business.id !== id ? r : { ...r, staffIds: r.staffIds.includes(userId) ? r.staffIds.filter((s) => s !== userId) : [...r.staffIds, userId] }));

  const allVisibleSelected = results.length > 0 && results.every((b) => selectedIds.has(b.id));
  const problems = rows.map(rowProblem);
  const invalidCount = problems.filter(Boolean).length;
  const canSave = title.trim().length >= 3 && rows.length > 0 && invalidCount === 0 && !pending;

  function save() {
    const visits = rows.map((r) => ({ businessId: r.business.id, agenda: r.agenda.trim(), scheduledStartAt: nairobiLocalToIso(r.startAt)!, estimatedDurationMinutes: r.duration, staffIds: r.staffIds }));
    startTransition(async () => {
      const result = editing ? await updateFieldworkPlan(editing.id, { title, visits }) : await createFieldworkPlan({ title, visits });
      if (!result.success) return void toast.error(result.error);
      toast.success(editing ? "Plan updated." : "Draft saved. Submit it for review when ready.");
      onDone();
    });
  }

  return (
    <section className="rounded-xl border bg-background p-5" aria-labelledby="plan-builder-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="plan-builder-heading" className="text-base font-semibold">{editing ? `Edit “${editing.title}”` : "New visit plan"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Times are in Nairobi time (EAT). Each enterprise needs its own agenda, start time, duration and officer(s).</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDone} aria-label="Close plan form"><X className="h-4 w-4" /></Button>
      </div>

      <label className="mt-4 block text-sm font-medium" htmlFor="plan-title">Plan title</label>
      <Input id="plan-title" className="mt-1 max-w-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kiambu follow-up visits, week 45" />

      <h3 className="mt-6 text-sm font-semibold">1. Choose enterprises</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search enterprises" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search enterprise name" />
        </div>
        <select aria-label="Filter by county" className="rounded-md border bg-background px-3 py-2 text-sm" value={county} onChange={(e) => setCounty(e.target.value)}>
          <option value="">All counties</option>
          {counties.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div className="mt-3 max-h-56 overflow-auto rounded-lg border" aria-busy={searching}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-left text-xs">
            <tr>
              <th className="w-10 p-2"><input aria-label="Select all enterprises shown" type="checkbox" checked={allVisibleSelected} disabled={!results.length}
                onChange={(e) => e.target.checked ? addBusinesses(results) : setRows((c) => c.filter((r) => !results.some((b) => b.id === r.business.id)))} /></th>
              <th className="p-2">Enterprise</th><th className="p-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {results.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2"><input aria-label={`Select ${b.name}`} type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggle(b)} /></td>
                <td className="p-2">{b.name}</td>
                <td className="p-2 text-muted-foreground">{[b.city, b.county?.replace(/_/g, " ")].filter(Boolean).join(", ")}</td>
              </tr>
            ))}
            {!results.length && !searching && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{searchError ?? "No enterprises match this search. Try a different name or county."}</td></tr>
            )}
            {searching && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
          </tbody>
        </table>
      </div>
      {hasMore && <Button className="mt-2" variant="outline" size="sm" disabled={searching} onClick={loadMore}>Load more enterprises</Button>}

      <h3 className="mt-6 text-sm font-semibold">2. Schedule each visit ({rows.length} selected)</h3>
      {rows.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Select at least one enterprise above to start scheduling.</p>}
      <div className="mt-2 space-y-3">
        {rows.map((row, index) => (
          <div key={row.business.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{index + 1}. {row.business.name}</p>
              <div className="flex items-center gap-2">
                {problems[index] && <span className="text-xs text-destructive">{problems[index]}</span>}
                <Button variant="ghost" size="sm" onClick={() => toggle(row.business)} aria-label={`Remove ${row.business.name}`}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[2fr_1fr_110px]">
              <Input aria-label={`Agenda for ${row.business.name}`} value={row.agenda} onChange={(e) => patch(row.business.id, { agenda: e.target.value })} placeholder="Client-specific agenda" />
              <Input aria-label={`Start time for ${row.business.name}`} type="datetime-local" value={row.startAt} onChange={(e) => patch(row.business.id, { startAt: e.target.value })} />
              <Input aria-label={`Duration in minutes for ${row.business.name}`} type="number" min={15} max={1440} value={row.duration} onChange={(e) => patch(row.business.id, { duration: Number(e.target.value) })} />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Field officers: {row.staffIds.length ? row.staffIds.map((id) => { const s = staff.find((x) => x.userId === id); return s ? `${s.firstName} ${s.lastName}` : id; }).join(", ") : "none assigned"}
              </summary>
              <div className="mt-2 grid max-h-40 gap-1 overflow-auto sm:grid-cols-2">
                {staff.map((s) => (
                  <label key={s.userId} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={row.staffIds.includes(s.userId)} onChange={() => toggleStaff(row.business.id, s.userId)} />
                    {s.firstName} {s.lastName} <span className="text-xs text-muted-foreground">({s.role})</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={!canSave} onClick={save}>{pending ? "Saving…" : editing ? "Save changes" : "Save draft"}</Button>
        <Button variant="outline" onClick={onDone} disabled={pending}>Cancel</Button>
        {invalidCount > 0 && <p className="text-xs text-muted-foreground">{invalidCount} visit{invalidCount === 1 ? "" : "s"} still need details.</p>}
      </div>
    </section>
  );
}
