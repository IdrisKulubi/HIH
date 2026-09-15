import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { MENTOR_TOOLS } from "@/lib/mentorship/mentor-tools";

export function MentorToolsDownloads() {
  return (
    <section
      className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm"
      aria-labelledby="mentor-tools-heading"
    >
      <h2 id="mentor-tools-heading" className="text-base font-semibold text-slate-900">
        Mentor tools
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Download the Work Plan, Activity Report, and Growth Strategy templates for your sessions.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {MENTOR_TOOLS.map((tool) => (
          <li key={tool.slug}>
            <a
              href={`/api/mentor/tools/${tool.slug}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100"
            >
              <DownloadSimple className="size-4" weight="bold" />
              {tool.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
