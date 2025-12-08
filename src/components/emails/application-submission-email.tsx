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
} from '@react-email/components';
import * as React from 'react';

export interface ApplicationSubmissionEmailProps {
  applicantName: string;
  applicationId: string;
  businessName: string;
  submissionDate: string;
  userEmail: string;
}

export const ApplicationSubmissionEmail = ({
  applicantName = 'John Doe',
  applicationId = 'APP-12345',
  businessName = 'Climate Solutions Ltd',
  submissionDate = '2025-01-01',
  userEmail = 'user@example.com',
}: ApplicationSubmissionEmailProps) => (
  <Html>
    <Head />
    <Preview>Your In-Country YouthADAPT Challenge application has been submitted successfully</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={content}>
          <Heading style={heading}>Application Submitted Successfully! 🎉</Heading>
          
          <Text style={paragraph}>
            Dear {applicantName},
          </Text>
          
          <Text style={paragraph}>
            Congratulations! Your application for the In-Country YouthADAPT Challenge has been successfully submitted. 
            We&apos;re excited to review your climate adaptation solution and learn more about {businessName}.
          </Text>
          
          <Section style={detailsSection}>
            <Text style={detailsTitle}>Application Details:</Text>
            <Text style={detailsText}>
              <strong>Application ID:</strong> {applicationId}<br />
              <strong>Business Name:</strong> {businessName}<br />
              <strong>Submission Date:</strong> {submissionDate}<br />
              <strong>Applicant:</strong> {applicantName}
            </Text>
          </Section>
          
          <Text style={paragraph}>
            <strong>What happens next?</strong>
          </Text>
          
          <Text style={paragraph}>
            1. <strong>Initial Review (1-2 weeks):</strong> Our team will conduct an initial eligibility assessment<br />
            2. <strong>Detailed Evaluation (2-3 weeks):</strong> Qualified applications will undergo comprehensive evaluation<br />
            3. <strong>Selection & Notification (1 week):</strong> Selected participants will be notified via email<br />
            4. <strong>Program Launch:</strong> Successful applicants begin the accelerator program
          </Text>
          
          <Text style={paragraph}>
            You can track your application status and access your profile at any time by visiting your dashboard.
          </Text>
          
          <Section style={ctaSection}>
            <Link href={`${process.env.NEXTAUTH_URL || 'https://incountryouthadapt.org'}/profile`} style={ctaButton}>
              View Application Status
            </Link>
          </Section>
          
          <Text style={paragraph}>
            If you have any questions about your application or the program, please don&apos;t hesitate to reach out to our support team.
          </Text>
          
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,<br />
              The In-Country YouthADAPT Challenge Team<br />
              Global Center on Adaptation (GCA)<br />
              Kenya Climate Innovation Center (KCIC)
            </Text>
            
            <Text style={footerText}>
              <Link href={`${process.env.NEXTAUTH_URL || 'https://incountryouthadapt.org'}`} style={link}>
                Visit In-Country YouthADAPT Challenge
              </Link>
            </Text>
            
            <Text style={disclaimer}>
              This email was sent to {userEmail} regarding your In-Country YouthADAPT Challenge application. 
              Please keep this email for your records.
            </Text>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const renderApplicationSubmissionEmail = (props: ApplicationSubmissionEmailProps) => {
    return render(<ApplicationSubmissionEmail {...props} />);
}

export default ApplicationSubmissionEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const content = {
  padding: '0 20px',
};

const heading = {
  fontSize: '28px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#0B5FBA',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '16px 0',
};

const detailsSection = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #0ea5e9',
};

const detailsTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#0B5FBA',
  margin: '0 0 12px 0',
};

const detailsText = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const ctaButton = {
  backgroundColor: '#0B5FBA',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '600',
  display: 'inline-block',
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '20px',
  marginTop: '40px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#6b7280',
  margin: '8px 0',
};

const link = {
  color: '#0B5FBA',
  textDecoration: 'none',
};

const disclaimer = {
  fontSize: '12px',
  lineHeight: '1.4',
  color: '#9ca3af',
  margin: '16px 0 0',
}; 