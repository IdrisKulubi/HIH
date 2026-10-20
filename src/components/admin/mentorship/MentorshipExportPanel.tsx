"use client";

import { useMemo, useState } from "react";
import { CalendarBlank, DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MENTORSHIP_EXPORT_SECTIONS } from "@/lib/mentorship/export-config";
import {
  MENTORSHIP_EXPORT_PRESETS,
  type MentorshipExportPreset,
  mentorshipExportRangeError,
  mentorshipExportRangeLabel,
  resolveMentorshipExportRange,
} from "@/lib/mentorship/export-date-range";
import { cn } from "@/lib/utils";

export function MentorshipExportPanel() {
  const [selected, setSelected] = useState<string[]>(
    MENTORSHIP_EXPORT_SECTIONS.map((section) => section.key)
  );
  const [preset, setPreset] = useState<MentorshipExportPreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rangeError = mentorshipExportRangeError(from, to);
  const periodLabel = mentorshipExportRangeLabel(from || null, to || null);
  const canDownload = selected.length > 0 && !rangeError;

  const applyPreset = (next: MentorshipExportPreset) => {
    setPreset(next);
    const resolved = resolveMentorshipExportRange(next, from, to);
    setFrom(resolved.from);
    setTo(resolved.to);
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
    setPreset("custom");
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setPreset("custom");
  };

  const exportHref = useMemo(() => {
    return (format: "xlsx" | "csv") => {
      const params = new URLSearchParams();
      params.set("format", format);
      for (const type of selected) {
        params.append("type", type);
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return `/api/mentorship/exports?${params.toString()}`;
    };
  }, [from, selected, to]);

  const toggle = (key: string) => {
    setSelected((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    );
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-slate-900">Export mentorship data</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Pick a period with one tap, then download a workbook with one worksheet per section.
        </p>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <fieldset>
          <legend className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarBlank className="size-4 text-brand-blue" weight="duotone" />
            Period
          </legend>
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="group"
            aria-label="Quick date filters"
          >
            {MENTORSHIP_EXPORT_PRESETS.map((option) => {
              const active = preset === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPreset(option.id)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>From</span>
              <Input
                type="date"
                value={from}
                onChange={(event) => handleFromChange(event.target.value)}
                disabled={preset === "all"}
                className="h-10"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>To</span>
              <Input
                type="date"
                value={to}
                onChange={(event) => handleToChange(event.target.value)}
                disabled={preset === "all"}
                className="h-10"
              />
            </label>
            <p
              className={cn(
                "text-xs sm:pb-2.5",
                rangeError ? "text-red-700" : "text-slate-500"
              )}
            >
              {rangeError ?? periodLabel}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sessions, matches, and approvals that fall in this window. Mentor and business
            summaries use the same period.
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Data to include</legend>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {MENTORSHIP_EXPORT_SECTIONS.map((section) => (
              <label key={section.key} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(section.key)}
                  onChange={() => toggle(section.key)}
                  className="mt-0.5 size-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span>
                  <span className="font-medium text-slate-900">{section.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-600">
                    {section.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          {canDownload ? (
            <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark">
              <a href={exportHref("xlsx")}>
                <DownloadSimple className="size-4" />
                Download Excel
              </a>
            </Button>
          ) : (
            <Button disabled className="bg-brand-blue">
              <DownloadSimple className="size-4" />
              Download Excel
            </Button>
          )}
          {canDownload ? (
            <Button asChild variant="outline">
              <a href={exportHref("csv")}>
                <DownloadSimple className="size-4" />
                Download CSV
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline">
              <DownloadSimple className="size-4" />
              Download CSV
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
