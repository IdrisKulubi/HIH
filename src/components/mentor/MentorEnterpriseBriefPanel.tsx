import Link from "next/link";
import type { MentorEnterpriseBrief } from "@/lib/mentorship/mentor-enterprise-brief";

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ContactRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">
        {href ? (
          <a href={href} className="text-emerald-800 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function MentorEnterpriseBriefPanel({
  businessId,
  enterprise,
}: {
  businessId: number;
  enterprise: MentorEnterpriseBrief | null;
}) {
  if (!enterprise) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Enterprise profile details are not available yet.
      </p>
    );
  }

  const openGaps = enterprise.mentorGaps.filter((gap) => gap.status === "open");
  const plannedActivities = enterprise.mentorActivities.filter(
    (activity) => activity.intervention.trim().length > 0
  );

  return (
    <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Enterprise profile &amp; mentorship focus</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Use these contacts for scheduling sessions. Gaps and interventions come from the capacity development plan (TA workstream).
          </p>
        </div>
        <Link
          href={`/mentor/cna/${businessId}`}
          className="text-xs font-medium text-emerald-800 hover:underline"
        >
          Open TA CNA review
        </Link>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ContactRow label="Primary email" value={enterprise.applicantEmail} href={`mailto:${enterprise.applicantEmail}`} />
        <ContactRow label="Primary phone" value={enterprise.applicantPhone} href={`tel:${enterprise.applicantPhone}`} />
        <ContactRow
          label="Location"
          value={[enterprise.city, enterprise.county ? humanize(enterprise.county) : null].filter(Boolean).join(", ")}
        />
        <ContactRow label="Sector" value={humanize(enterprise.sector)} />
        <ContactRow label="Track" value={enterprise.track ? humanize(enterprise.track) : null} />
        {enterprise.secondaryContactName ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Secondary contact (KYC)</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{enterprise.secondaryContactName}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {[enterprise.secondaryContactPhone, enterprise.secondaryContactEmail].filter(Boolean).join(" · ") ||
                "No phone or email recorded"}
            </p>
          </div>
        ) : null}
      </dl>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Gaps mentorship should address
          {enterprise.cdpPlanStatus ? ` · CDP ${enterprise.cdpPlanStatus}` : ""}
        </p>
        {openGaps.length > 0 ? (
          <ul className="space-y-2">
            {openGaps.map((gap) => (
              <li key={gap.id} className="rounded-md border border-white bg-white/90 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">
                  {gap.focusName}{" "}
                  <span className="text-xs font-normal text-slate-500">({gap.priority} priority)</span>
                </p>
                <p className="mt-1 text-slate-700">{gap.questionText}</p>
                {gap.reviewerComment ? (
                  <p className="mt-1 text-xs text-slate-600">Reviewer note: {gap.reviewerComment}</p>
                ) : null}
                {gap.recommendedIntervention ? (
                  <p className="mt-1 text-xs text-emerald-900">
                    Recommended: {gap.recommendedIntervention}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : enterprise.mentorGaps.length > 0 ? (
          <p className="text-sm text-slate-600">
            All TA gaps on the current plan are converted or dismissed. See planned interventions below.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            No TA gaps are on the capacity development plan yet. Complete the TA CNA review or ask the CDP lead to activate a plan.
          </p>
        )}
      </div>

      {plannedActivities.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned TA interventions</p>
          <ul className="space-y-2">
            {plannedActivities.map((activity) => (
              <li key={activity.id} className="rounded-md border border-white bg-white/90 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">Focus {activity.focusCode}</p>
                {activity.gapChallenge ? (
                  <p className="mt-1 text-slate-700">Gap: {activity.gapChallenge}</p>
                ) : null}
                <p className="mt-1 text-slate-800">{activity.intervention}</p>
                {activity.targetDate ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Target: {new Date(`${activity.targetDate}T00:00:00`).toLocaleDateString()}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
