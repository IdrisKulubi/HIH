"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MENTORSHIP_EXPORT_SECTIONS } from "@/lib/mentorship/export-config";

export function MentorshipExportPanel() {
  const [selected, setSelected] = useState<string[]>(
    MENTORSHIP_EXPORT_SECTIONS.map((section) => section.key)
  );

  const toggle = (key: string) => {
    setSelected((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    );
  };

  const buildExportUrl = (format: "xlsx" | "csv") => {
    const params = new URLSearchParams();
    params.set("format", format);
    for (const type of selected) {
      params.append("type", type);
    }
    return `/api/mentorship/exports?${params.toString()}`;
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-slate-900">Export mentorship data</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Select the datasets you need, then download a single Excel workbook with one worksheet
          per section.
        </p>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
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
          <Button
            asChild
            disabled={selected.length === 0}
            className="bg-brand-blue hover:bg-brand-blue-dark"
          >
            <a href={buildExportUrl("xlsx")}>
              <DownloadSimple className="size-4" />
              Download Excel
            </a>
          </Button>
          <Button asChild variant="outline" disabled={selected.length === 0}>
            <a href={buildExportUrl("csv")}>
              <DownloadSimple className="size-4" />
              Download CSV
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
