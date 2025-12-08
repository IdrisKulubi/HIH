import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userName?: string;
  code: string;
}



export const PasswordResetEmail = ({
  userName = 'User',
  code,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>In-Country YouthADAPT - Reset Your Password</Preview>
    <Body style={main}>
      <Container style={container}>
      
        <Text style={paragraph}>Hi {userName},</Text>
        <Text style={paragraph}>
          We received a request to reset the password for your In-Country YouthADAPT
          account. Please use the verification code below to proceed. This code is
          valid for 15 minutes.
        </Text>
        <Section style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={paragraph}>
          If you did not request a password reset, you can safely ignore this
          email. Your account security has not been compromised.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          In-Country YouthADAPT Challenge, a GCA and KCIC initiative.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const renderPasswordResetEmail = (props: PasswordResetEmailProps) => {
    return render(<PasswordResetEmail {...props} />);
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};



const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
};

const codeContainer = {
  background: '#f6f6f6',
  borderRadius: '5px',
  margin: '20px 0',
  padding: '10px',
  textAlign: 'center' as const,
};

const codeText = {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    color: '#000',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
}; 