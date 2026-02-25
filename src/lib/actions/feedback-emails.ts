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

// ─── Private helper (no auth – called internally) ───────────────────────────
async function _processBatch(
  campaignId: number,
  batchNumber: number,
  campaign: { id: number; subject: string | null; emailBody: string | null; feedbackFormUrl: string | null; linkDisplayText: string | null; sentCount: number | null; failedCount: number | null; totalRecipients: number | null; startedAt: Date | null }
): Promise<{ successCount: number; failCount: number }> {
  // Get pending emails for this batch
  const emails = await db.query.feedbackEmails.findMany({
    where: and(
      eq(feedbackEmails.campaignId, campaignId),
      eq(feedbackEmails.batchNumber, batchNumber),
      eq(feedbackEmails.status, "pending")
    ),
  });

  if (emails.length === 0) return { successCount: 0, failCount: 0 };

  // Mark campaign as sending
  await db
    .update(feedbackCampaigns)
    .set({ status: "sending", startedAt: campaign.startedAt || new Date() })
    .where(eq(feedbackCampaigns.id, campaignId));

  let successCount = 0;
  let failCount = 0;

  console.log(
    `[Campaign ${campaignId}] Batch ${batchNumber}: processing ${emails.length} emails`
  );

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    console.log(
      `[Campaign ${campaignId}] Sending ${i + 1}/${emails.length}: ${email.recipientEmail}`
    );

    try {
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

      await db
        .update(feedbackEmails)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(feedbackEmails.id, email.id));

      successCount++;
      console.log(
        `[Campaign ${campaignId}] ✓ Sent to ${email.recipientEmail}`
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[Campaign ${campaignId}] ✗ FAILED ${email.recipientEmail}: ${errMsg}`
      );

      await db
        .update(feedbackEmails)
        .set({
          status: "failed",
          failedAt: new Date(),
          errorMessage: errMsg,
        })
        .where(eq(feedbackEmails.id, email.id));

      failCount++;
    }

    // 350ms between emails to stay within Resend's rate limits.
    // Skip delay after the last email.
    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  console.log(
    `[Campaign ${campaignId}] Batch ${batchNumber} done: ${successCount} sent, ${failCount} failed`
  );

  // Update campaign counters
  const [updated] = await db
    .update(feedbackCampaigns)
    .set({
      sentCount: (campaign.sentCount ?? 0) + successCount,
      failedCount: (campaign.failedCount ?? 0) + failCount,
    })
    .where(eq(feedbackCampaigns.id, campaignId))
    .returning();

  // Mark campaign complete if all emails are accounted for
  if (
    updated &&
    (updated.sentCount ?? 0) + (updated.failedCount ?? 0) >= (updated.totalRecipients ?? 0)
  ) {
    await db
      .update(feedbackCampaigns)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(feedbackCampaigns.id, campaignId));
  }

  return { successCount, failCount };
}

// Send emails in batches (public server action)
export async function sendCampaignBatch(
  campaignId: number,
  batchNumber: number
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const campaign = await db.query.feedbackCampaigns.findFirst({
      where: eq(feedbackCampaigns.id, campaignId),
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Check if there are any pending emails in this batch
    const hasPending = await db.query.feedbackEmails.findFirst({
      where: and(
        eq(feedbackEmails.campaignId, campaignId),
        eq(feedbackEmails.batchNumber, batchNumber),
        eq(feedbackEmails.status, "pending")
      ),
    });

    if (!hasPending) {
      return { success: false, error: "No pending emails in this batch" };
    }

    const { successCount, failCount } = await _processBatch(
      campaignId,
      batchNumber,
      campaign
    );

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

// Check which emails exist in the DB (for Excel import crosscheck)
export async function checkEmailsAgainstDb(emails: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Normalise to lowercase for comparison
    const normalised = emails.map((e) => e.toLowerCase().trim()).filter(Boolean);
    if (normalised.length === 0) {
      return { success: true, results: [] };
    }

    // Fetch all applicants whose email is in the list
    const found = await db.query.applicants.findMany({
      where: inArray(applicants.email, normalised),
    });

    const foundMap = new Map(found.map((a) => [a.email.toLowerCase(), a]));

    const results = normalised.map((email) => {
      const match = foundMap.get(email);
      return match
        ? {
          email,
          inDb: true as const,
          userId: match.userId,
          name: `${match.firstName} ${match.lastName}`.trim(),
        }
        : { email, inDb: false as const };
    });

    return { success: true, results };
  } catch (error) {
    console.error("Error checking emails against DB:", error);
    return { success: false, error: "Failed to check emails" };
  }
}

// Send all pending batches automatically (no setTimeout – avoids server action timeouts)
export async function sendAllBatchesAutomatically(campaignId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const campaign = await db.query.feedbackCampaigns.findFirst({
      where: eq(feedbackCampaigns.id, campaignId),
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    const totalRecipients = campaign.totalRecipients ?? 0;
    const batchSize = campaign.batchSize ?? 5;

    if (totalRecipients === 0) {
      return { success: false, error: "No recipients in campaign" };
    }

    const totalBatches = Math.ceil(totalRecipients / batchSize);
    let totalSent = 0;
    let totalFailed = 0;

    // Snapshot the campaign object so _processBatch can update counters correctly
    // We re-fetch after each batch to keep sentCount / failedCount in sync
    let liveCampaign = campaign;

    for (let batchNumber = 1; batchNumber <= totalBatches; batchNumber++) {
      const { successCount, failCount } = await _processBatch(
        campaignId,
        batchNumber,
        liveCampaign
      );

      totalSent += successCount;
      totalFailed += failCount;

      // Re-fetch so next batch has accurate sentCount / failedCount
      if (successCount + failCount > 0) {
        const refreshed = await db.query.feedbackCampaigns.findFirst({
          where: eq(feedbackCampaigns.id, campaignId),
        });
        if (refreshed) liveCampaign = refreshed;
      }
    }

    return {
      success: true,
      message: `Completed! Sent ${totalSent} emails, ${totalFailed} failed`,
      totalSent,
      totalFailed,
    };
  } catch (error) {
    console.error("Error in automatic batch sending:", error);
    return { success: false, error: "Failed to send batches automatically" };
  }
}
