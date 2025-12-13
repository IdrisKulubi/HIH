"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { applications, eligibilityResults } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyPasscode, setReviewAccess, hasReviewAccess } from "../review-auth";
import * as XLSX from 'xlsx';

/**
 * Verify passcode and grant access to review section
 */
export async function verifyReviewPasscode(passcode: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Please sign in first" };
    }

    const isValid = await verifyPasscode(passcode);

    if (isValid) {
      await setReviewAccess();
      revalidatePath("/admin/review");
      return { success: true };
    } else {
      return { success: false, error: "Invalid passcode" };
    }
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return { success: false, error: "Failed to verify passcode" };
  }
}

/**
 * Check if user has review access
 */
export async function checkReviewAccess() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { hasAccess: false };
    }

    const hasAccess = await hasReviewAccess();
    return { hasAccess };
  } catch (error) {
    console.error("Error checking review access:", error);
    return { hasAccess: false };
  }
}

/**
 * Get applications for review (only shortlisted and under_review)
 */
export async function getApplicationsForReview() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check review access
    const hasAccess = await hasReviewAccess();
    if (!hasAccess) {
      return { success: false, error: "Review access required" };
    }

    // Fetch only shortlisted and under_review applications
    const applicationsData = await db.query.applications.findMany({
      where: or(
        eq(applications.status, 'scoring_phase'),
        eq(applications.status, 'under_review')
      ),
      orderBy: [desc(applications.updatedAt)],
      with: {
        business: {
          with: {
            applicant: true,
          },
        },
        eligibilityResults: {
          orderBy: (results, { desc }) => [desc(results.evaluatedAt)],
          limit: 1,
          with: {
            evaluator: {
              with: {
                userProfile: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: applicationsData,
    };
  } catch (error) {
    console.error("Error fetching applications for review:", error);
    return {
      success: false,
      error: "Failed to fetch applications",
    };
  }
}

/**
 * Approve application after review
 */
export async function approveApplication(applicationId: number, notes?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasReviewAccess();
    if (!hasAccess) {
      return { success: false, error: "Review access required" };
    }

    // Update application status
    await db
      .update(applications)
      .set({
        status: 'approved',
        updatedAt: new Date()
      })
      .where(eq(applications.id, applicationId));

    // Update eligibility result with approval
    const existingResult = await db.query.eligibilityResults.findFirst({
      where: eq(eligibilityResults.applicationId, applicationId)
    });

    if (existingResult) {
      await db
        .update(eligibilityResults)
        .set({
          isEligible: true,
          evaluationNotes: notes ? `APPROVED: ${notes}` : 'Application approved after review',
          evaluatedBy: session.user.id,
          evaluatedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(eligibilityResults.id, existingResult.id));
    }

    revalidatePath("/admin/review");
    return { success: true };
  } catch (error) {
    console.error("Error approving application:", error);
    return { success: false, error: "Failed to approve application" };
  }
}

/**
 * Reject application after review
 */
export async function rejectApplication(applicationId: number, notes?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasReviewAccess();
    if (!hasAccess) {
      return { success: false, error: "Review access required" };
    }

    // Update application status
    await db
      .update(applications)
      .set({
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(applications.id, applicationId));

    // Update eligibility result with rejection
    const existingResult = await db.query.eligibilityResults.findFirst({
      where: eq(eligibilityResults.applicationId, applicationId)
    });

    if (existingResult) {
      await db
        .update(eligibilityResults)
        .set({
          isEligible: false,
          evaluationNotes: notes ? `REJECTED: ${notes}` : 'Application rejected after review',
          evaluatedBy: session.user.id,
          evaluatedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(eligibilityResults.id, existingResult.id));
    }

    revalidatePath("/admin/review");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting application:", error);
    return { success: false, error: "Failed to reject application" };
  }
}

/**
 * Export applications to Excel
 */
export async function exportApplicationsToExcel() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasReviewAccess();
    if (!hasAccess) {
      return { success: false, error: "Review access required" };
    }

    // Fetch all evaluated applications
    const applicationsData = await db.query.applications.findMany({
      where: or(
        eq(applications.status, 'scoring_phase'),
        eq(applications.status, 'under_review'),
        eq(applications.status, 'approved'),
        eq(applications.status, 'rejected')
      ),
      with: {
        business: {
          with: {
            applicant: true,
          },
        },
        eligibilityResults: {
          orderBy: (results, { desc }) => [desc(results.evaluatedAt)],
          limit: 1,
        },
      },
    });

    // Prepare data for Excel
    const excelData = applicationsData.map(app => ({
      'Application ID': app.id,
      'Business Name': app.business.name,
      'Applicant Name': `${app.business.applicant.firstName} ${app.business.applicant.lastName}`,
      'Email': app.business.applicant.email,
      'Phone': app.business.applicant.phoneNumber,
      'Country': app.business.country,
      'City': app.business.city,
      'Status': app.status,
      'Is Eligible': app.eligibilityResults[0]?.isEligible ? 'Yes' : 'No',
      'Total Score': app.eligibilityResults[0]?.totalScore || 0,
      'Evaluation Notes': app.eligibilityResults[0]?.evaluationNotes || '',
      'Evaluated Date': app.eligibilityResults[0]?.evaluatedAt ?
        new Date(app.eligibilityResults[0].evaluatedAt).toLocaleDateString() : '',
      'Submitted Date': app.submittedAt ?
        new Date(app.submittedAt).toLocaleDateString() : '',
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Convert to base64 for download
    const base64 = Buffer.from(excelBuffer).toString('base64');

    return {
      success: true,
      data: base64,
      filename: `applications_review_${new Date().toISOString().split('T')[0]}.xlsx`
    };
  } catch (error) {
    console.error("Error exporting applications:", error);
    return { success: false, error: "Failed to export applications" };
  }
}
