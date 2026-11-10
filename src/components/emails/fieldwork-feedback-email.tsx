import { Section, Text } from "@react-email/components";
import { FieldworkEmailLayout } from "./fieldwork-email-layout";

export interface FieldworkFeedbackEmailProps {
  enterpriseName: string;
  visitDate: string;
  officerName: string;
  agenda: string;
  /** Report "activities conducted": the session highlights. */
  activities: string;
  /** Report "findings and gaps". */
  findings: string;
  recommendations: string;
  actionPoints: string;
  timeline: string;
}

type Tone = { bar: string; bg: string; label: string };
const TONES: Record<"highlights" | "gaps" | "recommendations" | "actions", Tone> = {
  highlights: { bar: "#0B5FBA", bg: "#f1f5f9", label: "#0B5FBA" },
  gaps: { bar: "#d97706", bg: "#fffbeb", label: "#b45309" },
  recommendations: { bar: "#4f46e5", bg: "#eef2ff", label: "#4338ca" },
  actions: { bar: "#059669", bg: "#ecfdf5", label: "#047857" },
};

const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+/;
const lines = (value: string) => value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Renders text as paragraphs, or as a tidy list when most lines are already bullets or numbered. */
function Body({ value }: { value: string }) {
  const rows = lines(value);
  const listLike = rows.length > 1 && rows.filter((r) => BULLET.test(r)).length >= Math.ceil(rows.length / 2);
  return (
    <>
      {rows.map((row, i) => (
        <Text key={i} className="text-[14px] leading-[22px] text-slate-700 m-0 mb-[8px]">
          {listLike ? <span style={{ color: "#64748b" }}>•&nbsp;&nbsp;</span> : null}
          {listLike ? row.replace(BULLET, "") : row}
        </Text>
      ))}
    </>
  );
}

function Panel({ tone, number, heading, children }: { tone: Tone; number: number; heading: string; children: React.ReactNode }) {
  return (
    <Section style={{ backgroundColor: tone.bg, borderLeft: `4px solid ${tone.bar}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
      <Text style={{ color: tone.label }} className="text-[12px] uppercase font-bold tracking-wider m-0 mb-[8px]">
        {number}. {heading}
      </Text>
      {children}
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
  <FieldworkEmailLayout preview={`Summary of your BIRE session${visitDate ? ` on ${visitDate}` : ""}: highlights, gaps, recommendations and action points`} eyebrow="Session summary" title={enterpriseName}>
    <Text className="text-slate-600 text-[15px] leading-[24px] mt-0">
      Thank you for meeting with {officerName}{visitDate ? ` on ${visitDate}` : ""}. Here is a summary of what the session covered, what we noticed, and what we suggest you do next.
    </Text>

    {agenda ? (
      <Text className="text-[13px] leading-[20px] text-slate-500 mt-0 mb-[16px]">
        <strong>Session focus:</strong> {agenda}
      </Text>
    ) : null}

    <Panel tone={TONES.highlights} number={1} heading="Session highlights"><Body value={activities} /></Panel>
    <Panel tone={TONES.gaps} number={2} heading="Gaps identified"><Body value={findings} /></Panel>
    <Panel tone={TONES.recommendations} number={3} heading="Our recommendations"><Body value={recommendations} /></Panel>
    <Panel tone={TONES.actions} number={4} heading="Action points">
      <Body value={actionPoints} />
      {timeline ? (
        <Text className="text-[13px] text-slate-600 m-0 mt-[4px]">
          <strong>Timeline:</strong> {timeline}
        </Text>
      ) : null}
    </Panel>

    <Text className="text-[13px] leading-[20px] text-slate-500 mt-[4px]">
      If anything here looks incorrect or you would like to discuss it, please reply to your business advisor or contact the BIRE team.
    </Text>
  </FieldworkEmailLayout>
);

export default FieldworkFeedbackEmail;
