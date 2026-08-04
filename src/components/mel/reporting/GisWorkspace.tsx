"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, WarningCircle } from "@phosphor-icons/react";
import type { MelMapPoint } from "@/lib/actions/mel-reporting";

export function GisWorkspace({ points, invalid }: { points: MelMapPoint[]; invalid: Array<{ businessId: number; applicationId: number | null; businessName: string; reason: string }> }) {
  const [county, setCounty] = useState("");
  const [sector, setSector] = useState("");
  const [track, setTrack] = useState("");
  const [queueQuery, setQueueQuery] = useState("");
  const options = useMemo(() => ({ counties: unique(points.map((point) => point.county)), sectors: unique(points.map((point) => point.sector)), tracks: unique(points.map((point) => point.track)) }), [points]);
  const filtered = points.filter((point) => (!county || point.county === county) && (!sector || point.sector === sector) && (!track || point.track === track));
  const filteredInvalid = useMemo(() => {
    const query = queueQuery.trim().toLowerCase();
    if (!query) return invalid;
    return invalid.filter(
      (item) =>
        item.businessName.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        String(item.businessId).includes(query)
    );
  }, [invalid, queueQuery]);
  const clusters = [...filtered.reduce((map, point) => {
    const current = map.get(point.clusterKey) ?? [];
    current.push(point);
    map.set(point.clusterKey, current);
    return map;
  }, new Map<string, MelMapPoint[]>()).entries()];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
        <Select label="County" value={county} setValue={setCounty} options={options.counties} />
        <Select label="Sector" value={sector} setValue={setSector} options={options.sectors} />
        <Select label="Track" value={track} setValue={setTrack} options={options.tracks} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-label="Enterprise coordinate map">
          <div className="flex items-center justify-between border-b border-slate-200 bg-background px-4 py-3"><div><h2 className="font-semibold text-slate-900">Enterprise distribution</h2><p className="text-xs text-slate-500">Coordinates rounded to three decimal places. Nearby points are clustered.</p></div><span className="text-sm font-medium text-slate-700">{filtered.length} enterprises</span></div>
          <svg viewBox="0 0 700 560" className="h-auto min-h-[420px] w-full" role="img" aria-label={`${clusters.length} geographic clusters across Kenya`}>
            <rect width="700" height="560" fill="oklch(0.975 0.006 230)" />
            <path d="M172 40 L322 65 L430 130 L526 220 L500 355 L420 500 L285 520 L180 430 L110 290 Z" fill="oklch(0.94 0.018 145)" stroke="oklch(0.72 0.035 145)" strokeWidth="2" />
            <g stroke="oklch(0.86 0.01 230)" strokeWidth="1">{[100, 200, 300, 400, 500, 600].map((x) => <line key={`x${x}`} x1={x} x2={x} y1="0" y2="560" />)}{[100, 200, 300, 400, 500].map((y) => <line key={`y${y}`} x1="0" x2="700" y1={y} y2={y} />)}</g>
            {clusters.map(([key, members]) => {
              const latitude = members.reduce((sum, point) => sum + point.latitude, 0) / members.length;
              const longitude = members.reduce((sum, point) => sum + point.longitude, 0) / members.length;
              const x = 70 + ((longitude - 33.5) / 9) * 560;
              const y = 510 - ((latitude + 5) / 10.5) * 440;
              const radius = Math.min(24, 8 + Math.sqrt(members.length) * 4);
              return <g key={key} transform={`translate(${x} ${y})`}><circle r={radius} fill="oklch(0.63 0.16 230)" stroke="oklch(0.36 0.09 230)" strokeWidth="2"><title>{members.length} enterprise{members.length === 1 ? "" : "s"}: {members.map((member) => member.businessName).join(", ")}</title></circle><text textAnchor="middle" dominantBaseline="central" fill="oklch(0.98 0.005 230)" fontSize="11" fontWeight="700">{members.length}</text></g>;
            })}
          </svg>
        </section>
        <section className="rounded-lg border border-slate-200 bg-background"><div className="border-b border-slate-200 px-4 py-3"><h2 className="font-semibold text-slate-900">Visible enterprises</h2><p className="text-xs text-slate-500">Authorized internal summaries only.</p></div><ul className="max-h-[530px] divide-y divide-slate-100 overflow-y-auto">{filtered.map((point) => <li key={point.businessId} className="px-4 py-3"><Link href={`/admin/mel/enterprises/${point.businessId}`} className="font-medium text-brand-blue hover:underline">{point.businessName}</Link><p className="mt-1 text-xs text-slate-500">{point.county ?? "County unavailable"} · {point.sector.replaceAll("_", " ")} · {point.track ?? "track unavailable"}</p><p className="mt-1 text-xs tabular-nums text-slate-400">{point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</p></li>)}</ul>{filtered.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No verified coordinates match these filters.</p> : null}</section>
      </div>
      <section className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50">
        <div className="flex flex-col gap-3 border-b border-amber-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <WarningCircle className="size-5 shrink-0 text-amber-700" weight="duotone" />
            <div className="min-w-0">
              <h2 className="font-semibold text-amber-950">
                Coordinate validation queue
                <span className="ml-1.5 tabular-nums font-medium text-amber-800">({invalid.length})</span>
              </h2>
              <p className="text-xs text-amber-800/80">Enterprises with missing or unverified KYC locations.</p>
            </div>
          </div>
          {invalid.length > 0 ? (
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search validation queue</span>
              <input
                type="search"
                value={queueQuery}
                onChange={(event) => setQueueQuery(event.target.value)}
                placeholder="Search enterprise…"
                className="h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              />
            </label>
          ) : null}
        </div>
        {invalid.length ? (
          filteredInvalid.length ? (
            <ul className="max-h-[28rem] divide-y divide-amber-100 overflow-y-auto overscroll-contain">
              {filteredInvalid.map((item) => (
                <li
                  key={item.businessId}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-amber-100/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.businessName}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.reason}</p>
                  </div>
                  {item.applicationId ? (
                    <Link
                      href={`/admin/kyc/${item.applicationId}`}
                      className="shrink-0 font-medium text-brand-blue hover:underline"
                    >
                      Review KYC
                    </Link>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-500">No application</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-600">
              No enterprises match “{queueQuery.trim()}”.
            </p>
          )
        ) : (
          <p className="px-4 py-6 text-sm text-emerald-700">
            <MapPin className="mr-1 inline size-4" />
            All verified KYC profiles have valid coordinates.
          </p>
        )}
        {invalid.length > 0 && filteredInvalid.length > 0 ? (
          <div className="border-t border-amber-200 px-4 py-2 text-xs text-amber-900/70">
            Showing {filteredInvalid.length}
            {queueQuery.trim() ? ` of ${invalid.length}` : ""} · scroll for more
          </div>
        ) : null}
      </section>
    </div>
  );
}

function unique(values: Array<string | null>) { return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(); }
function Select({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: string[] }) { return <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span><select value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"><option value="">All</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
