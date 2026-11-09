import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConfirmDownloadLink } from "@/components/fieldwork/ConfirmDownloadLink";
import {
  DATASETS, EXPORT_ROW_CAP, getAdminSummary, getFilterOptions, PAGE_SIZE, parseFilters, queryDataset, isDataset, type AdminFilters, type Dataset,
} from "@/lib/fieldwork/admin-queries";

export const dynamic = "force-dynamic";

const TAB_LABEL: Record<Dataset, string> = { plans: "Plans", visits: "Visits", reports: "Reports", deliveries: "Notifications", audit: "Audit trail" };
const STATUS_OPTIONS: Record<Dataset, string[]> = {
  plans: ["draft", "submitted", "returned", "approved", "cancelled"],
  visits: ["scheduled", "checked_in", "completed", "missed", "cancelled"],
  reports: ["draft", "submitted", "returned", "approved"],
  deliveries: ["pending", "sent", "failed", "skipped"],
  audit: [],
};
const VERIFICATION_OPTIONS = ["pending", "verified", "needs_review", "exception_approved"];
const KIND_OPTIONS = ["approved_itinerary", "approved_fieldwork_feedback", "eod_reminder"];
const SEARCH_LABEL: Record<Dataset, string> = { plans: "Plan title", visits: "Enterprise", reports: "Enterprise", deliveries: "Recipient email", audit: "Plan title" };

function qs(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) if (value) params.set(key, value);
  return params.toString();
}

const field = "h-9 w-full rounded-md border bg-background px-2 text-sm";
/** Long free-text columns wrap; everything else stays on one line so rows stay short. */
const LONG_TEXT = /Notes|Reason|Details|Agenda|Title|Plan$|Failure|Activities|Findings|Challenges|Solutions|Recommendations|Action|Timeline/;

export default async function AdminFieldworkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id) redirect("/login");
  if (role !== "admin" && role !== "oversight") redirect("/admin");
  const canExport = role === "admin";

  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: Dataset = isDataset(tabParam) ? tabParam : "plans";
  const filters: AdminFilters = parseFilters(params);
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const [summary, options, result] = await Promise.all([getAdminSummary(), getFilterOptions(), queryDataset(tab, filters, { page })]);
  const columns = result.rows[0] ? Object.keys(result.rows[0]) : [];
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filterQs = qs({ ...filters });
  const exportBase = `dataset=${tab}${filterQs ? `&${filterQs}` : ""}`;
  const link = (extra: Record<string, string | undefined>) => `/admin/fieldwork?${qs({ tab, ...filters, ...extra })}`;
  const showEdo = tab !== "deliveries";

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fieldwork oversight</h1>
        <p className="mt-1 text-sm text-muted-foreground">All plans, visits, reports, notifications and audit history. {canExport ? "Exports match exactly what is shown here." : "View only."}</p>
      </header>

      {(summary.repeatedFailures.length > 0 || summary.failedDeliveries > 0 || summary.heldFeedback > 0) && (
        <div role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Delivery attention needed</p>
          {summary.repeatedFailures.map((r) => <p key={`${r.recipient}${r.kind}`}>{r.n} failed {r.kind.replace(/_/g, " ")} emails to {r.recipient} in the last 7 days.</p>)}
          {summary.failedDeliveries > 0 && <p>{summary.failedDeliveries} failed deliveries in the last 7 days. <Link className="underline" href="/admin/fieldwork?tab=deliveries&status=failed">View them</Link>.</p>}
          {summary.heldFeedback > 0 && <p>{summary.heldFeedback} client feedback email(s) are held because no verified contact exists. REDOs can retry from Visit execution once a contact is verified.</p>}
        </div>
      )}

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Plans awaiting review", value: summary.plans.submitted ?? 0, href: "/admin/fieldwork?tab=plans&status=submitted" },
          { label: "Approved plans", value: summary.plans.approved ?? 0, href: "/admin/fieldwork?tab=plans&status=approved" },
          { label: "Visits needing location review", value: summary.needsReview, href: "/admin/fieldwork?tab=visits&verification=needs_review" },
          { label: "Missed visits", value: summary.visits.missed ?? 0, href: "/admin/fieldwork?tab=visits&status=missed" },
          { label: "Reports awaiting review", value: summary.reports.submitted ?? 0, href: "/admin/fieldwork?tab=reports&status=submitted" },
          { label: "Reports returned or in draft", value: (summary.reports.returned ?? 0) + (summary.reports.draft ?? 0), href: "/admin/fieldwork?tab=reports&status=returned" },
          { label: "Approved reports", value: summary.reports.approved ?? 0, href: "/admin/fieldwork?tab=reports&status=approved" },
          { label: "Active gate overrides", value: summary.activeOverrides, href: "/fieldwork/execution" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="rounded-xl border bg-background p-4 hover:border-primary">
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </section>

      <nav aria-label="Datasets" className="flex flex-wrap gap-1 border-b">
        {DATASETS.map((d) => (
          <Link key={d} href={`/admin/fieldwork?tab=${d}`} aria-current={d === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${d === tab ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {TAB_LABEL[d]}
          </Link>
        ))}
      </nav>

      <form method="get" className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="tab" value={tab} />
        <label className="text-xs">{SEARCH_LABEL[tab]}<input name="q" defaultValue={filters.q} className={field} /></label>
        {STATUS_OPTIONS[tab].length > 0 && (
          <label className="text-xs">Status
            <select name="status" defaultValue={filters.status ?? ""} className={field}><option value="">Any</option>{STATUS_OPTIONS[tab].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
          </label>
        )}
        {tab === "visits" && (
          <label className="text-xs">Location verification
            <select name="verification" defaultValue={filters.verification ?? ""} className={field}><option value="">Any</option>{VERIFICATION_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
          </label>
        )}
        {tab === "deliveries" && (
          <label className="text-xs">Message type
            <select name="kind" defaultValue={filters.kind ?? ""} className={field}><option value="">Any</option>{KIND_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
          </label>
        )}
        {tab === "audit" && <label className="text-xs">Event<input name="event" defaultValue={filters.event} placeholder="e.g. plan_approved" className={field} /></label>}
        <label className="text-xs">From<input type="date" name="from" defaultValue={filters.from} className={field} /></label>
        <label className="text-xs">To<input type="date" name="to" defaultValue={filters.to} className={field} /></label>
        {showEdo && (
          <label className="text-xs">{tab === "audit" ? "Actor" : "EDO"}
            <select name="edo" defaultValue={filters.edo ?? ""} className={field}><option value="">Anyone</option>{options.edos.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          </label>
        )}
        {showEdo && tab !== "audit" && (
          <label className="text-xs">REDO
            <select name="redo" defaultValue={filters.redo ?? ""} className={field}><option value="">Anyone</option>{options.redos.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          </label>
        )}
        <div className="flex items-end gap-2">
          <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Apply</button>
          <Link href={`/admin/fieldwork?tab=${tab}`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">Clear</Link>
        </div>
      </form>

      <section className="rounded-xl border bg-background" aria-label={`${TAB_LABEL[tab]} results`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">{result.total} record{result.total === 1 ? "" : "s"}</p>
          {canExport && (
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted" href={`/api/fieldwork/export?${exportBase}&format=xlsx`}>Export XLSX</a>
              <a className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted" href={`/api/fieldwork/export?${exportBase}&format=csv`}>Export CSV</a>
              {tab === "visits" && (
                <ConfirmDownloadLink href={`/api/fieldwork/export?${exportBase}&format=xlsx&includeLocation=1`} message="This export includes precise GPS coordinates of staff check-ins. It will be recorded against your account. Continue?">
                  Export with coordinates
                </ConfirmDownloadLink>
              )}
            </div>
          )}
        </div>
        {result.total > EXPORT_ROW_CAP && canExport && <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">Exports are limited to {EXPORT_ROW_CAP.toLocaleString()} rows. Narrow the filters to export this set.</p>}
        <div className="max-h-[65vh] overflow-auto" tabIndex={0} role="region" aria-label={`${TAB_LABEL[tab]} table, scrollable`}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-left text-xs shadow-[0_1px_0_0_theme(colors.slate.200)]"><tr>{columns.map((c) => <th key={c} scope="col" className="whitespace-nowrap p-2">{c.replace(/_/g, " ")}</th>)}</tr></thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-t align-top">{columns.map((c) => <td key={c} className={`p-2 ${LONG_TEXT.test(c) ? "min-w-[16rem] max-w-sm whitespace-normal break-words" : "whitespace-nowrap"}`}>{row[c] === null ? "" : String(row[c])}</td>)}</tr>
              ))}
              {result.rows.length === 0 && <tr><td className="p-8 text-center text-muted-foreground" colSpan={Math.max(1, columns.length)}>No records match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            {page > 1 ? <Link className="underline" href={link({ page: String(page - 1) })}>Previous</Link> : <span />}
            <span className="text-muted-foreground">Page {page} of {pages}</span>
            {page < pages ? <Link className="underline" href={link({ page: String(page + 1) })}>Next</Link> : <span />}
          </div>
        )}
      </section>
    </div>
  );
}
