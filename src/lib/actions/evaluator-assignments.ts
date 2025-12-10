"use server";

// NOTE: This file contains legacy evaluator assignment logic that was designed
// for a different schema structure. The current applicationScores table uses
// eligibilityResultId and does not have evaluatedBy or applicationId columns.
// These functions are stubbed out until proper refactoring can be done.

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface EvaluatorAssignment {
  evaluatorId: string;
  applicationIds: number[];
  role: 'technical_reviewer';
}

export interface EvaluatorWorkload {
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail: string;
  role: 'technical_reviewer';
  assignedApplications: number;
  completedEvaluations: number;
  pendingEvaluations: number;
}

/**
 * Get all available evaluators by role
 */
export async function getEvaluatorsByRole(role: 'technical_reviewer' = 'technical_reviewer') {
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
 * NOTE: Stubbed - requires schema refactoring
 */
export async function getEvaluatorWorkloads(_role?: 'technical_reviewer') {
  return {
    success: false,
    error: "This feature requires schema updates. Evaluator workload tracking is not currently available.",
    data: [] as EvaluatorWorkload[]
  };
}

/**
 * Assign applications to evaluators
 * NOTE: Stubbed - requires schema refactoring
 */
export async function assignApplicationsToEvaluators(_assignments: EvaluatorAssignment[]) {
  return {
    success: false,
    error: "This feature requires schema updates. Manual assignment is not currently available. Use the Two-Tier Review system instead."
  };
}

/**
 * Auto-assign applications to evaluators with load balancing
 * NOTE: Stubbed - requires schema refactoring
 */
export async function autoAssignApplications(
  _applicationIds: number[],
  _role: 'technical_reviewer' = 'technical_reviewer',
  _evaluatorsPerApplication: number = 2
) {
  return {
    success: false,
    error: "This feature requires schema updates. Auto-assignment is not currently available. Use the Two-Tier Review system instead.",
    applicationsAssigned: 0,
    evaluatorsPerApplication: 0
  };
}

/**
 * Remove evaluator assignments
 * NOTE: Stubbed - requires schema refactoring
 */
export async function removeEvaluatorAssignments(_evaluatorId: string, _applicationIds: number[]) {
  return {
    success: false,
    error: "This feature requires schema updates."
  };
}

/**
 * Get applications assigned to a specific evaluator
 * NOTE: Stubbed - requires schema refactoring
 */
export async function getEvaluatorAssignments(_evaluatorId: string) {
  return {
    success: false,
    error: "This feature requires schema updates. Use the Two-Tier Review system instead.",
    data: []
  };
}