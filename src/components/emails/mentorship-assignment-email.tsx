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
  enterpriseNames: string[];
}

export const MentorshipAssignmentEmail = ({
  mentorName = "Mentor",
  enterpriseNames = ["Enterprise"],
}: MentorshipAssignmentEmailProps) => {
  const names = enterpriseNames.filter(Boolean);
  const count = names.length;
  const preview =
    count === 1
      ? `You have been assigned to ${names[0]}`
      : `You have been assigned to ${count} enterprises`;

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
              {count === 1 ? "New mentorship assignment" : "New mentorship assignments"}
            </Heading>
            <Text className="text-slate-600">Hello {mentorName},</Text>
            <Text className="text-slate-600">
              {count === 1 ? (
                <>
                  You have been assigned to support <strong>{names[0]}</strong> through the BIRE
                  six-session mentorship programme.
                </>
              ) : (
                <>
                  You have been assigned to support the following{" "}
                  <strong>{count} enterprises</strong> through the BIRE six-session mentorship
                  programme.
                </>
              )}
            </Text>

            <Section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-900 m-0">
                {count === 1 ? "Your assignment" : "Your assignments"}
              </Text>
              {names.map((name) => (
                <Text key={name} className="text-sm text-slate-700 mt-2 mb-0">
                  {count === 1 ? (
                    <>
                      <strong>Enterprise:</strong> {name}
                    </>
                  ) : (
                    <>• {name}</>
                  )}
                </Text>
              ))}
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
