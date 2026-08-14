import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ApprovalLearningActionItem, ApprovalPriorityItem } from "@/lib/mel/approval-priorities";
import { groupApprovalPrioritiesBySection } from "@/lib/mel/approval-priorities";

export interface MelReportApprovedEmailProps {
  collectorName: string;
  businessName: string;
  periodLabel: string;
  approvedDate: string;
  reportUrl: string;
  priorities: ApprovalPriorityItem[];
  learningActions: ApprovalLearningActionItem[];
  reviewerNote?: string;
}

export const MelReportApprovedEmail = ({
  collectorName = "Programme staff",
  businessName = "Enterprise",
  periodLabel = "Reporting period",
  approvedDate = "2026-08-08",
  reportUrl = "https://bire-platform.org/admin/mel/monitoring",
  priorities = [],
  learningActions = [],
  reviewerNote,
}: MelReportApprovedEmailProps) => {
  const groupedPriorities = groupApprovalPrioritiesBySection(priorities);
  const preview =
    priorities.length > 0
      ? `${businessName} verified — ${priorities.length} area(s) to prioritize next quarter`
      : `${businessName} monitoring report verified`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: {
                  blue: "#0B5FBA",
                  teal: "#00D0AB",
                  dark: "#1e293b",
                },
              },
            },
          },
        }}
      >
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[24px] max-w-[560px] bg-white shadow-xl">
            <Section className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full mx-auto flex items-center justify-center text-2xl border border-emerald-100">
                ✓
              </div>
            </Section>

            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[8px] mx-0 tracking-tight">
              Monitoring report verified
            </Heading>

            <Text className="text-slate-600 text-[15px] leading-[24px] text-center mb-6">
              Hello {collectorName}, your report for <strong>{businessName}</strong> has been fully
              verified for <strong>{periodLabel}</strong>.
            </Text>

            <Section className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
              <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-3">
                Report summary
              </Text>
              <Text className="text-sm text-slate-700 m-0">
                <strong>Enterprise:</strong> {businessName}
              </Text>
              <Text className="text-sm text-slate-700 m-0 mt-1">
                <strong>Period:</strong> {periodLabel}
              </Text>
              <Text className="text-sm text-slate-700 m-0 mt-1">
                <strong>Verified on:</strong> {approvedDate}
              </Text>
            </Section>

            <Section className="mb-5">
              <Text className="text-[12px] uppercase font-bold text-brand-blue tracking-wider m-0 mb-3">
                Priority for next quarter
              </Text>
              {priorities.length === 0 ? (
                <Text className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4 m-0">
                  All tracked outcome questions were achieved this quarter. Keep supporting the
                  enterprise on continuity and growth.
                </Text>
              ) : (
                groupedPriorities.map((group) => (
                  <Section key={group.sectionLabel} className="mb-3">
                    <Text className="text-sm font-semibold text-slate-800 m-0 mb-2">
                      {group.sectionLabel}
                    </Text>
                    {group.items.map((item) => (
                      <Text key={item.code} className="text-sm text-slate-600 m-0 mb-1 pl-3">
                        •{" "}
                        {item.status === "not_achieved" ? "Not yet achieved" : "Not answered"} —{" "}
                        {shortLabel(item.label)}
                      </Text>
                    ))}
                  </Section>
                ))
              )}
              <Text className="text-sm text-slate-700 m-0 mt-4">
                Please link the entrepreneur to a mentor for specialized support where necessary.
              </Text>
            </Section>

            {reviewerNote ? (
              <Section className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                <Text className="text-sm font-semibold text-blue-900 m-0 mb-2">Reviewer note</Text>
                <Text className="text-sm text-blue-800 m-0">{reviewerNote}</Text>
              </Section>
            ) : null}

            {learningActions.length > 0 ? (
              <Section className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <Text className="text-sm font-semibold text-amber-900 m-0 mb-2">
                  Open learning actions
                </Text>
                {learningActions.map((action, index) => (
                  <Text key={index} className="text-sm text-amber-900 m-0 mb-2">
                    <strong>{action.finding}</strong>
                    <br />
                    Action: {action.agreedAction}
                  </Text>
                ))}
              </Section>
            ) : null}

            <Section className="text-center my-6">
              <Button
                href={reportUrl}
                className="bg-brand-blue text-white font-semibold text-sm rounded-lg px-6 py-3 no-underline"
              >
                View report (read-only)
              </Button>
            </Section>

            <Text className="text-xs text-slate-500 text-center m-0">
              The report is locked for editing. Use it as a reference when planning next quarter&apos;s
              visit.
            </Text>

            <Hr className="border-slate-200 my-6" />

            <Text className="text-xs text-slate-400 text-center m-0">
              BIRE Programme — Monitoring, Evaluation &amp; Learning
              <br />
              Need help? Contact your REDO or MEL focal point.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

function shortLabel(label: string): string {
  const trimmed = label.replace(/\?$/, "").trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

export default MelReportApprovedEmail;

MelReportApprovedEmail.PreviewProps = {
  collectorName: "Jane EDO",
  businessName: "Green Harvest Ltd",
  periodLabel: "Y1-MQ1 (Jun–Aug 2026)",
  approvedDate: "8 August 2026",
  reportUrl: "http://localhost:3000/admin/mel/monitoring/1/3",
  priorities: [
    {
      section: "F",
      sectionLabel: "Financial Linkages",
      code: "linked_to_finance_provider",
      label: "Has the enterprise been linked to a financial service provider in the past 3 months?",
      status: "not_achieved" as const,
    },
    {
      section: "E",
      sectionLabel: "Market Access and Innovation",
      code: "market_research_completed",
      label: "Has the enterprise conducted a market research survey in the last 3 months?",
      status: "not_answered" as const,
    },
  ],
  learningActions: [
    {
      finding: "Financial records incomplete",
      agreedAction: "Schedule finance coaching before next visit",
    },
  ],
  reviewerNote: "Prioritize finance linkages and market research in the next quarter.",
};
