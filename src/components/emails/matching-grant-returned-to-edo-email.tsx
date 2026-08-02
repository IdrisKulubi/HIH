import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from "@react-email/components";

export interface MatchingGrantReturnedToEdoEmailProps {
  edoName: string;
  applicantName: string;
  businessName: string;
  returnReason: string;
  caseUrl: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";

export const MatchingGrantReturnedToEdoEmail = ({
  edoName = "Programme staff",
  applicantName = "Applicant",
  businessName = "Enterprise",
  returnReason = "",
  caseUrl = `${baseUrl}/a2f`,
}: MatchingGrantReturnedToEdoEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Matching Grant application returned for correction — action required</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: {
                  blue: "#1da1db",
                  dark: "#1e293b",
                },
              },
            },
          },
        }}
      >
        <Body className="bg-slate-100 font-sans">
          <Container className="mx-auto my-8 max-w-xl rounded-lg bg-white p-8 shadow-sm">
            <Heading className="text-xl font-bold text-slate-900">
              Matching Grant application returned for correction
            </Heading>
            <Text className="text-slate-600">Hello {edoName},</Text>
            <Text className="text-slate-600">
              A Matching Grant application for <strong>{businessName}</strong> ({applicantName}) was
              returned during Pre-IC scoring because the information needs correction.
            </Text>
            <Section className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <Text className="text-sm font-semibold text-amber-900">Reason for return</Text>
              <Text className="text-sm text-amber-800">{returnReason}</Text>
            </Section>
            <Text className="text-slate-600">
              Please contact the applicant, help them understand what to fix, and support them to
              complete and resubmit the Matching Grant application in the portal.
            </Text>
            <Section className="text-center">
              <Link
                href={caseUrl}
                className="inline-block rounded-md bg-brand-blue px-6 py-3 text-sm font-semibold text-white no-underline"
              >
                Open A2F case
              </Link>
            </Section>
            <Hr className="border-slate-200" />
            <Text className="text-xs text-slate-500">
              BIRE Programme · Access to Finance
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MatchingGrantReturnedToEdoEmail;
