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

export interface A2fScreeningPassEmailProps {
  applicantName: string;
  businessName: string;
  applicationUrl: string;
}

export function A2fScreeningPassEmail({
  applicantName,
  businessName,
  applicationUrl,
}: A2fScreeningPassEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your enterprise can now complete the BIRE Access to Finance application.</Preview>
      <Body style={{ backgroundColor: "#f4f7f6", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "32px auto", padding: "32px", maxWidth: "600px" }}>
          <Heading style={{ color: "#115e59", fontSize: "24px" }}>
            Access to Finance application unlocked
          </Heading>
          <Text>Hello {applicantName},</Text>
          <Text>
            {businessName} has passed the BIRE Innovation Fund pre-screening.
            You can now complete the Access to Finance Matching Grant application.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button
              href={applicationUrl}
              style={{ backgroundColor: "#0f766e", color: "#ffffff", padding: "12px 20px", borderRadius: "6px" }}
            >
              Open Access to Finance
            </Button>
          </Section>
          <Text>
            Passing pre-screening allows you to apply. It is not a financing approval or guarantee of funding.
          </Text>
          <Hr style={{ borderColor: "#d1d5db", margin: "24px 0" }} />
          <Text style={{ color: "#6b7280", fontSize: "12px" }}>
            BIRE Programme, Hand in Hand Eastern Africa
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

