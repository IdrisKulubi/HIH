"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { MelMonitoringDetail } from "@/lib/actions/mel-monitoring";
import { saveMelMonitoringAction } from "@/lib/actions/mel-monitoring";
import { WASTE_STREAMS } from "@/lib/mel/monitoring-validation";
import {
  ageCategoryAt,
  FINANCE_TYPE_LABELS,
  FINANCE_TYPES,
  MONITORING_QUESTIONS,
  MONITORING_SECTIONS,
  type MonitoringQuestionCode,
} from "@/lib/mel/monitoring-question-catalog";
import { isCollectorEditableStatus } from "@/lib/mel/review-workflow";
import { MonitoringEvidenceSummary, QuestionEvidence } from "./MonitoringEvidence";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ResponseRow = NonNullable<MelMonitoringDetail["response"]>;
type JobRow = MelMonitoringDetail["jobs"][number];

export function QuarterlyMonitoringForm({ detail }: { detail: MelMonitoringDetail }) {
  const [state, action, pending] = useActionState(saveMelMonitoringAction, null);
  const locked = !isCollectorEditableStatus(detail.submission.status);
  const response = detail.response;
  const direct = detail.jobs.find((row) => row.jobType === "direct");
  const indirect = detail.jobs.find((row) => row.jobType === "indirect");
  const waste = Object.fromEntries(detail.waste.map((row) => [row.wasteStream, row.kilograms]));
  const financeByType = new Map(detail.financeEntries.map((entry) => [entry.financeType, entry]));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="submissionId" value={detail.submission.id} />
      <fieldset disabled={locked || pending} className="space-y-6">
        <FormSection number="0" title={MONITORING_SECTIONS["0"]}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of Visit" name="visitDate" type="date" value={detail.submission.visitDate ?? ""} />
            <ReadOnlyField label="Data collector role" value={humanize(detail.submission.collectorRole)} />
          </div>
        </FormSection>

        <FormSection number="A" title={MONITORING_SECTIONS.A} help="Read-only information captured from the enterprise application and KYC record.">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <ProfileItem label="Enterprise code" value={`#${detail.profile.enterpriseId}`} />
            <ProfileItem label="Name of Enterprise" value={detail.profile.businessName} />
            <ProfileItem label="Owner" value={detail.profile.applicantName} />
            <ProfileItem label="Gender" value={humanize(detail.profile.applicantGender)} />
            <ProfileItem label="Enterprise sector" value={humanize(detail.profile.sector)} />
            <ProfileItem label="Enterprise Track" value={humanize(detail.profile.track ?? "not assigned")} />
            <ProfileItem label="County" value={humanize(detail.profile.county ?? "not recorded")} />
            <ProfileItem label="Location" value={detail.profile.city} />
            <ProfileItem label="Age category" value={ageCategoryAt(detail.profile.applicantDob, detail.period.endDate)} />
          </dl>
        </FormSection>

        <FormSection number="B" title={MONITORING_SECTIONS.B}>
          <EvidenceBooleanQuestion detail={detail} code="business_plan_improved" value={response?.businessPlanImproved} locked={locked} />
        </FormSection>

        <FormSection number="C" title={MONITORING_SECTIONS.C} help="Enter Kenya shilling totals for the past three months. Profit or loss is calculated automatically.">
          <ProfitFields response={response} />
        </FormSection>

        <FormSection number="D" title={MONITORING_SECTIONS.D} help="Youth, PLWD and refugee figures may overlap with male and female totals.">
          <div className="space-y-6">
            <JobFields label="How many new direct jobs have been created by the enterprise in the past 3 months? (A direct job refers to people employed full-time, part-time or seasonally by the business and paid a minimum wage of KES 13,000 per month.)" prefix="direct" row={direct} cumulative={detail.cumulativeJobs.direct} includeRefugee={detail.includeRefugee} />
            <JobFields label="How many new indirect jobs have been created by the enterprise in the past 3 months? (Indirect jobs include suppliers, distributors, retailers, transporters, service providers and other people engaged by the business.)" prefix="indirect" row={indirect} cumulative={detail.cumulativeJobs.indirect} includeRefugee={detail.includeRefugee} />
            <QuestionEvidence submissionId={detail.submission.id} questionCode="jobs" evidence={detail.evidence} locked={locked} />
          </div>
        </FormSection>

        <FormSection number="E" title={MONITORING_SECTIONS.E}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="market_research_completed" value={response?.marketResearchCompleted} locked={locked} />
            <BooleanField name="marketIntelligenceAccessed" label="Has the enterprise accessed market intelligence or market information in the past 3 months?" value={response?.marketIntelligenceAccessed} />
            <Field name="newMarketSegments" label="How many new market segments (new customer groups) has the enterprise started serving in the past 3 months?" type="number" min="0" step="1" value={response?.newMarketSegments ?? ""} />
            <EvidenceBooleanQuestion detail={detail} code="technology_adopted" value={response?.technologyAdopted} locked={locked} child={({ yes }) => yes ? <TextAreaField name="technologyDetails" label="If Yes, specify the technology or innovation" value={response?.technologyDetails} /> : null} />
            <EvidenceBooleanQuestion detail={detail} code="new_products_developed" value={response?.newProductsDeveloped} locked={locked} child={({ yes }) => yes ? <TextAreaField name="newProductsDetails" label="If Yes, give details of the new product or service" value={response?.newProductsDetails} /> : null} />
          </div>
        </FormSection>

        <FormSection number="F" title={MONITORING_SECTIONS.F}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="linked_to_finance_provider" value={response?.linkedToFinanceProvider} locked={locked} child={({ yes }) => yes ? <FinanceEntries initial={financeByType} /> : null} />
            <EvidenceBooleanQuestion detail={detail} code="financial_plan_completed" value={response?.financialPlanCompleted} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="active_insurance" value={response?.activeInsurance} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="investor_readiness_completed" value={response?.investorReadinessCompleted} locked={locked} />
          </div>
        </FormSection>

        <FormSection number="G" title={MONITORING_SECTIONS.G}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="life_cycle_assessment_completed" value={response?.lifeCycleAssessmentCompleted} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="eco_certification_active" value={response?.ecoCertificationActive} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="esg_report_completed" value={response?.esgReportCompleted} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="social_safeguarding_guidelines" value={response?.socialSafeguardingGuidelines} locked={locked} />
            {detail.profile.sector === "waste_management" ? (
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">Waste collected and recycled in the past 3 months (kg)</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {WASTE_STREAMS.map((stream) => <Field key={stream} name={`waste_${stream}`} label={humanize(stream)} type="number" min="0" step="0.001" value={waste[stream] ?? "0"} />)}
                </div>
                <QuestionEvidence submissionId={detail.submission.id} questionCode="waste" evidence={detail.evidence} locked={locked} />
              </div>
            ) : null}
          </div>
        </FormSection>

        <FormSection number="H" title={MONITORING_SECTIONS.H}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="strategic_partnerships" value={response?.strategicPartnerships} locked={locked} child={({ yes }) => yes ? <div className="grid gap-4 sm:grid-cols-2"><Field name="strategicPartnershipCount" label="If Yes, how many?" type="number" min="1" step="1" value={response?.strategicPartnershipCount ?? ""} /><TextAreaField name="strategicPartnershipDetails" label="If Yes, specify partner name(s)" value={response?.strategicPartnershipDetails} /></div> : null} />
            <EvidenceBooleanQuestion detail={detail} code="forum_participation" value={response?.forumParticipation} locked={locked} />
            <EvidenceBooleanQuestion detail={detail} code="public_private_partnership" value={response?.publicPrivatePartnership} locked={locked} child={({ yes }) => yes ? <TextAreaField name="publicPrivatePartnershipDetails" label="If Yes, provide details" value={response?.publicPrivatePartnershipDetails} /> : null} />
          </div>
        </FormSection>

        <FormSection number="I" title={MONITORING_SECTIONS.I}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField name="mainChallenges" label="What are the enterprise MAIN challenges at the moment? (Access to finance, market access, inputs, skills, regulatory issues, etc.)" value={response?.mainChallenges} />
            <TextAreaField name="negativeProgrammeImpacts" label="Has the entrepreneur or business experienced any direct or indirect negative impacts as a result of participating in the BIRE project?" value={response?.negativeProgrammeImpacts} />
            <TextAreaField name="additionalSupportNeeded" label="What additional support would help the enterprise grow? (Training, technology, linkages, mentorship, etc.)" value={response?.additionalSupportNeeded} />
            <TextAreaField name="collectorComment" label="R/EDO Overall Comment" value={response?.collectorComment} />
          </div>
        </FormSection>
      </fieldset>

      <FormSection number="J" title={MONITORING_SECTIONS.J} help="Review every attached or reused file. Add new evidence under its triggering question above.">
        <MonitoringEvidenceSummary submissionId={detail.submission.id} evidence={detail.evidence} references={detail.evidenceReferences} locked={locked} />
      </FormSection>

      {!locked ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-4 shadow-[0_-6px_8px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
            <ActionMessage state={state} />
            <div className="ml-auto flex gap-2">
              <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button>
              <Button type="submit" name="intent" value="submit" disabled={pending} className="bg-brand-blue hover:bg-brand-blue-dark">{pending ? "Validating…" : "Submit for review"}</Button>
            </div>
          </div>
        </div>
      ) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">This report is read-only while it is in review or approved.</div>}
    </form>
  );
}

function EvidenceBooleanQuestion({ detail, code, value, locked, child }: { detail: MelMonitoringDetail; code: MonitoringQuestionCode; value: boolean | null | undefined; locked: boolean; child?: (state: { yes: boolean }) => React.ReactNode }) {
  const question = MONITORING_QUESTIONS[code];
  const approved = detail.approvedOneTimeCodes.includes(code);
  const currentReference = detail.evidenceReferences.find((item) => item.questionCode === code);
  const reusable = detail.reusableEvidence.filter((item) => item.questionCode === code);
  const [selection, setSelection] = useState(currentReference ? `reuse:${currentReference.sourceEvidence.id}` : value === null || value === undefined ? "" : String(value));
  const yes = selection === "true" || selection.startsWith("reuse:");
  const no = selection === "false";
  const directEvidence = detail.evidence.filter((item) => item.questionCode === code);

  if (approved) return <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">{question.label}</p><p className="mt-1 text-xs">Already achieved and approved in an earlier period. No repeat response or upload is required.</p></div></div>;

  const reusedId = selection.startsWith("reuse:") ? selection.slice(6) : "";
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <Label htmlFor={`${code}_selection`} className="leading-5">{question.label}</Label>
      <select id={`${code}_selection`} value={selection} onChange={(event) => setSelection(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md">
        <option value="">Select</option><option value="true">Yes</option><option value="false">No</option>
        {reusable.map((item) => <option key={item.evidenceId} value={`reuse:${item.evidenceId}`}>Already done/submitted — {item.sourcePeriodLabel}</option>)}
      </select>
      <input type="hidden" name={question.field ?? undefined} value={yes ? "true" : no ? "false" : ""} />
      {reusedId ? <input type="hidden" name={`reusedEvidence_${code}`} value={reusedId} /> : null}
      {child?.({ yes })}
      {yes && !reusedId ? <QuestionEvidence submissionId={detail.submission.id} questionCode={code} evidence={detail.evidence} locked={locked} /> : null}
      {no && directEvidence.length > 0 ? <QuestionEvidence submissionId={detail.submission.id} questionCode={code} evidence={detail.evidence} locked={locked} stale /> : null}
      {reusedId ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-900">Approved prior evidence will be referenced. The original file will not be duplicated.</p> : null}
    </div>
  );
}

function FinanceEntries({ initial }: { initial: Map<string, MelMonitoringDetail["financeEntries"][number]> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.keys()));
  return <div className="mt-4 rounded-md bg-slate-50 p-4"><p className="text-sm font-medium text-slate-900">Which type(s) of financial service has the enterprise accessed?</p><div className="mt-3 space-y-3">{FINANCE_TYPES.map((type) => { const checked = selected.has(type); const entry = initial.get(type); return <div key={type} className="grid gap-2 sm:grid-cols-[180px_1fr]"><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="financeTypes" value={type} checked={checked} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(type); else next.delete(type); return next; })} />{FINANCE_TYPE_LABELS[type]}</label>{checked ? <div className="grid gap-2 sm:grid-cols-2"><Field name={`financeAmount_${type}`} label={`Amount accessed — ${FINANCE_TYPE_LABELS[type]} (KES)`} type="number" min="0" step="0.01" value={entry?.amount ?? ""} />{type === "other" ? <Field name="financeOtherDescription" label="Describe the other finance type" value={entry?.otherDescription ?? ""} /> : null}</div> : null}</div>; })}</div></div>;
}

function FormSection({ number, title, help, children }: { number: string; title: string; help?: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-lg border border-slate-200 bg-background"><div className="flex gap-3 border-b bg-slate-50 px-4 py-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-xs font-bold text-brand-blue">{number}</span><div><h2 className="font-semibold text-slate-900">{title}</h2>{help ? <p className="mt-0.5 max-w-[72ch] text-xs text-slate-600">{help}</p> : null}</div></div><div className="p-4 sm:p-5">{children}</div></section>; }
function Field({ label, name, value, type = "text", min, step }: { label: string; name: string; value?: string | number | null; type?: string; min?: string; step?: string }) { return <div className="space-y-1.5"><Label htmlFor={name} className="leading-5">{label}</Label><Input id={name} name={name} type={type} min={min} step={step} defaultValue={value ?? ""} /></div>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div className="space-y-1.5"><p className="text-sm font-medium">{label}</p><p className="rounded-md border bg-slate-50 px-3 py-2 text-sm capitalize text-slate-800">{value}</p></div>; }
function BooleanField({ label, name, value }: { label: string; name: string; value: boolean | null | undefined }) { return <div className="space-y-1.5"><Label htmlFor={name} className="leading-5">{label}</Label><select id={name} name={name} defaultValue={value === null || value === undefined ? "" : String(value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select></div>; }
function TextAreaField({ label, name, value }: { label: string; name: string; value: string | null | undefined }) { return <div className="mt-3 space-y-1.5"><Label htmlFor={name} className="leading-5">{label}</Label><Textarea id={name} name={name} defaultValue={value ?? ""} rows={3} /></div>; }
function ProfileItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>; }

function ProfitFields({ response }: { response: ResponseRow | null }) { const [revenue, setRevenue] = useState(response?.revenue ?? ""); const [costs, setCosts] = useState(response?.costs ?? ""); const profit = useMemo(() => revenue === "" || costs === "" ? null : Number(revenue) - Number(costs), [costs, revenue]); return <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="revenue">What is the enterprise TOTAL REVENUE in the past 3 months?</Label><Input id="revenue" name="revenue" type="number" min="0" step="0.01" value={revenue} onChange={(event) => setRevenue(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="costs">What is the enterprise&apos;s TOTAL COSTS in the past 3 months?</Label><Input id="costs" name="costs" type="number" min="0" step="0.01" value={costs} onChange={(event) => setCosts(event.target.value)} /></div><ReadOnlyField label="What is the enterprise’s PROFIT/LOSS (Total Revenue − Total Cost) in the past 3 months?" value={profit === null ? "Enter revenue and costs" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(profit)} /></div>; }
function JobFields({ label, prefix, row, cumulative, includeRefugee }: { label: string; prefix: string; row?: JobRow; cumulative: MelMonitoringDetail["cumulativeJobs"]["direct"]; includeRefugee: boolean }) { const fields = [["Total", "Total", row?.quarterlyTotal], ["Male", "Male", row?.male], ["Female", "Female", row?.female], ["Youth (18–35)", "Youth", row?.youth], ["PLWD", "Plwd", row?.plwd], ...(includeRefugee ? [["Refugee", "Refugee", row?.refugee] as const] : [])] as const; return <div><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="max-w-[75ch] text-sm font-semibold leading-5 text-slate-900">{label}</h3><p className="text-xs text-slate-600">Approved cumulative total: <span className="font-semibold text-slate-900">{cumulative.total}</span></p></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{fields.map(([display, suffix, value]) => <Field key={suffix} name={`${prefix}${suffix}`} label={display} type="number" min="0" step="1" value={value ?? ""} />)}</div></div>; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
