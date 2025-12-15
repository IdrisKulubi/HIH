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
  Img,
} from "@react-email/components";
import * as React from "react";

interface FeedbackRequestEmailProps {
  recipientName: string;
  emailBody: string; // HTML content
  feedbackFormUrl: string;
  linkDisplayText?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bire-platform.org';

export default function FeedbackRequestEmail({
  recipientName = "Participant",
  emailBody = "<p>We hope you are finding the program valuable. We would appreciate your thoughts on the recent workshop.</p>",
  feedbackFormUrl = "#",
  linkDisplayText = "Share Your Feedback",
}: FeedbackRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>We'd love to hear your feedback on the BIRE Programme</Preview>
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
                📣
              </div>
            </Section>

            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[10px] mx-0 tracking-tight">
              We Value Your Feedback
            </Heading>

            <Text className="text-slate-500 text-[14px] leading-[24px] text-center mb-8">
              Hi <strong>{recipientName}</strong>, <br />
              Help us improve the BIRE Programme.
            </Text>

            {/* Custom email body card */}
            <Section className="bg-white border border-slate-200 rounded-xl p-6 mx-auto w-full mb-8 shadow-sm">
              <div
                className="text-slate-700 text-[15px] leading-[26px]"
                dangerouslySetInnerHTML={{ __html: emailBody }}
              />
            </Section>

            <Section className="text-center mb-[20px]">
              <Button
                className="bg-[#0B5FBA] text-white rounded-lg px-8 py-4 text-[15px] font-bold no-underline hover:bg-blue-700 transition shadow-md block w-full sm:w-auto"
                href={feedbackFormUrl}
              >
                {linkDisplayText}
              </Button>
            </Section>

            <Text className="text-slate-500 text-[13px] italic text-center mx-auto max-w-[400px]">
              Your responses are anonymous and will help us improve the program for future participants.
            </Text>

            <Hr className="border-slate-200 my-8" />

            <Text className="text-slate-400 text-[11px] leading-[20px] text-center mt-4 max-w-[400px] mx-auto">
              BIRE Programme • Hand in Hand Eastern Africa <br />
              For support, contact: <Link href="mailto:bire@handinhandea.or.ke" className="text-[#0B5FBA] no-underline">bire@handinhandea.or.ke</Link><br />
              © {new Date().getFullYear()} All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
