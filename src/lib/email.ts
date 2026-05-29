import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import {
  ApplicationSubmissionEmail,
  ApplicationSubmissionEmailProps,
} from '@/components/emails/application-submission-email';
import {
  VerificationCodeEmail,
} from '@/components/emails/verification-code-email';
import {
  PasswordResetEmail,
} from '@/components/emails/password-reset-email';
import {
  MatchingGrantSubmissionEmail,
  MatchingGrantSubmissionEmailProps,
} from '@/components/emails/matching-grant-submission-email';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail =
  process.env.RESEND_FROM_EMAIL || 'BIRE <verify@bireprogramme.org>';

if (!process.env.RESEND_API_KEY) {
  console.warn(' RESEND_API_KEY is not set. Emails will not be sent.');
}

export interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export const sendEmail = async (params: SendEmailParams, retries = 3) => {
  const { to, subject, react } = params;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    throw new Error('Email service not configured');
  }

  const html = await render(react);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (!error) {
      return { success: true, data };
    }

    // Resend rate-limit: statusCode 429 — wait 1 second and retry
    const isRateLimit =
      (error as { statusCode?: number }).statusCode === 429 ||
      error.message?.toLowerCase().includes('rate');

    console.error(
      `[EMAIL] Attempt ${attempt}/${retries} failed for ${to}:`,
      JSON.stringify(error)
    );

    if (isRateLimit && attempt < retries) {
      console.warn(`[EMAIL] Rate limited — waiting 1s before retry ${attempt + 1}`);
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`);
  }

  throw new Error('Failed to send email after all retries');
};


/**
 * Sends a verification code email.
 */
export async function sendVerificationCode(props: {
  to: string;
  verificationCode: string;
}) {
  return sendEmail({
    to: props.to,
    subject: 'Your BIRE Verification Code',
    react: VerificationCodeEmail({
      userEmail: props.to,
      verificationCode: props.verificationCode,
    }),
  });
}

/**
 * Sends an application submission confirmation email.
 */
export async function sendApplicationSubmissionEmail(
  props: ApplicationSubmissionEmailProps
) {
  return sendEmail({
    to: props.userEmail,
    subject: '🎉 Application Submitted Successfully - BIRE Programme',
    react: ApplicationSubmissionEmail(props),
  });
}

/**
 * Sends Matching Grant application submission confirmation to the enterprise.
 * Does not throw if email is not configured; logs and returns gracefully.
 */
export async function sendMatchingGrantSubmissionEmail(
  props: MatchingGrantSubmissionEmailProps
): Promise<{ success: boolean; skipped?: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set; skipping Matching Grant confirmation email");
    return { success: false, skipped: true };
  }

  try {
    await sendEmail({
      to: props.userEmail,
      subject: "Matching Grant application received — BIRE Programme",
      react: MatchingGrantSubmissionEmail(props),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send Matching Grant submission email:", error);
    return { success: false };
  }
}

/**
 * Props for the password reset email.
 */
interface PasswordResetEmailProps {
  to: string;
  code: string;
  userName?: string;
}

/**
 * Sends a password reset email with a verification code.
 */
export async function sendPasswordResetEmail(props: PasswordResetEmailProps) {
  return sendEmail({
    to: props.to,
    subject: 'Reset Your BIRE Programme Password',
    react: PasswordResetEmail(props),
  });
}

export function generateVerificationCode(): string {
  // Generate a 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
} 