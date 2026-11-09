import Link from "next/link";
import { ArrowRight, MapPin } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { getFieldworkHubSummary } from "@/lib/fieldwork/hub-summary";

const COPY = {
  bds_edo: {
    blurb: "Plan your enterprise visits, check in on site, and complete your visit reports.",
    primary: { label: "Open Fieldwork", href: "/fieldwork" },
    secondary: { label: "Visit execution", href: "/fieldwork/execution" },
  },
  redo: {
    blurb: "Approve visit plans, accept location exceptions, and review field reports from your EDOs.",
    primary: { label: "Open Fieldwork", href: "/fieldwork" },
    secondary: { label: "Review reports", href: "/fieldwork/execution" },
  },
  admin: {
    blurb: "See every plan, visit, report and delivery, export records, and lift booking blocks.",
    primary: { label: "Fieldwork oversight", href: "/admin/fieldwork" },
    secondary: { label: "Plans and approvals", href: "/fieldwork" },
  },
  oversight: {
    blurb: "Read-only view of all fieldwork plans, visits, reports and audit history.",
    primary: { label: "Fieldwork oversight", href: "/admin/fieldwork" },
    secondary: null,
  },
} as const;

/** Prominent entry point to the Fieldwork module for the EDO, REDO, admin and oversight landing pages. */
export async function FieldworkHubCard({ user }: { user: { id: string; role: string } }) {
  const summary = await getFieldworkHubSummary(user).catch(() => null);
  const copy = COPY[user.role as keyof typeof COPY];
  if (!copy) return null;
  const needsAction = (summary?.actionCount ?? 0) > 0;

  return (
    <section
      aria-labelledby="fieldwork-hub-heading"
      className={`rounded-2xl border p-5 shadow-sm ${needsAction ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <MapPin className="size-5" weight="fill" />
          </span>
          <div>
            <h2 id="fieldwork-hub-heading" className="text-base font-semibold text-slate-900">Fieldwork</h2>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{copy.blurb}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
            <Link href={copy.primary.href}>
              {copy.primary.label}
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          {copy.secondary && (
            <Button asChild variant="outline">
              <Link href={copy.secondary.href}>{copy.secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>

      {summary && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {summary.highlights.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="block rounded-xl border bg-white px-3 py-2.5 transition-colors hover:border-brand-blue">
                <span className={`text-2xl font-bold tabular-nums ${item.value > 0 && summary.role !== "oversight" ? "text-amber-700" : "text-slate-900"}`}>{item.value}</span>
                <span className="block text-xs text-slate-600">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
