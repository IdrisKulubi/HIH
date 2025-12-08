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

export interface VerificationCodeEmailProps {
  verificationCode: string;
  userEmail: string;
}

export const VerificationCodeEmail = ({
  verificationCode = '123456',
  userEmail = 'user@example.com',
}: VerificationCodeEmailProps) => (
  <Html>
    <Head />
    <Preview>Your YouthADAPT Challenge verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        
        
        <Section style={content}>
          <Heading style={heading}>Verify Your Email Address</Heading>
          
          <Text style={paragraph}>
            Welcome to the In-Country YouthADAPT Challenge! To complete your registration, please verify your email address using the code below:
          </Text>
          
          <Section style={codeSection}>
            <Text style={codeText}>{verificationCode}</Text>
          </Section>
          
          <Text style={paragraph}>
            This verification code will expire in <strong>10 minutes</strong>. If you didn&apos;t request this code, please ignore this email.
          </Text>
          
          <Text style={paragraph}>
            The In-Country YouthADAPT Challenge is a unique opportunity for younth-led  MSMEs across the five eligible countries to showcase their climate adaptation solutions. We&apos;re excited to have you join us!
          </Text>
          
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,<br />
              The In-Country YouthADAPT Challenge Team
            </Text>

            <Text style={footerText}>
              <Link href="https://incountryouthadapt.kenyacic.org/" style={link}>
                incountryouthadapt.kenyacic.org
              </Link>
            </Text>
            
            <Text style={disclaimer}>
              This email was sent to {userEmail}. If you received this email in error, please ignore it.
            </Text>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const renderVerificationCodeEmail = (props: VerificationCodeEmailProps) => {
    return render(<VerificationCodeEmail {...props} />);
};

export default VerificationCodeEmail;

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
  fontSize: '24px',
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

const codeSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '2px solid #0B5FBA',
};

const codeText = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#0B5FBA',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
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