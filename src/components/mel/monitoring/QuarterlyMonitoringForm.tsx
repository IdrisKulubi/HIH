"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { findMonitoringJob, MEL_JOB_TYPE } from "@/lib/mel/job-types";
import { isMelEvidenceOptionalForSubmission } from "@/lib/mel/programme-calendar";
import { isCollectorEditableStatus } from "@/lib/mel/review-workflow";
import { calculateFinancialComparison } from "@/lib/mel/financial-baselines";
import { MonitoringEvidenceSummary, QuestionEvidence } from "./MonitoringEvidence";
import { ApprovedReportBanner, LockedReportBanner } from "./ApprovedReportBanner";
import { NextQuarterPrioritiesPanel } from "./NextQuarterPrioritiesPanel";
import { ActionMessage } from "@/components/admin/mel/ActionMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JobRow = MelMonitoringDetail["jobs"][number];
type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export function QuarterlyMonitoringForm({ detail }: { detail: MelMonitoringDetail }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingAfterFlightRef = useRef(false);
  const [state, action, pending] = useActionState(saveMelMonitoringAction, null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const locked = !isCollectorEditableStatus(detail.submission.status);
  const isApproved = detail.submission.status === "approved";
  const evidenceOptional = isMelEvidenceOptionalForSubmission(
    detail.period,
    detail.submission.status
  );
  const response = detail.response;
  const directQuality = findMonitoringJob(detail.jobs, MEL_JOB_TYPE.directQuality);
  const directNonQuality = findMonitoringJob(detail.jobs, MEL_JOB_TYPE.directNonQuality);
  const indirect = findMonitoringJob(detail.jobs, MEL_JOB_TYPE.indirect);
  const waste = Object.fromEntries(detail.waste.map((row) => [row.wasteStream, row.kilograms]));
  const financeByType = new Map(detail.financeEntries.map((entry) => [entry.financeType, entry]));

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const performAutoSave = useCallback(async () => {
    const form = formRef.current;
    if (!form || locked) return;

    if (saveInFlightRef.current) {
      pendingAfterFlightRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setAutoSaveStatus("saving");

    const formData = new FormData(form);
    formData.set("intent", "autosave");

    try {
      const result = await saveMelMonitoringAction(null, formData);
      if (result.success) {
        setAutoSaveStatus("saved");
        setLastAutoSavedAt(new Date());
      } else {
        setAutoSaveStatus("error");
      }
    } catch {
      setAutoSaveStatus("error");
    } finally {
      saveInFlightRef.current = false;
      if (pendingAfterFlightRef.current) {
        pendingAfterFlightRef.current = false;
        void performAutoSave();
      }
    }
  }, [locked]);

  const scheduleAutoSave = useCallback(() => {
    cancelAutoSave();
    autoSaveTimerRef.current = setTimeout(() => {
      void performAutoSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [cancelAutoSave, performAutoSave]);

  useEffect(() => {
    if (locked) return;
    const form = formRef.current;
    if (!form) return;

    const handleChange = () => scheduleAutoSave();
    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelAutoSave();
        void performAutoSave();
      }
    };

    const handlePageHide = () => {
      cancelAutoSave();
      void performAutoSave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      form.removeEventListener("input", handleChange);
      form.removeEventListener("change", handleChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      cancelAutoSave();
    };
  }, [locked, scheduleAutoSave, performAutoSave, cancelAutoSave]);

  useEffect(() => {
    if (!state?.success) return;
    if (state.data?.submitted) {
      router.replace("/admin/mel/monitoring");
      return;
    }
    router.refresh();
  }, [router, state]);

  const handleManualSave = () => {
    cancelAutoSave();
  };

  const displayedLastSavedAt = lastAutoSavedAt ?? (detail.submission.lastSavedAt ? new Date(detail.submission.lastSavedAt) : null);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <input type="hidden" name="submissionId" value={detail.submission.id} />

      {isApproved && detail.approvalSummary ? (
        <NextQuarterPrioritiesPanel summary={detail.approvalSummary} />
      ) : null}

      <fieldset disabled={locked} className="space-y-6">
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
          <EvidenceBooleanQuestion detail={detail} code="business_plan_improved" value={response?.businessPlanImproved} locked={locked} evidenceOptional={evidenceOptional} />
        </FormSection>

        <FormSection number="C" title={MONITORING_SECTIONS.C} help="Enter Kenya shilling totals for the past three months. Profit or loss is calculated automatically.">
          <ProfitFields detail={detail} locked={locked} evidenceOptional={evidenceOptional} />
        </FormSection>

        <FormSection number="D" title={MONITORING_SECTIONS.D} help="Youth, PLWD and refugee figures may overlap with male and female totals. Enter 0 in Total when no new jobs were created this quarter.">
          <JobsSection
            detail={detail}
            directQuality={directQuality}
            directNonQuality={directNonQuality}
            indirect={indirect}
            locked={locked}
            includeRefugee={detail.includeRefugee}
            evidenceOptional={evidenceOptional}
          />
        </FormSection>

        <FormSection number="E" title={MONITORING_SECTIONS.E}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="market_research_completed" value={response?.marketResearchCompleted} locked={locked} evidenceOptional={evidenceOptional} />
            <BooleanField name="marketIntelligenceAccessed" label="Has the enterprise accessed market intelligence or market information in the past 3 months?" value={response?.marketIntelligenceAccessed} />
            <Field name="newMarketSegments" label="How many new market segments (new customer groups) has the enterprise started serving in the past 3 months?" type="number" min="0" step="1" value={response?.newMarketSegments ?? ""} />
            <EvidenceBooleanQuestion detail={detail} code="technology_adopted" value={response?.technologyAdopted} locked={locked} evidenceOptional={evidenceOptional} child={({ yes }) => yes ? <TextAreaField name="technologyDetails" label="If Yes, specify the technology or innovation" value={response?.technologyDetails} /> : null} />
            <EvidenceBooleanQuestion detail={detail} code="new_products_developed" value={response?.newProductsDeveloped} locked={locked} evidenceOptional={evidenceOptional} child={({ yes }) => yes ? <TextAreaField name="newProductsDetails" label="If Yes, give details of the new product or service" value={response?.newProductsDetails} /> : null} />
          </div>
        </FormSection>

        <FormSection number="F" title={MONITORING_SECTIONS.F}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="linked_to_finance_provider" value={response?.linkedToFinanceProvider} locked={locked} evidenceOptional={evidenceOptional} child={({ yes }) => yes ? <FinanceEntries initial={financeByType} /> : null} />
            <EvidenceBooleanQuestion detail={detail} code="financial_plan_completed" value={response?.financialPlanCompleted} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="active_insurance" value={response?.activeInsurance} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="investor_readiness_completed" value={response?.investorReadinessCompleted} locked={locked} evidenceOptional={evidenceOptional} />
          </div>
        </FormSection>

        <FormSection number="G" title={MONITORING_SECTIONS.G}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="life_cycle_assessment_completed" value={response?.lifeCycleAssessmentCompleted} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="eco_certification_active" value={response?.ecoCertificationActive} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="esg_report_completed" value={response?.esgReportCompleted} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="social_safeguarding_guidelines" value={response?.socialSafeguardingGuidelines} locked={locked} evidenceOptional={evidenceOptional} />
            {detail.profile.sector === "waste_management" ? (
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">Waste collected and recycled in the past 3 months (kg)</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {WASTE_STREAMS.map((stream) => <Field key={stream} name={`waste_${stream}`} label={humanize(stream)} type="number" min="0" step="0.001" value={waste[stream] ?? "0"} />)}
                </div>
                <QuestionEvidence submissionId={detail.submission.id} questionCode="waste" evidence={detail.evidence} locked={locked} evidenceOptional={evidenceOptional} />
              </div>
            ) : null}
          </div>
        </FormSection>

        <FormSection number="H" title={MONITORING_SECTIONS.H}>
          <div className="space-y-5">
            <EvidenceBooleanQuestion detail={detail} code="strategic_partnerships" value={response?.strategicPartnerships} locked={locked} evidenceOptional={evidenceOptional} child={({ yes }) => yes ? <div className="grid gap-4 sm:grid-cols-2"><Field name="strategicPartnershipCount" label="If Yes, how many?" type="number" min="1" step="1" value={response?.strategicPartnershipCount ?? ""} /><TextAreaField name="strategicPartnershipDetails" label="If Yes, specify partner name(s)" value={response?.strategicPartnershipDetails} /></div> : null} />
            <EvidenceBooleanQuestion detail={detail} code="forum_participation" value={response?.forumParticipation} locked={locked} evidenceOptional={evidenceOptional} />
            <EvidenceBooleanQuestion detail={detail} code="public_private_partnership" value={response?.publicPrivatePartnership} locked={locked} evidenceOptional={evidenceOptional} child={({ yes }) => yes ? <TextAreaField name="publicPrivatePartnershipDetails" label="If Yes, provide details" value={response?.publicPrivatePartnershipDetails} /> : null} />
          </div>
        </FormSection>

        <FormSection number="I" title={MONITORING_SECTIONS.I}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField
              name="positiveProgrammeImpacts"
              label="What are some of the positive things you/your enterprise has started experiencing as a result of participating in the BIRE project?"
              value={response?.positiveProgrammeImpacts}
            />
            <TextAreaField name="mainChallenges" label="What are the enterprise MAIN challenges at the moment? (Access to finance, market access, inputs, skills, regulatory issues, etc.)" value={response?.mainChallenges} />
            <TextAreaField name="negativeProgrammeImpacts" label="Has the entrepreneur or business experienced any direct or indirect negative impacts as a result of participating in the BIRE project?" value={response?.negativeProgrammeImpacts} />
            <TextAreaField name="additionalSupportNeeded" label="What additional support would help the enterprise grow? (Training, technology, linkages, mentorship, etc.)" value={response?.additionalSupportNeeded} />
            <TextAreaField name="collectorComment" label="EDO Overall Comment" value={response?.collectorComment} />
          </div>
        </FormSection>
      </fieldset>

      <FormSection
        number="J"
        title={MONITORING_SECTIONS.J}
        help={
          evidenceOptional
            ? "Review any attached or reused files. Supporting evidence is optional for this collection round but encouraged where available."
            : "Review every attached or reused file. Add new evidence under its triggering question above."
        }
      >
        <MonitoringEvidenceSummary submissionId={detail.submission.id} evidence={detail.evidence} references={detail.evidenceReferences} locked={locked} />
      </FormSection>

      {!locked ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-4 shadow-[0_-6px_8px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              {!(autoSaveStatus === "saved" && state && !state.success) ? <ActionMessage state={state} /> : null}
              {autoSaveStatus === "saving" ? (
                <p className="text-xs text-slate-500">Saving draft…</p>
              ) : autoSaveStatus === "error" ? (
                <p className="text-xs text-red-600">Could not save draft</p>
              ) : autoSaveStatus === "saved" ? (
                <p className="text-xs text-emerald-700">Draft saved just now</p>
              ) : displayedLastSavedAt ? (
                <p className="text-xs text-slate-500">
                  Last saved {formatSavedAt(displayedLastSavedAt)}
                </p>
              ) : null}
            </div>
            <div className="ml-auto flex gap-2">
              <Button type="submit" name="intent" value="save" variant="outline" formNoValidate disabled={pending} onClick={handleManualSave}>{pending ? "Saving…" : "Save draft"}</Button>
              <Button type="submit" name="intent" value="submit" disabled={pending} onClick={handleManualSave} className="bg-brand-blue hover:bg-brand-blue-dark">{pending ? "Validating…" : "Submit for review"}</Button>
            </div>
          </div>
        </div>
      ) : isApproved ? (
        <ApprovedReportBanner periodLabel={detail.period.label} />
      ) : (
        <LockedReportBanner />
      )}
    </form>
  );
}

function EvidenceBooleanQuestion({ detail, code, value, locked, evidenceOptional = false, child }: { detail: MelMonitoringDetail; code: MonitoringQuestionCode; value: boolean | null | undefined; locked: boolean; evidenceOptional?: boolean; child?: (state: { yes: boolean }) => React.ReactNode }) {
  const question = MONITORING_QUESTIONS[code];
  const hidden = detail.approvedOneTimeCodes.includes(code);
  const [selection, setSelection] = useState(value === null || value === undefined ? "" : String(value));
  const yes = selection === "true";
  const no = selection === "false";
  const directEvidence = detail.evidence.filter((item) => item.questionCode === code);

  if (hidden) return null;

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <Label htmlFor={`${code}_selection`} className="leading-5">{question.label}</Label>
      <select id={`${code}_selection`} value={selection} onChange={(event) => setSelection(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md">
        <option value="">Select</option><option value="true">Yes</option><option value="false">No</option>
      </select>
      <input type="hidden" name={question.field ?? undefined} value={yes ? "true" : no ? "false" : ""} />
      {child?.({ yes })}
      {yes ? <QuestionEvidence submissionId={detail.submission.id} questionCode={code} evidence={detail.evidence} locked={locked} evidenceOptional={evidenceOptional} /> : null}
      {no && directEvidence.length > 0 ? <QuestionEvidence submissionId={detail.submission.id} questionCode={code} evidence={detail.evidence} locked={locked} stale evidenceOptional={evidenceOptional} /> : null}
    </div>
  );
}

function FinanceEntries({ initial }: { initial: Map<string, MelMonitoringDetail["financeEntries"][number]> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.keys()));
  return <div className="mt-4 rounded-md bg-slate-50 p-4"><p className="text-sm font-medium text-slate-900">Which type(s) of financial service has the enterprise accessed?</p><div className="mt-3 space-y-3">{FINANCE_TYPES.map((type) => { const checked = selected.has(type); const entry = initial.get(type); return <div key={type} className="grid gap-2 sm:grid-cols-[220px_1fr]"><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="financeTypes" value={type} checked={checked} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(type); else next.delete(type); return next; })} />{FINANCE_TYPE_LABELS[type]}</label>{checked ? <div className="grid gap-2 sm:grid-cols-2"><Field name={`financeAmount_${type}`} label={`Amount accessed — ${FINANCE_TYPE_LABELS[type]} (KES)`} type="number" min="0" step="0.01" value={entry?.amount ?? ""} />{type === "other" ? <Field name="financeOtherDescription" label="Describe the other finance type" value={entry?.otherDescription ?? ""} /> : null}</div> : null}</div>; })}</div></div>;
}

function FormSection({ number, title, help, children }: { number: string; title: string; help?: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-lg border border-slate-200 bg-background"><div className="flex gap-3 border-b bg-slate-50 px-4 py-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-xs font-bold text-brand-blue">{number}</span><div><h2 className="font-semibold text-slate-900">{title}</h2>{help ? <p className="mt-0.5 max-w-[72ch] text-xs text-slate-600">{help}</p> : null}</div></div><div className="p-4 sm:p-5">{children}</div></section>; }
function Field({
  label,
  name,
  value,
  type = "text",
  min,
  step,
  onChange,
  readOnly,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  min?: string;
  step?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const controlled = onChange !== undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="leading-5">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        min={min}
        step={step}
        value={controlled ? String(value ?? "") : undefined}
        defaultValue={controlled ? undefined : (value ?? "")}
        onChange={controlled ? (event) => onChange(event.target.value) : undefined}
        readOnly={readOnly}
      />
    </div>
  );
}
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div className="space-y-1.5"><p className="text-sm font-medium">{label}</p><p className="rounded-md border bg-slate-50 px-3 py-2 text-sm capitalize text-slate-800">{value}</p></div>; }
function BooleanField({ label, name, value }: { label: string; name: string; value: boolean | null | undefined }) { return <div className="space-y-1.5"><Label htmlFor={name} className="leading-5">{label}</Label><select id={name} name={name} defaultValue={value === null || value === undefined ? "" : String(value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select></div>; }
function TextAreaField({ label, name, value }: { label: string; name: string; value: string | null | undefined }) { return <div className="mt-3 space-y-1.5"><Label htmlFor={name} className="leading-5">{label}</Label><Textarea id={name} name={name} defaultValue={value ?? ""} rows={3} /></div>; }
function ProfileItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>; }

function ProfitFields({ detail, locked, evidenceOptional = false }: { detail: MelMonitoringDetail; locked: boolean; evidenceOptional?: boolean }) {
  const response = detail.response;
  const [revenue, setRevenue] = useState(response?.revenue ?? "");
  const [costs, setCosts] = useState(response?.costs ?? "");
  const profit = useMemo(() => revenue === "" || costs === "" ? null : Number(revenue) - Number(costs), [costs, revenue]);
  const quarterly = useMemo(
    () => (revenue === "" || costs === "" ? null : { revenue: Number(revenue), costs: Number(costs) }),
    [costs, revenue]
  );
  const baselineComparison = useMemo(() => {
    if (!quarterly || !detail.financialBaseline) return null;
    const baseline = detail.financialBaseline;
    return calculateFinancialComparison({
      quarterly,
      baseline: {
        label: "Enterprise baseline",
        revenue: Number(baseline.monthlyRevenue),
        costs: Number(baseline.monthlyCosts),
        profit: Number(baseline.monthlyProfit),
      },
      thresholdPercent: detail.financialVarianceThresholdPercent,
    });
  }, [detail.financialBaseline, detail.financialVarianceThresholdPercent, quarterly]);
  const fullComparison = useMemo(() => {
    if (!quarterly) return null;
    const baseline = detail.financialBaseline;
    return calculateFinancialComparison({
      quarterly,
      baseline: baseline
        ? {
            label: "Enterprise baseline",
            revenue: Number(baseline.monthlyRevenue),
            costs: Number(baseline.monthlyCosts),
            profit: Number(baseline.monthlyProfit),
          }
        : null,
      priorApprovedQuarter: detail.priorApprovedFinancials,
      thresholdPercent: detail.financialVarianceThresholdPercent,
    });
  }, [detail.financialBaseline, detail.financialVarianceThresholdPercent, detail.priorApprovedFinancials, quarterly]);
  const money = (value: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
  const baselineFlags = baselineComparison?.flags.filter((flag) => flag.source === "baseline" || flag.source === "current") ?? [];
  return <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="revenue">What is the enterprise TOTAL REVENUE in the past 3 months?</Label><Input id="revenue" name="revenue" type="number" min="0" step="0.01" value={revenue} onChange={(event) => setRevenue(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="costs">What is the enterprise&apos;s TOTAL COSTS in the past 3 months?</Label><Input id="costs" name="costs" type="number" min="0" step="0.01" value={costs} onChange={(event) => setCosts(event.target.value)} /></div><ReadOnlyField label="What is the enterprise’s PROFIT/LOSS (Total Revenue − Total Cost) in the past 3 months?" value={profit === null ? "Enter revenue and costs" : money(profit)} /></div>
    <QuestionEvidence submissionId={detail.submission.id} questionCode="profitability" evidence={detail.evidence} locked={locked} evidenceOptional={evidenceOptional} />
    {baselineComparison && baselineComparison.comparators.length ? <div className="rounded-md border border-blue-200 bg-blue-50/60 p-4"><p className="text-sm font-semibold text-slate-900">Individual enterprise progress against baseline</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="pb-2">Measure</th>{baselineComparison.comparators.map((item) => <th key={item.source} className="pb-2">{item.label}</th>)}<th className="pb-2">Current monthly equivalent</th></tr></thead><tbody>{(["revenue", "costs", "profit"] as const).map((measure) => <tr key={measure} className="border-t"><td className="py-2 font-medium capitalize">{measure}</td>{baselineComparison.comparators.map((item) => <td key={item.source} className="py-2 tabular-nums">{money(item.values[measure])}</td>)}<td className="py-2 tabular-nums">{money(baselineComparison.currentMonthly[measure])}</td></tr>)}</tbody></table></div>{baselineFlags.length ? <div className="mt-3 space-y-1">{baselineFlags.map((flag, index) => <p key={`${flag.code}-${flag.source}-${index}`} className="text-xs font-medium text-amber-800">• {flag.message}</p>)}</div> : <p className="mt-3 text-xs text-emerald-700">No material loss or 100% financial change was detected against the enterprise baseline.</p>}</div> : null}
    {fullComparison?.explanationRequired ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4"><Label htmlFor="financialChangeExplanation">Please explain the material loss or unusually large change from this enterprise&apos;s baseline or previous approved quarter.</Label><Textarea id="financialChangeExplanation" name="financialChangeExplanation" defaultValue={response?.financialChangeExplanation ?? ""} rows={3} minLength={10} required className="mt-2" /><p className="mt-1 text-xs text-amber-800">Required because one or more financial alert rules were triggered.</p></div> : null}
  </div>;
}
function JobsSection({
  detail,
  directQuality,
  directNonQuality,
  indirect,
  locked,
  includeRefugee,
  evidenceOptional = false,
}: {
  detail: MelMonitoringDetail;
  directQuality?: JobRow;
  directNonQuality?: JobRow;
  indirect?: JobRow;
  locked: boolean;
  includeRefugee: boolean;
  evidenceOptional?: boolean;
}) {
  const [directQualityTotal, setDirectQualityTotal] = useState(String(directQuality?.quarterlyTotal ?? ""));
  const [directNonQualityTotal, setDirectNonQualityTotal] = useState(String(directNonQuality?.quarterlyTotal ?? ""));
  const [indirectTotal, setIndirectTotal] = useState(String(indirect?.quarterlyTotal ?? ""));
  const jobsCreated =
    (Number(directQualityTotal) || 0) +
    (Number(directNonQualityTotal) || 0) +
    (Number(indirectTotal) || 0) > 0;

  return (
    <div className="space-y-6">
      <JobFields
        label="How many new direct jobs have been created by the enterprise in the past 3 months? (A direct job refers to people employed full-time, part-time or seasonally by the business and paid a minimum wage of KES 16,114 per month; daily wage = KES 775.)"
        prefix="directQuality"
        row={directQuality}
        cumulative={detail.cumulativeJobs.directQuality}
        includeRefugee={includeRefugee}
        onTotalChange={setDirectQualityTotal}
      />
      <JobFields
        label="How many new direct jobs BELOW KES 16,114 have been created by the enterprise in the past 3 months? (A direct job refers to people employed full-time, part-time or seasonally by the business and paid below KES 16,114 per month.)"
        prefix="directNonQuality"
        row={directNonQuality}
        cumulative={detail.cumulativeJobs.directNonQuality}
        includeRefugee={includeRefugee}
        onTotalChange={setDirectNonQualityTotal}
      />
      <JobFields
        label="How many new indirect jobs have been created by the enterprise in the past 3 months? (Indirect jobs include suppliers, distributors, retailers, transporters, service providers and other people engaged by the business.)"
        prefix="indirect"
        row={indirect}
        cumulative={detail.cumulativeJobs.indirect}
        includeRefugee={includeRefugee}
        onTotalChange={setIndirectTotal}
      />
      {jobsCreated ? (
        <QuestionEvidence submissionId={detail.submission.id} questionCode="jobs" evidence={detail.evidence} locked={locked} evidenceOptional={evidenceOptional} />
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {evidenceOptional
            ? "No jobs evidence is needed when all direct and indirect totals are 0."
            : "No jobs evidence is required when all direct and indirect totals are 0."}
        </p>
      )}
    </div>
  );
}

function JobFields({
  label,
  prefix,
  row,
  cumulative,
  includeRefugee,
  onTotalChange,
}: {
  label: string;
  prefix: string;
  row?: JobRow;
  cumulative: MelMonitoringDetail["cumulativeJobs"]["directQuality"];
  includeRefugee: boolean;
  onTotalChange: (value: string) => void;
}) {
  const [total, setTotal] = useState(String(row?.quarterlyTotal ?? ""));
  const zeroTotal = total === "0";
  const dimensions = [
    ["Male", "Male", row?.male],
    ["Female", "Female", row?.female],
    ["Youth (18–35)", "Youth", row?.youth],
    ["PLWD", "Plwd", row?.plwd],
    ...(includeRefugee ? [["Refugee", "Refugee", row?.refugee] as const] : []),
  ] as const;

  const handleTotalChange = (value: string) => {
    setTotal(value);
    onTotalChange(value);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="max-w-[75ch] text-sm font-semibold leading-5 text-slate-900">{label}</h3>
        <p className="text-xs text-slate-600">
          Approved cumulative total: <span className="font-semibold text-slate-900">{cumulative.total}</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-500">Enter 0 in Total if no new jobs were created this quarter.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field
          name={`${prefix}Total`}
          label="Total"
          type="number"
          min="0"
          step="1"
          value={total}
          onChange={handleTotalChange}
        />
        {zeroTotal
          ? dimensions.map(([, suffix]) => (
              <input key={suffix} type="hidden" name={`${prefix}${suffix}`} value="0" />
            ))
          : dimensions.map(([display, suffix, value]) => (
              <Field
                key={suffix}
                name={`${prefix}${suffix}`}
                label={display}
                type="number"
                min="0"
                step="1"
                value={value ?? ""}
              />
            ))}
      </div>
    </div>
  );
}

function formatSavedAt(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(value);
}
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
