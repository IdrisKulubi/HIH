import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface SupportTicketResponseEmailProps {
  userName?: string;
  ticketNumber?: string;
  responseMessage?: string;
  ticketSubject?: string;
  loginUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";

export const SupportTicketResponseEmail = ({
  userName = "User",
  ticketNumber = "#1234",
  responseMessage = "We have reviewed your inquiry and have provided a detailed response...",
  ticketSubject = "Question about Eligibility",
  loginUrl = `${baseUrl}/dashboard/support`,
}: SupportTicketResponseEmailProps) => {
  const previewText = `New response on your support ticket ${ticketNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: {
                  blue: '#0B5FBA',
                  teal: '#00D0AB',
                  dark: '#1e293b',
                  light: '#f8fafc',
                },
              },
            },
          },
        }}
      >
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[20px] max-w-[560px] bg-white shadow-xl">
            {/* Header/Icon */}
            <Section className="mt-[20px] text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl">
                💬
              </div>
            </Section>

            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[10px] mx-0 tracking-tight">
              New Support Response
            </Heading>

            <Text className="text-slate-500 text-[14px] leading-[24px] text-center mb-6">
              Hi <strong>{userName}</strong>, <br />
              A member of our team has replied to your support ticket.
            </Text>

            {/* Ticket Details Card */}
            <Section className="bg-slate-50 border border-slate-200 rounded-xl my-[24px] mx-auto w-full p-6">
              <div className="mb-4">
                <Text className="text-[12px] text-slate-500 uppercase font-bold m-0 tracking-wide">Ticket ID</Text>
                <Text className="text-[14px] font-mono font-bold text-blue-600 m-0">{ticketNumber}</Text>
              </div>

              <div className="mb-6">
                <Text className="text-[12px] text-slate-500 uppercase font-bold m-0 tracking-wide">Subject</Text>
                <Text className="text-[16px] font-semibold text-slate-800 m-0">{ticketSubject}</Text>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <Text className="text-[12px] text-blue-600 uppercase font-bold m-0 tracking-wide mb-2">Latest Response</Text>
                <Text className="text-slate-700 text-[14px] leading-[24px] m-0 whitespace-pre-wrap">
                  "{responseMessage}"
                </Text>
              </div>
            </Section>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#0B5FBA] text-white rounded-lg px-6 py-3 text-[14px] font-bold no-underline hover:bg-blue-700 transition"
                href={loginUrl}
              >
                View Full Conversation
              </Button>
            </Section>

            <Text className="text-slate-400 text-[12px] leading-[20px] text-center mt-8">
              Or copy this link to your browser: <br />
              <Link href={loginUrl} className="text-blue-600 no-underline hover:underline">
                {loginUrl}
              </Link>
            </Text>

            <Hr className="border-slate-200 my-8" />

            <Text className="text-slate-400 text-[11px] leading-[20px] text-center mt-4 max-w-[400px] mx-auto">
              This email was sent to {userName}. If you didn't create this ticket, please ignore this email. <br />
              For support, contact: <Link href="mailto:bire@handinhandea.or.ke" className="text-[#0B5FBA] no-underline">bire@handinhandea.or.ke</Link><br />
              © {new Date().getFullYear()} Hand in Hand Eastern Africa.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SupportTicketResponseEmail;
