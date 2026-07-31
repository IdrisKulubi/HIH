import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { getMelReviewDetail } from "@/lib/actions/mel-review";
import type { MelReviewDetail } from "@/lib/actions/mel-review";
import { DqaReviewPanel } from "@/components/mel/review/DqaReviewPanel";
import { EvidenceReviewList } from "@/components/mel/review/EvidenceReviewList";
import { ReviewDecisionPanel } from "@/components/mel/review/ReviewDecisionPanel";
import { Badge } from "@/components/ui/badge";

export default async function MelReviewDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const submissionId = Number((await params).submissionId);
  if (!Number.isInteger(submissionId)) notFound();
  const result = await getMelReviewDetail(submissionId);
  if (!result.success || !result.data) notFound();
  const detail = result.data;
  const snapshot = detail.submission.profileSnapshot;
  const direct = detail.jobs.find((row) => row.jobType === "direct");
  const indirect = detail.jobs.find((row) => row.jobType === "indirect");

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <Link href="/admin/mel/review" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-blue">
          <ArrowLeft className="size-4" weight="bold" /> Review queue
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{detail.period.label}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{detail.businessName}</h1>
            <p className="mt-1 text-sm text-slate-600">Monitoring report quality and evidence review</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{detail.submission.status.replaceAll("_", " ")}</Badge>
            <Badge variant="outline">version {detail.submission.submissionVersion}</Badge>
            {detail.submission.sourceMode === "catch_up" ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">catch-up</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-6">
          <ReviewSection title="Enterprise snapshot">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Enterprise ID", snapshot.enterpriseId],
                ["Owner", snapshot.applicantName],
                ["Gender", snapshot.applicantGender],
                ["Track", snapshot.track],
                ["Sector", snapshot.sector],
                ["County", snapshot.county],
                ["Location", snapshot.city],
                ["Visit date", detail.submission.visitDate],
                ["Collector role", detail.submission.collectorRole],
              ].map(([label, value]) => <Value key={String(label)} label={String(label)} value={value} />)}
            </dl>
          </ReviewSection>

          {detail.priorApproved ? (
            <ReviewSection title="Previous approved comparison">
              <div className="grid gap-3 sm:grid-cols-3">
                <Comparison label="Revenue" prior={currency(detail.priorApproved.revenue)} current={currency(detail.response?.revenue)} />
                <Comparison label="Profit or loss" prior={currency(detail.priorApproved.profitLoss)} current={currency(detail.response?.profitLoss)} />
                <Comparison label="Jobs" prior={detail.priorApproved.directJobs + detail.priorApproved.indirectJobs} current={(direct?.quarterlyTotal ?? 0) + (indirect?.quarterlyTotal ?? 0)} />
              </div>
              <p className="mt-3 text-xs text-slate-500">Compared with {detail.priorApproved.periodLabel}.</p>
            </ReviewSection>
          ) : null}

          <ReviewSection title="Financial performance and jobs">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Revenue" value={currency(detail.response?.revenue)} />
              <Metric label="Costs" value={currency(detail.response?.costs)} />
              <Metric label="Profit or loss" value={currency(detail.response?.profitLoss)} />
            </div>
            <div className="mt-5 overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Jobs</th><th>Total</th><th>Male</th><th>Female</th><th>Youth</th><th>PLWD</th><th>Refugee</th></tr></thead>
                <tbody className="divide-y">
                  {([["Direct", direct], ["Indirect", indirect]] as const).map(([label, row]) => (
                    <tr key={label}><td className="px-3 py-2 font-medium">{label}</td><td className="text-center">{row?.quarterlyTotal ?? "—"}</td><td className="text-center">{row?.male ?? "—"}</td><td className="text-center">{row?.female ?? "—"}</td><td className="text-center">{row?.youth ?? "—"}</td><td className="text-center">{row?.plwd ?? "—"}</td><td className="text-center">{row?.refugee ?? "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReviewSection>

          <ReviewSection title="Enterprise results">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {responseItems(detail.response).map(([label, value]) => <Value key={label} label={label} value={value} />)}
            </dl>
          </ReviewSection>

          <ReviewSection title="Waste collected and recycled">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.waste.map((row) => <Metric key={row.id} label={row.wasteStream.replaceAll("_", " ")} value={`${row.kilograms} kg`} />)}
            </div>
          </ReviewSection>

          <DqaReviewPanel submissionId={detail.submission.id} issues={detail.dqaIssues} />

          <ReviewSection title="Evidence review">
            <EvidenceReviewList evidence={detail.evidence} />
          </ReviewSection>

          <ReviewSection title="Review and version history">
            <div className="space-y-3">
              {detail.decisions.map((decision) => (
                <div key={decision.id} className="flex gap-3 rounded-md border bg-slate-50 p-3">
                  <ClockCounterClockwise className="mt-0.5 size-4 shrink-0 text-brand-blue" weight="duotone" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{decision.action.replaceAll("_", " ")}: {decision.fromStatus.replaceAll("_", " ")} to {decision.toStatus.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-slate-500">{decision.stage.toUpperCase()} · {formatDate(decision.createdAt)} · {decision.reviewerRole.replaceAll("_", " ")}</p>
                    {decision.reason ? <p className="mt-2 text-sm text-slate-700">{decision.reason}</p> : null}
                    {decision.affectedQuestions.length ? <p className="mt-1 text-xs text-slate-500">Affected: {decision.affectedQuestions.join(", ")}</p> : null}
                  </div>
                </div>
              ))}
              {detail.decisions.length === 0 ? <p className="text-sm text-slate-500">No review decisions recorded yet.</p> : null}
              {detail.versions.length ? <p className="text-xs text-slate-500">{detail.versions.length} immutable submitted version snapshot{detail.versions.length === 1 ? "" : "s"} retained.</p> : null}
            </div>
          </ReviewSection>
        </main>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-background p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Review decision</h2>
            <p className="mt-1 text-xs text-slate-500">The server validates stage, DQA, evidence, and self-approval rules.</p>
            <div className="mt-4"><ReviewDecisionPanel detail={detail} /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-background"><h2 className="border-b bg-slate-50 px-4 py-3 font-semibold text-slate-900">{title}</h2><div className="p-4">{children}</div></section>;
}

function Value({ label, value }: { label: string; value: unknown }) {
  return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{display(value)}</dd></div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function Comparison({ label, prior, current }: { label: string; prior: string | number; current: string | number }) {
  return <div className="rounded-md border p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xs text-slate-500">Previous: <span className="font-medium text-slate-800">{prior}</span></p><p className="mt-1 text-sm">Current: <span className="font-semibold text-slate-900">{current}</span></p></div>;
}

function responseItems(response: MelReviewDetail["response"]): Array<[string, unknown]> {
  if (!response) return [["Response", "No response record found"]];
  return [
    ["Business plan improved", response.businessPlanImproved],
    ["Market research completed", response.marketResearchCompleted],
    ["Market intelligence accessed", response.marketIntelligenceAccessed],
    ["New market segments", response.newMarketSegments],
    ["Technology adopted", response.technologyAdopted],
    ["Technology details", response.technologyDetails],
    ["New products developed", response.newProductsDeveloped],
    ["New product details", response.newProductsDetails],
    ["Linked to finance provider", response.linkedToFinanceProvider],
    ["Finance type", response.financeType],
    ["Finance value", currency(response.financeValue)],
    ["Financial plan completed", response.financialPlanCompleted],
    ["Active insurance", response.activeInsurance],
    ["Investor readiness completed", response.investorReadinessCompleted],
    ["Life-cycle assessment", response.lifeCycleAssessmentCompleted],
    ["Eco-certification", response.ecoCertificationActive],
    ["ESG report", response.esgReportCompleted],
    ["Social safeguarding guidelines", response.socialSafeguardingGuidelines],
    ["Circular growth reported", response.circularGrowthReported],
    ["Circular growth value", currency(response.circularGrowthValue)],
    ["Strategic partnerships", response.strategicPartnerships],
    ["Partnership details", response.strategicPartnershipDetails],
    ["Forum participation", response.forumParticipation],
    ["Forum details", response.forumDetails],
    ["Public-private partnership", response.publicPrivatePartnership],
    ["Public-private partnership details", response.publicPrivatePartnershipDetails],
    ["Main challenges", response.mainChallenges],
    ["Negative programme impacts", response.negativeProgrammeImpacts],
    ["Additional support needed", response.additionalSupportNeeded],
    ["Collector comment", response.collectorComment],
  ];
}

function display(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value).replaceAll("_", " ");
}

function currency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}
