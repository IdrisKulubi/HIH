"use server";

import db from "@/db/drizzle";
import { userProfiles, applications, applicationScores, scoringConfigurations } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export interface EvaluatorAssignment {
  evaluatorId: string;
  applicationIds: number[];
  role: 'technical_reviewer' | 'jury_member' | 'dragons_den_judge';
}

export interface EvaluatorWorkload {
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail: string;
  role: 'technical_reviewer' | 'jury_member' | 'dragons_den_judge';
  assignedApplications: number;
  completedEvaluations: number;
  pendingEvaluations: number;
}

/**
 * Get all available evaluators by role
 */
export async function getEvaluatorsByRole(role: 'technical_reviewer' | 'jury_member' | 'dragons_den_judge') {
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

    const evaluators = await db.query.userProfiles.findMany({
      where: eq(userProfiles.role, role),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            lastActive: true,
            isOnline: true
          }
        }
      }
    });

    return { success: true, data: evaluators };
  } catch (error) {
    console.error("Error fetching evaluators:", error);
    return { success: false, error: "Failed to fetch evaluators" };
  }
}

/**
 * Get evaluator workload statistics
 */
export async function getEvaluatorWorkloads(role?: 'technical_reviewer' | 'jury_member' | 'dragons_den_judge') {
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

    // Build where clause for role filter
    const whereClause = role ? eq(userProfiles.role, role) : undefined;

    const evaluators = await db.query.userProfiles.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Get assignment and completion statistics for each evaluator
    const workloads: EvaluatorWorkload[] = await Promise.all(
      evaluators.map(async (evaluator) => {
        // Count assigned applications (applications in scoring phase assigned to this evaluator)
        const assignedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(applicationScores)
          .where(eq(applicationScores.evaluatedBy, evaluator.userId))
          .then(result => result[0]?.count || 0);

        // Count completed evaluations (applications with scores from this evaluator)
        const completedCount = await db
          .select({ count: sql<number>`count(distinct ${applicationScores.applicationId})` })
          .from(applicationScores)
          .where(
            and(
              eq(applicationScores.evaluatedBy, evaluator.userId),
              sql`${applicationScores.score} IS NOT NULL`
            )
          )
          .then(result => result[0]?.count || 0);

        return {
          evaluatorId: evaluator.userId,
          evaluatorName: evaluator.user?.name || `${evaluator.firstName} ${evaluator.lastName}`,
          evaluatorEmail: evaluator.user?.email || evaluator.email,
          role: evaluator.role as 'technical_reviewer' | 'jury_member' | 'dragons_den_judge',
          assignedApplications: assignedCount,
          completedEvaluations: completedCount,
          pendingEvaluations: assignedCount - completedCount
        };
      })
    );

    return { success: true, data: workloads };
  } catch (error) {
    console.error("Error fetching evaluator workloads:", error);
    return { success: false, error: "Failed to fetch evaluator workloads" };
  }
}

/**
 * Assign applications to evaluators
 */
export async function assignApplicationsToEvaluators(assignments: EvaluatorAssignment[]) {
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

    // Get active scoring configuration
    const activeConfig = await db.query.scoringConfigurations.findFirst({
      where: eq(scoringConfigurations.isActive, true),
      with: {
        criteria: true
      }
    });

    if (!activeConfig) {
      return { success: false, error: "No active scoring configuration found" };
    }

    // Process each assignment
    for (const assignment of assignments) {
      // Verify evaluator exists and has correct role
      const evaluator = await db.query.userProfiles.findFirst({
        where: and(
          eq(userProfiles.userId, assignment.evaluatorId),
          eq(userProfiles.role, assignment.role)
        )
      });

      if (!evaluator) {
        return { 
          success: false, 
          error: `Evaluator ${assignment.evaluatorId} not found or has incorrect role` 
        };
      }

      // Create scoring entries for each application and criteria
      for (const applicationId of assignment.applicationIds) {
        // Check if application is in correct status for this role
        const application = await db.query.applications.findFirst({
          where: eq(applications.id, applicationId)
        });

        if (!application) {
          continue; // Skip non-existent applications
        }

        // Verify application is in appropriate status for the evaluator role
        const validStatuses = {
          technical_reviewer: ['scoring_phase'],
          jury_member: ['scoring_phase'],
          dragons_den_judge: ['dragons_den']
        };

        if (!validStatuses[assignment.role].includes(application.status)) {
          continue; // Skip applications not in correct status
        }

        // Create scoring entries for each criteria (if not already exists)
        for (const criteria of activeConfig.criteria) {
          const existingScore = await db.query.applicationScores.findFirst({
            where: and(
              eq(applicationScores.applicationId, applicationId),
              eq(applicationScores.criteriaId, criteria.id),
              eq(applicationScores.evaluatedBy, assignment.evaluatorId)
            )
          });

          if (!existingScore) {
            await db.insert(applicationScores).values({
              applicationId,
              criteriaId: criteria.id,
              configId: activeConfig.id,
              score: 0, // Default score, to be updated by evaluator
              maxScore: criteria.maxPoints,
              evaluatedBy: assignment.evaluatorId
            });
          }
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/scoring");
    return { success: true, count: assignments.length };
  } catch (error) {
    console.error("Error assigning applications to evaluators:", error);
    return { success: false, error: "Failed to assign applications to evaluators" };
  }
}

/**
 * Auto-assign applications to evaluators with load balancing
 */
export async function autoAssignApplications(
  applicationIds: number[],
  role: 'technical_reviewer' | 'jury_member' | 'dragons_den_judge',
  evaluatorsPerApplication: number = 2
) {
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

    // Get active scoring configuration
    const activeConfig = await db.query.scoringConfigurations.findFirst({
      where: eq(scoringConfigurations.isActive, true),
      with: {
        criteria: true
      }
    });

    if (!activeConfig) {
      return { success: false, error: "No active scoring configuration found" };
    }

    // Get available evaluators for the role
    const evaluatorsResult = await getEvaluatorsByRole(role);
    if (!evaluatorsResult.success || !evaluatorsResult.data) {
      return { success: false, error: "No evaluators available for this role" };
    }

    const evaluators = evaluatorsResult.data;
    if (evaluators.length === 0) {
      return { success: false, error: `No ${role.replace('_', ' ')}s available` };
    }

    // Create assignments using round-robin
    
    for (const applicationId of applicationIds) {
      // Select evaluators for this application
      const selectedEvaluators = evaluators
        .slice(0, Math.min(evaluatorsPerApplication, evaluators.length));

      for (const evaluator of selectedEvaluators) {
        // Create scoring entries for each criteria
        for (const criteria of activeConfig.criteria) {
          const existingScore = await db.query.applicationScores.findFirst({
            where: and(
              eq(applicationScores.applicationId, applicationId),
              eq(applicationScores.criteriaId, criteria.id),
              eq(applicationScores.evaluatedBy, evaluator.userId)
            )
          });

          if (!existingScore) {
            await db.insert(applicationScores).values({
              applicationId,
              criteriaId: criteria.id,
              configId: activeConfig.id,
              score: 0,
              maxScore: criteria.maxPoints,
              evaluatedBy: evaluator.userId
            });
          }
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/scoring");
    return { 
      success: true,
      applicationsAssigned: applicationIds.length,
      evaluatorsPerApplication
    };
  } catch (error) {
    console.error("Error auto-assigning applications:", error);
    return { success: false, error: "Failed to auto-assign applications" };
  }
}

/**
 * Remove evaluator assignments
 */
export async function removeEvaluatorAssignments(evaluatorId: string, applicationIds: number[]) {
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

    // Remove scoring entries for the evaluator and applications
    await db
      .delete(applicationScores)
      .where(
        and(
          eq(applicationScores.evaluatedBy, evaluatorId),
          inArray(applicationScores.applicationId, applicationIds)
        )
      );

    revalidatePath("/admin");
    revalidatePath("/admin/scoring");
    return { success: true, count: applicationIds.length };
  } catch (error) {
    console.error("Error removing evaluator assignments:", error);
    return { success: false, error: "Failed to remove evaluator assignments" };
  }
}

/**
 * Get applications assigned to a specific evaluator
 */
export async function getEvaluatorAssignments(evaluatorId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is the evaluator or an admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || (userProfile.role !== 'admin' && session.user.id !== evaluatorId)) {
      return { success: false, error: "Access denied" };
    }

    const assignments = await db.query.applicationScores.findMany({
      where: eq(applicationScores.evaluatedBy, evaluatorId),
      with: {
        application: {
          with: {
            business: {
              with: {
                applicant: true
              }
            }
          }
        },
        criteria: true
      },
      orderBy: (scores, { asc }) => [asc(scores.applicationId), asc(scores.criteriaId)]
    });

    // Group by application
    const groupedAssignments = assignments.reduce((acc, assignment) => {
      const appId = assignment.applicationId;
      if (!acc[appId]) {
        acc[appId] = {
          application: assignment.application,
          scores: []
        };
      }
      acc[appId].scores.push({
        criteriaId: assignment.criteriaId,
        criteria: assignment.criteria,
        score: assignment.score,
        maxScore: assignment.maxScore,
        level: assignment.level,
        notes: assignment.notes,
        evaluatedAt: assignment.evaluatedAt
      });
      return acc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as Record<number, any>);

    return { success: true, data: Object.values(groupedAssignments) };
  } catch (error) {
    console.error("Error fetching evaluator assignments:", error);
    return { success: false, error: "Failed to fetch evaluator assignments" };
  }
} 