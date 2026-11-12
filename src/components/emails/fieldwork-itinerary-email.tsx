import { Button, Section, Text } from "@react-email/components";
import { FieldworkEmailLayout } from "./fieldwork-email-layout";

export interface FieldworkItineraryVisit {
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  enterprise: string;
  location: string;
  agenda: string;
  outcomes?: string[];
  officers: string[];
}

export interface FieldworkItineraryEmailProps {
  planTitle: string;
  audience: "edo" | "redo" | "esm";
  plannedBy: string;
  visits: FieldworkItineraryVisit[];
  timeZone: string;
  revised?: boolean;
  planUrl: string;
}

const INTRO: Record<FieldworkItineraryEmailProps["audience"], string> = {
  edo: "Your visit plan has been approved. Here is your itinerary.",
  redo: "You approved this visit plan. A copy of the itinerary is below for your records.",
  esm: "A field visit plan has been approved. The itinerary is shared with you for information.",
};

export const FieldworkItineraryEmail = ({
  planTitle = "Visit plan",
  audience = "edo",
  plannedBy = "Field officer",
  visits = [],
  timeZone = "Africa/Nairobi",
  planUrl = "https://bire-platform.org/fieldwork",
  revised = false,
}: FieldworkItineraryEmailProps) => (
  <FieldworkEmailLayout preview={`${revised ? "Revised" : "Approved"} itinerary: ${planTitle} (${visits.length} visit${visits.length === 1 ? "" : "s"})`} eyebrow={revised ? "Itinerary revised" : "Itinerary approved"} title={planTitle}>
    <Text className="text-slate-600 text-[15px] leading-[24px] mt-0">{revised ? "This plan was changed and approved again. Please use the updated itinerary below instead of the earlier one." : INTRO[audience]}</Text>
    <Text className="text-slate-500 text-[13px] m-0 mb-[16px]">
      Planned by <strong>{plannedBy}</strong> · {visits.length} visit{visits.length === 1 ? "" : "s"} · Times in {timeZone}
    </Text>

    {visits.map((visit, index) => (
      <Section key={`${visit.enterprise}-${index}`} className="bg-slate-50 border border-solid border-slate-200 rounded-xl p-[16px] mb-[12px]">
        <Text className="text-[12px] uppercase font-bold text-brand-blue tracking-wider m-0">
          {visit.dateLabel} · {visit.timeLabel} · {visit.durationMinutes} min
        </Text>
        <Text className="text-[16px] font-bold text-slate-900 m-0 mt-[4px]">{visit.enterprise}</Text>
        {visit.location ? <Text className="text-[13px] text-slate-500 m-0">{visit.location}</Text> : null}
        <Text className="text-[14px] leading-[22px] text-slate-700 m-0 mt-[8px]">
          <strong>Agenda:</strong> {visit.agenda}
        </Text>
        {visit.outcomes?.length ? (
          <Text className="text-[13px] leading-[20px] text-slate-600 m-0 mt-[4px]">
            <strong>Programme outcomes:</strong> {visit.outcomes.join("; ")}
          </Text>
        ) : null}
        {visit.officers.length ? (
          <Text className="text-[13px] text-slate-600 m-0 mt-[4px]">
            <strong>Field officers:</strong> {visit.officers.join(", ")}
          </Text>
        ) : null}
      </Section>
    ))}

    <Section className="text-center my-[20px]">
      <Button href={planUrl} className="bg-brand-blue text-white font-semibold text-sm rounded-lg px-6 py-3 no-underline">
        View plan
      </Button>
    </Section>
  </FieldworkEmailLayout>
);

export default FieldworkItineraryEmail;
