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
  render,
  Tailwind,
  Hr,
} from '@react-email/components';
import * as React from 'react';

export interface ApplicationSubmissionEmailProps {
  applicantName: string;
  applicationId: string;
  businessName: string;
  submissionDate: string;
  userEmail: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bire-platform.org';

export const ApplicationSubmissionEmail = ({
  applicantName = 'John Doe',
  applicationId = 'APP-12345',
  businessName = 'Climate Solutions Ltd',
  submissionDate = '2025-01-01',
  userEmail = 'user@example.com',
}: ApplicationSubmissionEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Application Submitted Successfully - In-Country YouthADAPT</Preview>
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
            {/* Logo/Header Section */}
            <Section className="mt-[20px] text-center">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl border border-teal-100">
                🎉
              </div>
            </Section>

            <Heading className="text-slate-900 text-[26px] font-bold text-center p-0 my-[10px] mx-0 tracking-tight">
              Application Submitted!
            </Heading>

            <Text className="text-slate-500 text-[16px] leading-[24px] text-center mb-6">
              Hi <strong>{applicantName}</strong>, <br />
              We have successfully received your application.
            </Text>

            {/* Application Details Card */}
            <Section className="bg-blue-50 border border-blue-100 rounded-xl my-[24px] mx-auto w-full p-6">
              <Text className="text-[12px] uppercase font-bold text-blue-800 tracking-wider mb-4 border-b border-blue-200 pb-2">
                Application Summary
              </Text>

              <div className="mb-2">
                <Text className="text-[12px] text-blue-600 uppercase font-semibold m-0">Reference ID</Text>
                <Text className="text-[16px] font-mono font-bold text-slate-800 m-0">{applicationId}</Text>
              </div>

              <div className="mb-2">
                <Text className="text-[12px] text-blue-600 uppercase font-semibold m-0">Business Name</Text>
                <Text className="text-[16px] font-medium text-slate-800 m-0">{businessName}</Text>
              </div>

              <div>
                <Text className="text-[12px] text-blue-600 uppercase font-semibold m-0">Submitted On</Text>
                <Text className="text-[16px] font-medium text-slate-800 m-0">{submissionDate}</Text>
              </div>
            </Section>

            <Heading className="text-slate-800 text-[18px] font-bold text-left mt-8 mb-4">
              What Happens Next?
            </Heading>

            <Section className="mb-8">
              <div className="flex mb-4 items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] font-bold mr-3 mt-1 shrink-0">1</div>
                <div>
                  <Text className="font-bold text-slate-800 text-[14px] m-0">Initial Review (1-2 Weeks)</Text>
                  <Text className="text-slate-500 text-[13px] m-0">Eligibility assessment and completeness check.</Text>
                </div>
              </div>

              <div className="flex mb-4 items-start">
                <div className="bg-slate-200 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center text-[12px] font-bold mr-3 mt-1 shrink-0">2</div>
                <div>
                  <Text className="font-bold text-slate-800 text-[14px] m-0">Evaluation (2-3 Weeks)</Text>
                  <Text className="text-slate-500 text-[13px] m-0">Detailed scoring based on impact and viability.</Text>
                </div>
              </div>

              <div className="flex mb-0 items-start">
                <div className="bg-slate-200 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center text-[12px] font-bold mr-3 mt-1 shrink-0">3</div>
                <div>
                  <Text className="font-bold text-slate-800 text-[14px] m-0">Notification</Text>
                  <Text className="text-slate-500 text-[13px] m-0">Results will be communicated via email.</Text>
                </div>
              </div>
            </Section>

            <Section className="text-center mb-[20px]">
              <Link
                href={`${baseUrl}/dashboard`}
                className="bg-[#0B5FBA] text-white px-6 py-3 rounded-lg font-bold text-[14px] no-underline inline-block hover:bg-blue-700 transition"
              >
                Track Status
              </Link>
            </Section>

            <Hr className="border-slate-200 my-8" />

            <Text className="text-slate-400 text-[12px] leading-[20px] text-center">
              Best regards,<br />
              <strong>The BIRE Challenge Team</strong><br />
              Hand in Hand Eastern Africa
            </Text>

            <Text className="text-center mt-4">
              <Link
                href={baseUrl}
                className="text-[#0B5FBA] text-[12px] font-medium no-underline hover:underline"
              >
                Visit Main Portal
              </Link>
            </Text>
          </Container>

          <Text className="text-slate-400 text-[11px] leading-[20px] text-center mt-4 mb-10 max-w-[400px] mx-auto">
            © {new Date().getFullYear()} Hand in Hand Eastern Africa. All rights reserved.
          </Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export const renderApplicationSubmissionEmail = (props: ApplicationSubmissionEmailProps) => {
  return render(<ApplicationSubmissionEmail {...props} />);
}

export default ApplicationSubmissionEmail;
