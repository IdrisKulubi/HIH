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

export interface MatchingGrantSubmissionEmailProps {
  applicantName: string;
  businessName: string;
  submissionDate: string;
  userEmail: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";

export const MatchingGrantSubmissionEmail = ({
  applicantName = "Applicant",
  businessName = "Your enterprise",
  submissionDate = new Date().toISOString(),
  userEmail = "user@example.com",
}: MatchingGrantSubmissionEmailProps) => {
  const formattedDate = new Date(submissionDate).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>Matching Grant application received — BIRE Programme</Preview>
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
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[20px] max-w-[560px] bg-white shadow-xl">
            <Section className="mt-[20px] text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 text-2xl font-bold text-white"
                style={{ backgroundColor: "#1da1db" }}
              >
                MG
              </div>
            </Section>

            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[10px] mx-0 tracking-tight">
              Matching Grant application received
            </Heading>

            <Text className="text-slate-600 text-[16px] leading-[24px] text-center mb-6">
              Dear {applicantName},
              <br />
              We have received your Matching Grant application for{" "}
              <strong>{businessName}</strong>.
            </Text>

            <Section className="bg-sky-50 border border-sky-100 rounded-xl my-[24px] mx-auto w-full p-6">
              <Text className="text-[12px] uppercase font-bold text-sky-800 tracking-wider mb-3">
                What happens next
              </Text>
              <Text className="text-[14px] text-slate-700 leading-[22px] m-0 mb-2">
                Our Access to Finance team will review your submission. We will contact you if
                we need further information.
              </Text>
              <Text className="text-[14px] text-slate-700 leading-[22px] m-0">
                When your grant agreement is ready, you will receive it through your profile
                under Offers and Contracts, where you can download and upload your signed copy.
              </Text>
              <Text className="text-[12px] text-slate-500 mt-4 mb-0">
                Submitted on {formattedDate}
              </Text>
            </Section>

            <Section className="text-center mt-8 mb-6">
              <Link
                href={`${baseUrl}/profile?tab=contracts`}
                className="bg-[#1da1db] text-white font-bold py-3 px-6 rounded-lg text-[14px] no-underline inline-block"
              >
                View profile and agreements
              </Link>
            </Section>

            <Hr className="border border-solid border-slate-200 my-[26px]" />

            <Text className="text-slate-400 text-[12px] leading-[20px] text-center">
              This message was sent to {userEmail} regarding your BIRE Programme Access to
              Finance application.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MatchingGrantSubmissionEmail;
