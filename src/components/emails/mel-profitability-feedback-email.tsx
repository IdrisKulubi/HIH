import {
  Body,
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
import type { EnterpriseProfitabilityFeedback } from "@/lib/mel/profitability-feedback";
import { formatKes } from "@/lib/mel/profitability-feedback";

export interface MelProfitabilityFeedbackEmailProps {
  ownerName: string;
  businessName: string;
  periodLabel: string;
  feedback: EnterpriseProfitabilityFeedback;
  portalUrl: string;
  trialNote?: string | null;
}

function formatChangeAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatKes(value)}`;
}

function formatChangePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export const MelProfitabilityFeedbackEmail = ({
  ownerName = "Enterprise owner",
  businessName = "Your enterprise",
  periodLabel = "Monitoring period",
  feedback,
  portalUrl = "https://bire-platform.org",
  trialNote = null,
}: MelProfitabilityFeedbackEmailProps) => {
  const sampleFeedback: EnterpriseProfitabilityFeedback = feedback ?? {
    periodLabel,
    businessId: 0,
    businessName,
    rows: [
      {
        key: "revenue",
        label: "Revenue",
        baseline: 100_000,
        monitoring: 110_000,
        changeAmount: 10_000,
        changePercent: 10,
      },
      {
        key: "costs",
        label: "Costs",
        baseline: 70_000,
        monitoring: 72_000,
        changeAmount: 2_000,
        changePercent: 2.86,
      },
      {
        key: "profit",
        label: "Profit / loss",
        baseline: 30_000,
        monitoring: 38_000,
        changeAmount: 8_000,
        changePercent: 26.67,
      },
    ],
    interpretation: [
      "Revenue is higher than your baseline (+10.0%).",
      "Figures are monthly equivalents compared with your enterprise baseline.",
    ],
    recommendation:
      "Profitability improved compared with your baseline. Keep accurate records each quarter and discuss how to protect margins as you grow.",
  };

  const preview = `Your profitability summary for ${periodLabel} — ${businessName}`;

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
                },
              },
            },
          },
        }}
      >
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[24px] max-w-[560px] bg-white">
            {trialNote ? (
              <Section className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <Text className="text-xs text-amber-900 m-0">{trialNote}</Text>
              </Section>
            ) : null}

            <Heading className="text-slate-900 text-[22px] font-bold text-center p-0 my-[8px] mx-0">
              Your profitability summary
            </Heading>
            <Text className="text-slate-600 text-[15px] leading-[24px]">
              Hello {ownerName},
            </Text>
            <Text className="text-slate-600 text-[15px] leading-[24px]">
              Below is how <strong>{businessName}</strong> performed on revenue, costs, and profit for{" "}
              <strong>{sampleFeedback.periodLabel}</strong>, compared with your programme baseline.
            </Text>

            <Section className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-3 text-slate-600 font-semibold">Measure</th>
                    <th className="text-right p-3 text-slate-600 font-semibold">Baseline</th>
                    <th className="text-right p-3 text-slate-600 font-semibold">Monitoring</th>
                    <th className="text-right p-3 text-slate-600 font-semibold">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleFeedback.rows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-200">
                      <td className="p-3 text-slate-800">{row.label}</td>
                      <td className="p-3 text-right text-slate-700">{formatKes(row.baseline)}</td>
                      <td className="p-3 text-right text-slate-700">{formatKes(row.monitoring)}</td>
                      <td className="p-3 text-right text-slate-700">
                        {formatChangeAmount(row.changeAmount)}
                        <br />
                        <span className="text-xs text-slate-500">{formatChangePercent(row.changePercent)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Text className="text-[11px] text-slate-500 px-3 pb-3 m-0">
                Monthly KES (monitoring quarterly totals ÷ 3).
              </Text>
            </Section>

            <Section className="mt-5">
              <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-2">
                What this means
              </Text>
              {sampleFeedback.interpretation.map((line, index) => (
                <Text key={index} className="text-sm text-slate-700 m-0 mb-2">
                  • {line}
                </Text>
              ))}
            </Section>

            {sampleFeedback.recommendation ? (
              <Section className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-2">
                  Suggested next step
                </Text>
                <Text className="text-sm text-slate-800 m-0 leading-[22px]">
                  {sampleFeedback.recommendation}
                </Text>
              </Section>
            ) : null}

            <Text className="text-sm text-slate-600 mt-5 mb-0 leading-[22px]">
              Kindly contact your EDO or Mentor for advice and support.
            </Text>

            <Text className="text-sm text-slate-600 mt-4 mb-0">
              <a href={portalUrl} className="text-brand-blue font-medium">
                Visit the BIRE programme portal
              </a>
            </Text>

            <Hr className="border-slate-200 my-6" />
            <Text className="text-xs text-slate-400 text-center m-0">
              BIRE Programme — Monitoring, Evaluation &amp; Learning
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MelProfitabilityFeedbackEmail;

const previewFeedback: EnterpriseProfitabilityFeedback = {
  periodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
  businessId: 42,
  businessName: "Green Harvest Ltd",
  rows: [
    {
      key: "revenue",
      label: "Revenue",
      baseline: 100_000,
      monitoring: 110_000,
      changeAmount: 10_000,
      changePercent: 10,
    },
    {
      key: "costs",
      label: "Costs",
      baseline: 70_000,
      monitoring: 72_000,
      changeAmount: 2_000,
      changePercent: 2.86,
    },
    {
      key: "profit",
      label: "Profit / loss",
      baseline: 30_000,
      monitoring: 38_000,
      changeAmount: 8_000,
      changePercent: 26.67,
    },
  ],
  interpretation: [
    "Revenue is higher than your baseline (+10.0%) (Ksh100,000 → Ksh110,000 per month).",
    "Costs are above your baseline (+2.9%) — review whether spending is driving growth.",
    "Overall profitability is higher than your baseline (+26.7%).",
    "Figures are monthly equivalents (monitoring quarterly totals are divided by three) and compare your enterprise baseline with the selected monitoring period.",
  ],
  recommendation:
    "Profitability improved compared with your baseline. Keep accurate records each quarter and discuss how to protect margins as you grow.",
};

MelProfitabilityFeedbackEmail.PreviewProps = {
  ownerName: "Mary Wanjiku",
  businessName: "Green Harvest Ltd",
  periodLabel: previewFeedback.periodLabel,
  feedback: previewFeedback,
  portalUrl: "https://bire-platform.org",
  trialNote: null,
};
