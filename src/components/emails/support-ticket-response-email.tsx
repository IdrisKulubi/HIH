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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const SupportTicketResponseEmail = ({
  userName,
  ticketNumber,
  responseMessage,
  ticketSubject,
  loginUrl = `${baseUrl}/login`,
}: SupportTicketResponseEmailProps) => {
  const previewText = `New response on your support ticket ${ticketNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px] text-center">
            
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              New Response on Your Support Ticket
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {userName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              A new response has been posted to your support ticket:
            </Text>
            <Section className="bg-gray-100 p-4 rounded-lg my-4">
              <Text className="font-semibold">
                Ticket Number: {ticketNumber}
              </Text>
              <Text className="font-semibold">
                Subject: {ticketSubject}
              </Text>
              <Hr className="border-gray-300 my-2" />
              <Text className="text-black text-[14px] leading-[24px]">
                <strong>💬 Response:</strong>
              </Text>
              <Text className="text-black text-[14px] leading-[24px] whitespace-pre-wrap">
                {responseMessage}
              </Text>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              You can view the full conversation and reply by logging into your account.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-primary text-white rounded-md px-6 py-3 text-sm font-medium"
                href={loginUrl}
              >
                View Ticket
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={loginUrl} className="text-blue-600 no-underline">
                Click here to view the ticket
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This email was intended for <span className="text-black">{userName}</span>. This email was sent from the Incountry-YouhthADAPT application. If you were not expecting this email, you can ignore it. If you are concerned about your account&apos;s safety, please reply to this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SupportTicketResponseEmail; 