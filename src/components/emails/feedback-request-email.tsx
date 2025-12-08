import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface FeedbackRequestEmailProps {
  recipientName: string;
  emailBody: string; // HTML content
  feedbackFormUrl: string;
  linkDisplayText?: string;
}

export default function FeedbackRequestEmail({
  recipientName = "Participant",
  emailBody = "",
  feedbackFormUrl = "#",
  linkDisplayText = "Share Your Feedback",
}: FeedbackRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>We&apos;d love to hear your feedback on the YouthAdapt Challenge</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with gradient */}
          <Section style={header}>
            <Heading style={h1}>YouthAdapt Challenge</Heading>
            <Text style={subtitle}>In-Country Program Feedback</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hello {recipientName},</Text>
            
            {/* Custom email body - rendered as HTML */}
            <div dangerouslySetInnerHTML={{ __html: emailBody }} style={bodyContent} />

            {/* Call to Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={feedbackFormUrl}>
                {linkDisplayText}
              </Button>
            </Section>

            <Text style={note}>
              Your responses are anonymous and will help us improve the program for future participants.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              YouthAdapt Challenge - In-Country Program
            </Text>
            <Text style={footerText}>
              Supporting youth entrepreneurs in climate adaptation solutions
            </Text>
            <Text style={footerTextSmall}>
              © {new Date().getFullYear()} YouthAdapt Challenge. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  background: "#0B5FBA",
  padding: "32px 24px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 8px",
  padding: "0",
  lineHeight: "1.2",
};

const subtitle = {
  color: "#b3d9ff",
  fontSize: "16px",
  margin: "0",
  padding: "0",
};

const content = {
  padding: "24px 32px",
};

const greeting = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px",
};

const bodyContent = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#5B8DEE",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  cursor: "pointer",
};

const note = {
  fontSize: "14px",
  color: "#6b7280",
  fontStyle: "italic",
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 32px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "4px 0",
};

const footerTextSmall = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "8px 0 0",
};
