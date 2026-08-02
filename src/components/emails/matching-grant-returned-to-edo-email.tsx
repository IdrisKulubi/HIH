import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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
  applicantEmail: string;
  applicantPhone: string;
  returnReason: string;
}

export const MatchingGrantReturnedToEdoEmail = ({
  edoName = "Programme staff",
  applicantName = "Applicant",
  businessName = "Enterprise",
  applicantEmail = "Not available",
  applicantPhone = "Not available",
  returnReason = "",
}: MatchingGrantReturnedToEdoEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Matching Grant returned — contact {applicantName}</Preview>
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
              A Matching Grant application for <strong>{businessName}</strong> was returned during
              Pre-IC scoring because the information needs correction. Please contact the applicant
              and help them update and resubmit the application in the portal.
            </Text>

            <Section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-900">Applicant details</Text>
              <Text className="text-sm text-slate-700 mt-2">
                <strong>Name:</strong> {applicantName}
              </Text>
              <Text className="text-sm text-slate-700">
                <strong>Email:</strong> {applicantEmail}
              </Text>
              <Text className="text-sm text-slate-700">
                <strong>Phone:</strong> {applicantPhone}
              </Text>
              <Text className="text-sm text-slate-700">
                <strong>Enterprise:</strong> {businessName}
              </Text>
            </Section>

            <Section className="rounded-md border border-amber-200 bg-amber-50 p-4 mt-4">
              <Text className="text-sm font-semibold text-amber-900">Reason for return</Text>
              <Text className="text-sm text-amber-800">{returnReason}</Text>
            </Section>

            <Text className="text-slate-600">
              Call or email the applicant using the details above, explain what needs to be corrected,
              and support them to complete the Matching Grant application again.
            </Text>
            <Hr className="border-slate-200" />
            <Text className="text-xs text-slate-500">BIRE Programme · Access to Finance</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MatchingGrantReturnedToEdoEmail;
