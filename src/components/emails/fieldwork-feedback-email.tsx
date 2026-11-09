import { Section, Text } from "@react-email/components";
import { FieldworkEmailLayout } from "./fieldwork-email-layout";

export interface FieldworkFeedbackEmailProps {
  enterpriseName: string;
  visitDate: string;
  officerName: string;
  agenda: string;
  activities: string;
  findings: string;
  recommendations: string;
  actionPoints: string;
  timeline: string;
}

const paragraphs = (value: string) => value.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);

function Block({ heading, body }: { heading: string; body: string }) {
  return (
    <Section className="mb-[16px]">
      <Text className="text-[12px] uppercase font-bold text-brand-blue tracking-wider m-0 mb-[6px]">{heading}</Text>
      {paragraphs(body).map((p, i) => (
        <Text key={i} className="text-[14px] leading-[22px] text-slate-700 m-0 mb-[8px]">{p}</Text>
      ))}
    </Section>
  );
}

export const FieldworkFeedbackEmail = ({
  enterpriseName = "Your enterprise",
  visitDate = "",
  officerName = "Your business advisor",
  agenda = "",
  activities = "",
  findings = "",
  recommendations = "",
  actionPoints = "",
  timeline = "",
}: FieldworkFeedbackEmailProps) => (
  <FieldworkEmailLayout preview={`Feedback from your BIRE field visit${visitDate ? ` on ${visitDate}` : ""}`} eyebrow="Field visit feedback" title={enterpriseName}>
    <Text className="text-slate-600 text-[15px] leading-[24px] mt-0">
      Thank you for hosting {officerName}{visitDate ? ` on ${visitDate}` : ""}. Below is a summary of the visit and what we recommend next.
    </Text>

    <Section className="bg-slate-50 border border-solid border-slate-200 rounded-xl p-[16px] mb-[16px]">
      <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0">Visit agenda</Text>
      <Text className="text-[14px] leading-[22px] text-slate-800 m-0 mt-[4px]">{agenda}</Text>
    </Section>

    <Block heading="What we did" body={activities} />
    <Block heading="What we found" body={findings} />
    <Block heading="Our recommendations" body={recommendations} />

    <Section className="bg-blue-50 border border-solid border-blue-100 rounded-xl p-[16px] mb-[16px]">
      <Text className="text-[12px] uppercase font-bold text-brand-blue tracking-wider m-0">Agreed next steps</Text>
      <Text className="text-[14px] leading-[22px] text-slate-800 m-0 mt-[6px]">{actionPoints}</Text>
      <Text className="text-[13px] text-slate-600 m-0 mt-[6px]"><strong>Timeline:</strong> {timeline}</Text>
    </Section>

    <Text className="text-[13px] leading-[20px] text-slate-500">
      If anything here looks incorrect, reply to your business advisor or contact the BIRE team.
    </Text>
  </FieldworkEmailLayout>
);

export default FieldworkFeedbackEmail;
