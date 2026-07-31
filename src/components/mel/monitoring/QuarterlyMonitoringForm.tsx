"use client";

import { useActionState, useMemo, useState } from "react";
import type { MelMonitoringDetail } from "@/lib/actions/mel-monitoring";
import { saveMelMonitoringAction } from "@/lib/actions/mel-monitoring";
import { WASTE_STREAMS } from "@/lib/mel/monitoring-validation";
import { isCollectorEditableStatus } from "@/lib/mel/review-workflow";
import { MonitoringEvidence } from "./MonitoringEvidence";
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

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="submissionId" value={detail.submission.id} />
      <fieldset disabled={locked || pending} className="space-y-6">
        <FormSection number="0" title="Visit and collector">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visit date" name="visitDate" type="date" value={detail.submission.visitDate ?? ""} />
            <ReadOnlyField label="Collector role" value={detail.submission.collectorRole.replaceAll("_", " ")} />
          </div>
        </FormSection>

        <FormSection number="A" title="Enterprise profile" help="Read-only snapshot from the enterprise application and KYC record.">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <ProfileItem label="Enterprise ID" value={`#${detail.profile.enterpriseId}`} />
            <ProfileItem label="Enterprise name" value={detail.profile.businessName} />
            <ProfileItem label="Owner" value={detail.profile.applicantName} />
            <ProfileItem label="Gender" value={detail.profile.applicantGender} />
            <ProfileItem label="Sector" value={humanize(detail.profile.sector)} />
            <ProfileItem label="Track" value={humanize(detail.profile.track ?? "not assigned")} />
            <ProfileItem label="County" value={humanize(detail.profile.county ?? "not recorded")} />
            <ProfileItem label="Location" value={detail.profile.city} />
            <ProfileItem label="Youth category" value={youthCategory(detail.profile.applicantDob)} />
          </dl>
        </FormSection>

        <FormSection number="B" title="Enterprise capacity">
          <OneTimeBoolean
            name="businessPlanImproved"
            label="Has the business plan been reviewed and improved?"
            value={response?.businessPlanImproved}
            skipped={detail.approvedOneTimeCodes.includes("business_plan_improved")}
          />
        </FormSection>

        <FormSection number="C" title="Profitability" help="Enter totals for this reporting period in Kenya shillings. Profit or loss is calculated automatically.">
          <ProfitFields response={response} />
        </FormSection>

        <FormSection number="D" title="Jobs" help="Youth, PLWD and refugee figures may overlap with male and female totals.">
          <div className="space-y-5">
            <JobFields label="Direct jobs" prefix="direct" row={direct} cumulative={detail.cumulativeJobs.direct} includeRefugee={detail.includeRefugee} />
            <JobFields label="Indirect jobs" prefix="indirect" row={indirect} cumulative={detail.cumulativeJobs.indirect} includeRefugee={detail.includeRefugee} />
          </div>
        </FormSection>

        <FormSection number="E" title="Market access and innovation">
          <div className="grid gap-4 sm:grid-cols-2">
            <BooleanField name="marketResearchCompleted" label="Market research completed?" value={response?.marketResearchCompleted} />
            <BooleanField name="marketIntelligenceAccessed" label="Market intelligence accessed?" value={response?.marketIntelligenceAccessed} />
            <Field name="newMarketSegments" label="New market segments entered" type="number" min="0" value={response?.newMarketSegments ?? ""} />
            <BooleanField name="technologyAdopted" label="New technology or innovation adopted?" value={response?.technologyAdopted} />
            <TextAreaField name="technologyDetails" label="Technology or innovation details (required when Yes)" value={response?.technologyDetails} />
            <BooleanField name="newProductsDeveloped" label="New products or services developed?" value={response?.newProductsDeveloped} />
            <TextAreaField name="newProductsDetails" label="New product or service details (required when Yes)" value={response?.newProductsDetails} />
          </div>
        </FormSection>

        <FormSection number="F" title="Financial linkages">
          <div className="grid gap-4 sm:grid-cols-2">
            <BooleanField name="linkedToFinanceProvider" label="Linked to a financial-service provider?" value={response?.linkedToFinanceProvider} />
            <SelectField name="financeType" label="Type of finance" value={response?.financeType} options={["grant", "matching_grant", "loan", "equity", "insurance", "other"]} />
            <Field name="financeValue" label="Value accessed (KES)" type="number" min="0" step="0.01" value={response?.financeValue ?? ""} />
            <Field name="financeTypeOther" label="Other finance type" value={response?.financeTypeOther ?? ""} />
            <OneTimeBoolean name="financialPlanCompleted" label="Feasible financial plan completed?" value={response?.financialPlanCompleted} skipped={detail.approvedOneTimeCodes.includes("financial_plan_completed")} />
            <BooleanField name="activeInsurance" label="Active insurance policy?" value={response?.activeInsurance} />
            <OneTimeBoolean name="investorReadinessCompleted" label="Investor-readiness training completed?" value={response?.investorReadinessCompleted} skipped={detail.approvedOneTimeCodes.includes("investor_readiness_completed")} />
          </div>
        </FormSection>

        <FormSection number="G" title="Green growth and sustainability">
          <div className="grid gap-4 sm:grid-cols-2">
            <OneTimeBoolean name="lifeCycleAssessmentCompleted" label="Product life-cycle assessment completed?" value={response?.lifeCycleAssessmentCompleted} skipped={detail.approvedOneTimeCodes.includes("life_cycle_assessment_completed")} />
            <BooleanField name="ecoCertificationActive" label="Active eco-certification or compliance certificate?" value={response?.ecoCertificationActive} />
            <OneTimeBoolean name="esgReportCompleted" label="ESG sustainability report completed?" value={response?.esgReportCompleted} skipped={detail.approvedOneTimeCodes.includes("esg_report_completed")} />
            <OneTimeBoolean name="socialSafeguardingGuidelines" label="Social safeguarding guidelines in place?" value={response?.socialSafeguardingGuidelines} skipped={detail.approvedOneTimeCodes.includes("social_safeguarding_guidelines")} />
            <BooleanField name="circularGrowthReported" label="Circular-economy cost saving or revenue growth?" value={response?.circularGrowthReported} />
            <Field name="circularGrowthValue" label="Attributed saving or growth (KES)" type="number" min="0" step="0.01" value={response?.circularGrowthValue ?? ""} />
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-900">Waste collected and recycled (kg)</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {WASTE_STREAMS.map((stream) => <Field key={stream} name={`waste_${stream}`} label={humanize(stream)} type="number" min="0" step="0.001" value={waste[stream] ?? "0"} />)}
            </div>
          </div>
        </FormSection>

        <FormSection number="H" title="Partnerships and policy engagement">
          <div className="grid gap-4 sm:grid-cols-2">
            <BooleanField name="strategicPartnerships" label="New strategic partnership established?" value={response?.strategicPartnerships} />
            <TextAreaField name="strategicPartnershipDetails" label="Strategic partner details" value={response?.strategicPartnershipDetails} />
            <BooleanField name="forumParticipation" label="Participated in a project-facilitated forum?" value={response?.forumParticipation} />
            <TextAreaField name="forumDetails" label="Forum details" value={response?.forumDetails} />
            <BooleanField name="publicPrivatePartnership" label="Project-facilitated public-private partnership?" value={response?.publicPrivatePartnership} />
            <TextAreaField name="publicPrivatePartnershipDetails" label="Public-private partnership details" value={response?.publicPrivatePartnershipDetails} />
          </div>
        </FormSection>

        <FormSection number="I" title="Feedback and support needs">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField name="mainChallenges" label="Main challenges" value={response?.mainChallenges} />
            <TextAreaField name="negativeProgrammeImpacts" label="Negative direct or indirect programme impacts" value={response?.negativeProgrammeImpacts} />
            <TextAreaField name="additionalSupportNeeded" label="Additional support needed" value={response?.additionalSupportNeeded} />
            <TextAreaField name="collectorComment" label="EDO or REDO overall comment" value={response?.collectorComment} />
          </div>
        </FormSection>
      </fieldset>

      <FormSection number="J" title="Supporting evidence" help="Attach evidence to the result it supports. Submitted evidence is locked.">
        <MonitoringEvidence submissionId={detail.submission.id} evidence={detail.evidence} locked={locked} />
      </FormSection>

      {!locked ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
            <ActionMessage state={state} />
            <div className="ml-auto flex gap-2">
              <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
                {pending ? "Saving…" : "Save draft"}
              </Button>
              <Button type="submit" name="intent" value="submit" disabled={pending} className="bg-brand-blue hover:bg-brand-blue-dark">
                {pending ? "Validating…" : "Submit for review"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Submitted reports are read-only until Phase 3 review returns them for changes.
        </div>
      )}
    </form>
  );
}

function FormSection({ number, title, help, children }: { number: string; title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="flex gap-3 border-b bg-slate-50 px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-xs font-bold text-brand-blue">{number}</span>
        <div><h2 className="font-semibold text-slate-900">{title}</h2>{help ? <p className="mt-0.5 text-xs text-slate-500">{help}</p> : null}</div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({ label, name, value, type = "text", min, step }: { label: string; name: string; value?: string | number; type?: string; min?: string; step?: string }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} min={min} step={step} defaultValue={value} /></div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1.5"><p className="text-sm font-medium">{label}</p><p className="rounded-md border bg-slate-50 px-3 py-2 text-sm capitalize text-slate-700">{value}</p></div>;
}

function BooleanField({ label, name, value }: { label: string; name: string; value: boolean | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={value === null || value === undefined ? "" : String(value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Select</option><option value="true">Yes</option><option value="false">No</option>
      </select>
    </div>
  );
}

function OneTimeBoolean({ skipped, ...props }: Parameters<typeof BooleanField>[0] & { skipped: boolean }) {
  if (skipped) return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-medium">{props.label}</p><p className="mt-1 text-xs">Already achieved and approved in an earlier period. No repeat entry is required.</p></div>;
  return <BooleanField {...props} />;
}

function TextAreaField({ label, name, value }: { label: string; name: string; value: string | null | undefined }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} defaultValue={value ?? ""} rows={3} /></div>;
}

function SelectField({ label, name, value, options }: { label: string; name: string; value: string | null | undefined; options: string[] }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={value ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select</option>{options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}</select></div>;
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>;
}

function ProfitFields({ response }: { response: ResponseRow | null }) {
  const [revenue, setRevenue] = useState(response?.revenue ?? "");
  const [costs, setCosts] = useState(response?.costs ?? "");
  const profit = useMemo(() => {
    if (revenue === "" || costs === "") return null;
    return Number(revenue) - Number(costs);
  }, [costs, revenue]);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="revenue">Revenue (KES)</Label><Input id="revenue" name="revenue" type="number" min="0" step="0.01" value={revenue} onChange={(event) => setRevenue(event.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="costs">Costs (KES)</Label><Input id="costs" name="costs" type="number" min="0" step="0.01" value={costs} onChange={(event) => setCosts(event.target.value)} /></div>
      <ReadOnlyField label="Calculated profit or loss" value={profit === null ? "Enter revenue and costs" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(profit)} />
      <TextAreaField name="financialChangeExplanation" label="Explanation for a material loss or unusual change" value={response?.financialChangeExplanation} />
    </div>
  );
}

function JobFields({ label, prefix, row, cumulative, includeRefugee }: { label: string; prefix: string; row?: JobRow; cumulative: MelMonitoringDetail["cumulativeJobs"]["direct"]; includeRefugee: boolean }) {
  const fields = [["Total", "Total", row?.quarterlyTotal], ["Male", "Male", row?.male], ["Female", "Female", row?.female], ["Youth", "Youth", row?.youth], ["PLWD", "Plwd", row?.plwd], ...(includeRefugee ? [["Refugee", "Refugee", row?.refugee] as const] : [])] as const;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{label}</h3><p className="text-xs text-slate-500">Approved cumulative total: <span className="font-semibold text-slate-800">{cumulative.total}</span></p></div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map(([display, suffix, value]) => <Field key={suffix} name={`${prefix}${suffix}`} label={display} type="number" min="0" step="1" value={value ?? ""} />)}
      </div>
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function youthCategory(dob: Date) {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000);
  return age <= 35 ? `Youth (${age})` : `Over 35 (${age})`;
}
