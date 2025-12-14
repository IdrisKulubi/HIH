import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  render,
  Tailwind,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userName?: string;
  code: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bire-platform.org';

export const PasswordResetEmail = ({
  userName = 'User',
  code,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>BIRE Programme - Reset Your Password</Preview>
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
          <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[20px] max-w-[465px] bg-white shadow-xl">
            {/* Logo/Header Section */}
            <Section className="mt-[20px] text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl">
                🔑
              </div>
            </Section>

            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[10px] mx-0 tracking-tight">
              Reset Your Password
            </Heading>

            <Text className="text-slate-500 text-[14px] leading-[24px] text-center mb-8">
              Hi <strong>{userName}</strong>, <br />
              We received a request to reset your password. Use the code below to proceed.
            </Text>

            <Section className="bg-slate-50 border border-dashed border-slate-200 rounded-xl my-[24px] mx-auto w-full text-center py-6">
              <Text className="text-4xl font-mono font-bold tracking-[0.25em] text-[#0B5FBA] m-0">
                {code}
              </Text>
              <Text className="text-slate-400 text-[12px] uppercase font-semibold tracking-wider mt-2 mb-0">
                Reset Code
              </Text>
            </Section>

            <Text className="text-slate-600 text-[14px] leading-[24px] text-center">
              This code is valid for <strong>15 minutes</strong>. <br />
              If you didn't request a password reset, you can safely ignore this email.
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <div className="h-px w-full bg-slate-100" />
            </Section>

            <Text className="text-slate-400 text-[12px] leading-[20px] text-center">
              Best regards,<br />
              <strong>The BIRE Challenge Team</strong>
            </Text>

            <Text className="text-center mt-4">
              <Link
                href={baseUrl}
                className="text-[#0B5FBA] text-[12px] font-medium no-underline hover:underline"
              >
                Visit Portal
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

export const renderPasswordResetEmail = (props: PasswordResetEmailProps) => {
  return render(<PasswordResetEmail {...props} />);
}

export default PasswordResetEmail;
