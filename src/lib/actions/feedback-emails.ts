"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  feedbackCampaigns,
  feedbackEmails,
  applicants,
  userProfiles,
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import FeedbackRequestEmail from "@/components/emails/feedback-request-email";
import { sendEmail } from "@/lib/email";

interface CreateCampaignData {
  name: string;
  subject: string;
  emailBody: string;
  feedbackFormUrl?: string;
  linkDisplayText?: string;
  batchSize?: number;
  recipients: Array<{ userId: string; email: string; name: string }>;
}

// Create a new feedback campaign
export async function createFeedbackCampaign(data: CreateCampaignData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (userProfile?.role !== "admin") {
      return { success: false, error: "Admin access required" };
    }

    // Create campaign
    const [campaign] = await db
      .insert(feedbackCampaigns)
      .values({
        name: data.name,
        subject: data.subject,
        emailBody: data.emailBody,
        feedbackFormUrl: data.feedbackFormUrl,
        linkDisplayText: data.linkDisplayText || "Share Your Feedback",
        batchSize: data.batchSize || 5,
        totalRecipients: data.recipients.length,
        createdBy: session.user.id,
      })
      .returning();

    // Create email records for recipients
    const emailRecords = data.recipients.map((recipient, index) => ({
      campaignId: campaign.id,
      recipientId: recipient.userId,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      batchNumber: Math.floor(index / (data.batchSize || 5)) + 1,
    }));

    await db.insert(feedbackEmails).values(emailRecords);

    return { success: true, campaign };
  } catch (error) {
    console.error("Error creating feedback campaign:", error);
    return { success: false, error: "Failed to create campaign" };
  }
}

// Get all campaigns
export async function getFeedbackCampaigns() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const campaigns = await db.query.feedbackCampaigns.findMany({
      orderBy: desc(feedbackCampaigns.createdAt),
      with: {
        emails: true,
      },
    });

    return { success: true, campaigns };
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return { success: false, error: "Failed to fetch campaigns" };
  }
}

// Get campaign details with emails
export async function getCampaignDetails(campaignId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const campaign = await db.query.feedbackCampaigns.findFirst({
      where: eq(feedbackCampaigns.id, campaignId),
      with: {
        emails: true,
      },
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    return { success: true, campaign };
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    return { success: false, error: "Failed to fetch campaign details" };
  }
}

// Send emails in batches
export async function sendCampaignBatch(
  campaignId: number,
  batchNumber: number
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get campaign details
    const campaign = await db.query.feedbackCampaigns.findFirst({
      where: eq(feedbackCampaigns.id, campaignId),
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Get emails for this batch that are pending
    const emails = await db.query.feedbackEmails.findMany({
      where: and(
        eq(feedbackEmails.campaignId, campaignId),
        eq(feedbackEmails.batchNumber, batchNumber),
        eq(feedbackEmails.status, "pending")
      ),
    });

    if (emails.length === 0) {
      return { success: false, error: "No pending emails in this batch" };
    }

    // Update campaign status to sending
    await db
      .update(feedbackCampaigns)
      .set({
        status: "sending",
        startedAt: campaign.startedAt || new Date(),
      })
      .where(eq(feedbackCampaigns.id, campaignId));

    let successCount = 0;
    let failCount = 0;

    // Send emails one by one
    for (const email of emails) {
      try {
        // Update status to sending
        await db
          .update(feedbackEmails)
          .set({ status: "sending" })
          .where(eq(feedbackEmails.id, email.id));

        await sendEmail({
          to: email.recipientEmail,
          subject: campaign.subject || "Feedback Request",
          react: FeedbackRequestEmail({
            recipientName: email.recipientName,
            emailBody: campaign.emailBody || "",
            feedbackFormUrl: campaign.feedbackFormUrl || undefined,
            linkDisplayText: campaign.linkDisplayText || undefined,
          }),
        });

        // Mark as sent
        await db
          .update(feedbackEmails)
          .set({
            status: "sent",
            sentAt: new Date(),
          })
          .where(eq(feedbackEmails.id, email.id));

        successCount++;
      } catch (error) {
        // Mark as failed
        await db
          .update(feedbackEmails)
          .set({
            status: "failed",
            failedAt: new Date(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(feedbackEmails.id, email.id));

        failCount++;
      }
    }

    // Update campaign stats
    const updatedCampaign = await db
      .update(feedbackCampaigns)
      .set({
        sentCount: (campaign.sentCount ?? 0) + successCount,
        failedCount: (campaign.failedCount ?? 0) + failCount,
      })
      .where(eq(feedbackCampaigns.id, campaignId))
      .returning();

    // Check if campaign is complete
    const updated = updatedCampaign[0];
    if (
      updated &&
      (updated.sentCount ?? 0) + (updated.failedCount ?? 0) >=
      (updated.totalRecipients ?? 0)
    ) {
      await db
        .update(feedbackCampaigns)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(feedbackCampaigns.id, campaignId));
    }

    return {
      success: true,
      successCount,
      failCount,
      message: `Sent ${successCount} emails, ${failCount} failed`,
    };
  } catch (error) {
    console.error("Error sending batch:", error);
    return { success: false, error: "Failed to send batch" };
  }
}

// Retry failed emails
export async function retryFailedEmails(
  campaignId: number,
  emailIds?: number[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get campaign details
    const campaign = await db.query.feedbackCampaigns.findFirst({
      where: eq(feedbackCampaigns.id, campaignId),
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Get failed emails
    let failedEmails;
    if (emailIds && emailIds.length > 0) {
      failedEmails = await db.query.feedbackEmails.findMany({
        where: and(
          eq(feedbackEmails.campaignId, campaignId),
          inArray(feedbackEmails.id, emailIds),
          eq(feedbackEmails.status, "failed")
        ),
      });
    } else {
      failedEmails = await db.query.feedbackEmails.findMany({
        where: and(
          eq(feedbackEmails.campaignId, campaignId),
          eq(feedbackEmails.status, "failed")
        ),
      });
    }

    if (failedEmails.length === 0) {
      return { success: false, error: "No failed emails to retry" };
    }

    let successCount = 0;
    let failCount = 0;

    // Retry sending
    for (const email of failedEmails) {
      try {
        // Update retry count and status
        await db
          .update(feedbackEmails)
          .set({
            status: "sending",
            retryCount: (email.retryCount ?? 0) + 1,
          })
          .where(eq(feedbackEmails.id, email.id));

        await sendEmail({
          to: email.recipientEmail,
          subject: campaign.subject || "Feedback Request",
          react: FeedbackRequestEmail({
            recipientName: email.recipientName,
            emailBody: campaign.emailBody || "",
            feedbackFormUrl: campaign.feedbackFormUrl || undefined,
            linkDisplayText: campaign.linkDisplayText || undefined,
          }),
        });

        // Mark as sent
        await db
          .update(feedbackEmails)
          .set({
            status: "sent",
            sentAt: new Date(),
            errorMessage: null,
          })
          .where(eq(feedbackEmails.id, email.id));

        successCount++;
      } catch (error) {
        // Mark as failed again
        await db
          .update(feedbackEmails)
          .set({
            status: "failed",
            failedAt: new Date(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(feedbackEmails.id, email.id));

        failCount++;
      }
    }

    // Update campaign stats once after retry
    await db
      .update(feedbackCampaigns)
      .set({
        sentCount: (campaign.sentCount ?? 0) + successCount,
        failedCount: Math.max(0, (campaign.failedCount ?? 0) - successCount),
      })
      .where(eq(feedbackCampaigns.id, campaignId));

    return {
      success: true,
      successCount,
      failCount,
      message: `Retry complete: ${successCount} sent, ${failCount} failed`,
    };
  } catch (error) {
    console.error("Error retrying emails:", error);
    return { success: false, error: "Failed to retry emails" };
  }
}

// Get all applicants for recipient selection
export async function getApplicantsForFeedback() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const allApplicants = await db.query.applicants.findMany({
      orderBy: desc(applicants.createdAt),
    });

    const recipients = allApplicants.map((applicant) => ({
      userId: applicant.userId,
      email: applicant.email,
      name: `${applicant.firstName} ${applicant.lastName}`,
    }));

    return { success: true, recipients };
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return { success: false, error: "Failed to fetch applicants" };
  }
}

// Delete campaign
export async function deleteCampaign(campaignId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .delete(feedbackCampaigns)
      .where(eq(feedbackCampaigns.id, campaignId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return { success: false, error: "Failed to delete campaign" };
  }
}
