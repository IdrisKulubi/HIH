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

export interface MentorshipAssignmentEmailProps {
  mentorName: string;
  enterpriseName: string;
}

export const MentorshipAssignmentEmail = ({
  mentorName = "Mentor",
  enterpriseName = "Enterprise",
}: MentorshipAssignmentEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You have been assigned to {enterpriseName}</Preview>
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
              New mentorship assignment
            </Heading>
            <Text className="text-slate-600">Hello {mentorName},</Text>
            <Text className="text-slate-600">
              You have been assigned to support <strong>{enterpriseName}</strong> through the BIRE
              six-session mentorship programme.
            </Text>

            <Section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-900">Your assignment</Text>
              <Text className="text-sm text-slate-700 mt-2">
                <strong>Enterprise:</strong> {enterpriseName}
              </Text>
            </Section>

            <Text className="text-slate-600">
              Log in to the BIRE platform and open your mentorship dashboard to review the
              enterprise details and begin working through the six sessions.
            </Text>
            <Hr className="border-slate-200" />
            <Text className="text-xs text-slate-500">BIRE Programme · Mentorship</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MentorshipAssignmentEmail;
