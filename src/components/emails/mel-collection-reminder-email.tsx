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

export interface MelCollectionReminderEmailProps {
  collectorName: string;
  periodLabel: string;
  collectionOpenDate: string;
  collectionCloseDate: string;
  kind: "opening" | "deadline";
  enterpriseNames: string[];
  remainingCount: number;
  monitoringUrl: string;
}

export const MelCollectionReminderEmail = ({
  collectorName = "Programme staff",
  periodLabel = "Reporting period",
  collectionOpenDate = "1 December 2026",
  collectionCloseDate = "10 December 2026",
  kind = "opening",
  enterpriseNames = [],
  remainingCount = 0,
  monitoringUrl = "https://bire-platform.org/admin/mel/monitoring",
}: MelCollectionReminderEmailProps) => {
  const preview =
    kind === "deadline"
      ? `Monitoring collection for ${periodLabel} closes on ${collectionCloseDate}`
      : `Monitoring collection for ${periodLabel} is open until ${collectionCloseDate}`;
  const shown = enterpriseNames.slice(0, 12);
  const hidden = Math.max(0, enterpriseNames.length - shown.length);

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
                  dark: "#1e293b",
                },
              },
            },
          },
        }}
      >
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[24px] max-w-[560px] bg-white">
            <Heading className="text-slate-900 text-[22px] font-bold text-center p-0 my-[8px] mx-0">
              {kind === "deadline"
                ? "Monitoring collection closes soon"
                : "Monitoring data collection is open"}
            </Heading>
            <Text className="text-slate-600 text-[15px] leading-[24px]">
              Hello {collectorName},
            </Text>
            <Text className="text-slate-600 text-[15px] leading-[24px]">
              Quarterly monitoring data is collected in the first 10 days after the reporting
              quarter ends. For <strong>{periodLabel}</strong>, the collection window in MEL
              configuration is <strong>{collectionOpenDate}</strong> to{" "}
              <strong>{collectionCloseDate}</strong>.
            </Text>
            <Text className="text-slate-600 text-[15px] leading-[24px]">
              {kind === "deadline"
                ? `Please submit the reports that are still open before ${collectionCloseDate}.`
                : `Please complete monitoring visits and submit reports before ${collectionCloseDate}.`}
            </Text>

            <Section className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-2">
              <Text className="text-[12px] uppercase font-bold text-slate-500 tracking-wider m-0 mb-3">
                Enterprises still to submit ({remainingCount})
              </Text>
              {shown.map((name, index) => (
                <Text key={`${name}-${index}`} className="text-sm text-slate-800 m-0 mb-1">
                  {name}
                </Text>
              ))}
              {hidden > 0 ? (
                <Text className="text-sm text-slate-500 m-0 mt-2">and {hidden} more</Text>
              ) : null}
            </Section>

            <Section className="text-center my-6">
              <Button
                href={monitoringUrl}
                className="bg-brand-blue text-white font-semibold text-sm rounded-lg px-6 py-3 no-underline"
              >
                Open monitoring workspace
              </Button>
            </Section>

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

export default MelCollectionReminderEmail;
