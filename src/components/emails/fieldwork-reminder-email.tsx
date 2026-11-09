import { Button, Section, Text } from "@react-email/components";
import { FieldworkEmailLayout } from "./fieldwork-email-layout";

export interface FieldworkReminderEmailProps {
  firstName: string;
  reportsDue: { enterprise: string; status: string }[];
  missedReasonsDue: { enterprise: string }[];
  openTodayCount: number;
  executionUrl: string;
}

export const FieldworkReminderEmail = ({
  firstName = "there",
  reportsDue = [],
  missedReasonsDue = [],
  openTodayCount = 0,
  executionUrl = "https://bire-platform.org/fieldwork/execution",
}: FieldworkReminderEmailProps) => {
  const total = reportsDue.length + missedReasonsDue.length;
  return (
    <FieldworkEmailLayout
      preview={total ? `You have ${total} pending fieldwork item${total === 1 ? "" : "s"}` : "Fieldwork visits still open today"}
      eyebrow="End-of-day reminder"
      title={total ? `${total} pending fieldwork item${total === 1 ? "" : "s"}` : "Visits still open today"}
    >
      <Text className="text-slate-600 text-[15px] leading-[24px] mt-0">Hello {firstName},</Text>

      {total > 0 && (
        <Text className="text-slate-600 text-[15px] leading-[24px]">
          You have <strong>{reportsDue.length}</strong> report{reportsDue.length === 1 ? "" : "s"} and <strong>{missedReasonsDue.length}</strong> missed-visit reason{missedReasonsDue.length === 1 ? "" : "s"} outstanding.
          New visit plans are blocked until these are done.
        </Text>
      )}

      {reportsDue.length > 0 && (
        <Section className="bg-slate-50 border border-solid border-slate-200 rounded-xl p-[16px] mb-[12px]">
          <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-[8px]">Reports due</Text>
          {reportsDue.map((r, i) => (
            <Text key={i} className="text-[14px] text-slate-800 m-0 mb-[4px]">{r.enterprise} <span style={{ color: "#94a3b8" }}>({r.status})</span></Text>
          ))}
        </Section>
      )}

      {missedReasonsDue.length > 0 && (
        <Section className="bg-slate-50 border border-solid border-slate-200 rounded-xl p-[16px] mb-[12px]">
          <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-[8px]">Reason needed for missed visit</Text>
          {missedReasonsDue.map((m, i) => (
            <Text key={i} className="text-[14px] text-slate-800 m-0 mb-[4px]">{m.enterprise}</Text>
          ))}
        </Section>
      )}

      {openTodayCount > 0 && (
        <Text className="text-slate-600 text-[15px] leading-[24px]">
          <strong>{openTodayCount}</strong> visit{openTodayCount === 1 ? "" : "s"} scheduled for today {openTodayCount === 1 ? "is" : "are"} not yet completed. Check out, or record a reason if {openTodayCount === 1 ? "it" : "they"} did not happen.
        </Text>
      )}

      <Section className="text-center my-[20px]">
        <Button href={executionUrl} className="bg-brand-blue text-white font-semibold text-sm rounded-lg px-6 py-3 no-underline">
          Open visit execution
        </Button>
      </Section>
    </FieldworkEmailLayout>
  );
};

export default FieldworkReminderEmail;
