"use server";

import db from "../../../db/drizzle";
import { applications, eligibilityResults, userProfiles } from "../../../db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { auth } from "../../../auth";
import { revalidatePath } from "next/cache";

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'scoring_phase'
  | 'dragons_den'
  | 'finalist'
  | 'approved'
  | 'rejected';

export interface ApplicationStatusUpdate {
  applicationId: number;
  status: ApplicationStatus;
  notes?: string;
}

/**
 * Update application status - Admin only
 */
export async function updateApplicationStatus(applicationId: number, status: ApplicationStatus, notes?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, error: "Admin access required" };
    }

    // Update application status
    await db
      .update(applications)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(applications.id, applicationId));

    // Log the status change in eligibility results for audit trail
    if (notes) {
      // Check if eligibility result already exists
      const existingResult = await db.query.eligibilityResults.findFirst({
        where: eq(eligibilityResults.applicationId, applicationId)
      });

      const isEligible = status === 'shortlisted' || status === 'scoring_phase' || status === 'dragons_den' || status === 'finalist' || status === 'approved';
      const statusNote = `Status changed to ${status}: ${notes}`;

      if (existingResult) {
        // Update existing record
        await db
          .update(eligibilityResults)
          .set({
            isEligible,
            evaluationNotes: statusNote,
            evaluatedBy: session.user.id,
            evaluatedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(eligibilityResults.id, existingResult.id));
      } else {
        // Insert new record
        await db.insert(eligibilityResults).values({
          applicationId,
          isEligible,
          totalScore: null,
          evaluationNotes: statusNote,
          evaluatedBy: session.user.id,
          ageEligible: false,
          registrationEligible: false,
          revenueEligible: false,
          businessPlanEligible: false,
          impactEligible: false,
        });
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    return { success: true };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update application status" };
  }
}

/**
 * Bulk update application statuses - Admin only
 */
export async function bulkUpdateApplicationStatus(updates: ApplicationStatusUpdate[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, error: "Admin access required" };
    }

    const now = new Date();
    
    // Update each application
    for (const update of updates) {
      await db
        .update(applications)
        .set({ 
          status: update.status,
          updatedAt: now
        })
        .where(eq(applications.id, update.applicationId));

      // Log the status change
      if (update.notes) {
        // Check if eligibility result already exists
        const existingResult = await db.query.eligibilityResults.findFirst({
          where: eq(eligibilityResults.applicationId, update.applicationId)
        });

        const isEligible = update.status === 'shortlisted' || update.status === 'scoring_phase' || update.status === 'dragons_den' || update.status === 'finalist' || update.status === 'approved';
        const statusNote = `Status changed to ${update.status}: ${update.notes}`;

        if (existingResult) {
          // Update existing record
          await db
            .update(eligibilityResults)
            .set({
              isEligible,
              evaluationNotes: statusNote,
              evaluatedBy: session.user.id,
              evaluatedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(eligibilityResults.id, existingResult.id));
        } else {
          // Insert new record
          await db.insert(eligibilityResults).values({
            applicationId: update.applicationId,
            isEligible,
            totalScore: null,
            evaluationNotes: statusNote,
            evaluatedBy: session.user.id,
            ageEligible: false,
            registrationEligible: false,
            revenueEligible: false,
            businessPlanEligible: false,
            impactEligible: false,
          });
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    return { success: true, count: updates.length };
  } catch (error) {
    console.error("Error bulk updating application statuses:", error);
    return { success: false, error: "Failed to bulk update application statuses" };
  }
}

/**
 * Get applications by status with pagination
 */
export async function getApplicationsByStatus(
  status?: ApplicationStatus | ApplicationStatus[], 
  page: number = 1, 
  limit: number = 10
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const offset = (page - 1) * limit;
    let whereClause;

    if (status) {
      if (Array.isArray(status)) {
        whereClause = inArray(applications.status, status);
      } else {
        whereClause = eq(applications.status, status);
      }
    }

    const [applicationsData, totalCount] = await Promise.all([
      db.query.applications.findMany({
        where: whereClause,
        with: {
          business: {
            with: {
              applicant: true
            }
          },
          eligibilityResults: {
            orderBy: (results, { desc }) => [desc(results.evaluatedAt)],
            limit: 1
          }
        },
        orderBy: (applications, { desc }) => [desc(applications.createdAt)],
        limit,
        offset
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(whereClause)
        .then(result => result[0]?.count || 0)
    ]);

    return { 
      success: true, 
      data: {
        applications: applicationsData,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    };
  } catch (error) {
    console.error("Error fetching applications by status:", error);
    return { success: false, error: "Failed to fetch applications" };
  }
}

/**
 * Get application status statistics
 */
export async function getApplicationStatusStats() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const stats = await db
      .select({
        status: applications.status,
        count: sql<number>`count(*)`
      })
      .from(applications)
      .groupBy(applications.status);

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = Number(stat.count); // Ensure count is converted to number
      return acc;
    }, {} as Record<string, number>);

    return { 
      success: true, 
      data: {
        totalApplications: stats.reduce((sum, stat) => sum + Number(stat.count), 0),
        submitted: statusCounts.submitted || 0,
        under_review: statusCounts.under_review || 0,
        shortlisted: statusCounts.shortlisted || 0,
        scoring_phase: statusCounts.scoring_phase || 0,
        dragons_den: statusCounts.dragons_den || 0,
        finalist: statusCounts.finalist || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
        draft: statusCounts.draft || 0
      }
    };
  } catch (error) {
    console.error("Error fetching application status stats:", error);
    return { success: false, error: "Failed to fetch status statistics" };
  }
}

/**
 * Shortlist applications - Move eligible applications to shortlisted status
 */
export async function shortlistApplications(applicationIds: number[], notes?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, error: "Admin access required" };
    }

    // Update applications to shortlisted status
    await db
      .update(applications)
      .set({ 
        status: 'shortlisted',
        updatedAt: new Date()
      })
      .where(inArray(applications.id, applicationIds));

    // Log the shortlisting
    const eligibilityInserts = applicationIds.map(applicationId => ({
      applicationId,
      isEligible: true,
      totalScore: null,
      evaluationNotes: notes ? `Shortlisted: ${notes}` : 'Application shortlisted for further evaluation',
      evaluatedBy: session.user.id,
      ageEligible: false,
      registrationEligible: false,
      revenueEligible: false,
      businessPlanEligible: false,
      impactEligible: false,
    }));

    await db.insert(eligibilityResults).values(eligibilityInserts);

    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    return { success: true, count: applicationIds.length };
  } catch (error) {
    console.error("Error shortlisting applications:", error);
    return { success: false, error: "Failed to shortlist applications" };
  }
}

/**
 * Move shortlisted applications to scoring phase
 */
export async function moveToScoringPhase(applicationIds: number[], notes?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || userProfile.role !== 'admin') {
      return { success: false, error: "Admin access required" };
    }

    // Only move shortlisted applications
    await db
      .update(applications)
      .set({ 
        status: 'scoring_phase',
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(applications.id, applicationIds),
          eq(applications.status, 'shortlisted')
        )
      );

    // Log the phase change
    const eligibilityInserts = applicationIds.map(applicationId => ({
      applicationId,
      isEligible: true,
      totalScore: null,
      evaluationNotes: notes ? `Moved to scoring phase: ${notes}` : 'Application moved to scoring phase',
      evaluatedBy: session.user.id,
      ageEligible: false,
      registrationEligible: false,
      revenueEligible: false,
      businessPlanEligible: false,
      impactEligible: false,
    }));

    await db.insert(eligibilityResults).values(eligibilityInserts);

    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    return { success: true, count: applicationIds.length };
  } catch (error) {
    console.error("Error moving applications to scoring phase:", error);
    return { success: false, error: "Failed to move applications to scoring phase" };
  }
} 