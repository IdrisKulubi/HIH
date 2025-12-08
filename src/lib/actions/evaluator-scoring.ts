/* eslint-disable @typescript-eslint/no-explicit-any */

"use server";

import db from "@/db/drizzle";
import { applicationScores, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export interface ScoreUpdate {
  applicationId: number;
  criteriaId: number;
  score: number;
  level?: string;
  notes?: string;
}

/**
 * Get applications assigned to current evaluator
 */
export async function getMyAssignedApplications() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is an evaluator
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || 
        (userProfile.role !== 'admin' && 
         !['technical_reviewer', 'jury_member', 'dragons_den_judge'].includes(userProfile.role))
    ) {
      return { success: false, error: "Access denied. You do not have the required permissions." };
    }

    // Get assigned applications with scores
    const assignments = await db.query.applicationScores.findMany({
      where: eq(applicationScores.evaluatedBy, session.user.id),
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
        criteria: true,
        configuration: true
      },
      orderBy: (scores, { asc }) => [asc(scores.applicationId), asc(scores.criteriaId)]
    });

    // Group by application
    const groupedAssignments = assignments.reduce((acc, assignment) => {
      const appId = assignment.applicationId;
      if (!acc[appId]) {
        acc[appId] = {
          application: assignment.application,
          configuration: assignment.configuration,
          scores: [],
          totalScore: 0,
          maxTotalScore: 0,
          completionPercentage: 0
        };
      }
      
      acc[appId].scores.push({
        id: assignment.id,
        criteriaId: assignment.criteriaId,
        criteria: assignment.criteria,
        score: assignment.score,
        maxScore: assignment.maxScore,
        level: assignment.level,
        notes: assignment.notes,
        evaluatedAt: assignment.evaluatedAt
      });

      // Calculate totals
      acc[appId].totalScore += assignment.score || 0;
      acc[appId].maxTotalScore += assignment.maxScore;
      
      return acc;

    }, {} as Record<number, any>);

    // Calculate completion percentages
    Object.values(groupedAssignments).forEach((assignment: any) => {
      const completedScores = assignment.scores.filter((s: any) => s.score > 0).length;
      assignment.completionPercentage = Math.round((completedScores / assignment.scores.length) * 100);
    });

    return { success: true, data: Object.values(groupedAssignments) };
  } catch (error) {
    console.error("Error fetching assigned applications:", error);
    return { success: false, error: "Failed to fetch assigned applications" };
  }
}

/**
 * Update application scores
 */
export async function updateApplicationScores(updates: ScoreUpdate[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is an evaluator
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!userProfile || 
        (userProfile.role !== 'admin' && 
         !['technical_reviewer', 'jury_member', 'dragons_den_judge'].includes(userProfile.role))
    ) {
      return { success: false, error: "Access denied. You do not have the required permissions." };
    }

    // Update each score
    for (const update of updates) {
      // Verify the evaluator is assigned to this application/criteria
      const existingScore = await db.query.applicationScores.findFirst({
        where: and(
          eq(applicationScores.applicationId, update.applicationId),
          eq(applicationScores.criteriaId, update.criteriaId),
          eq(applicationScores.evaluatedBy, session.user.id)
        )
      });

      if (!existingScore) {
        continue; // Skip if not assigned
      }

      // Validate score is within bounds
      if (update.score < 0 || update.score > existingScore.maxScore) {
        return { 
          success: false, 
          error: `Score ${update.score} is out of bounds (0-${existingScore.maxScore})` 
        };
      }

      // Update the score
      await db
        .update(applicationScores)
        .set({
          score: update.score,
          level: update.level,
          notes: update.notes,
          evaluatedAt: new Date()
        })
        .where(eq(applicationScores.id, existingScore.id));
    }

    revalidatePath("/evaluator");
    return { success: true, count: updates.length };
  } catch (error) {
    console.error("Error updating application scores:", error);
    return { success: false, error: "Failed to update scores" };
  }
}
