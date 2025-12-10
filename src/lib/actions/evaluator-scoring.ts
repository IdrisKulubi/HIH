/* eslint-disable @typescript-eslint/no-explicit-any */

"use server";

// NOTE: This file contains legacy evaluator scoring logic that was designed
// for a different schema structure. The current applicationScores table uses
// eligibilityResultId and does not have evaluatedBy or applicationId columns.
// These functions are stubbed out until proper refactoring can be done.
// Use the Two-Tier Review system (two-tier-review.ts) instead.

import db from "@/db/drizzle";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export interface ScoreUpdate {
  applicationId: number;
  criteriaId: number;
  score: number;
  level?: string;
  notes?: string;
}

/**
 * Get applications assigned to current evaluator
 * NOTE: Stubbed - requires schema refactoring. Use Two-Tier Review system instead.
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
      (userProfile.role !== 'admin' && userProfile.role !== 'technical_reviewer')
    ) {
      return { success: false, error: "Access denied. You do not have the required permissions." };
    }

    // Legacy functionality - return empty result with guidance
    return {
      success: true,
      data: [],
      message: "This legacy scoring system has been replaced by the Two-Tier Review system. Please use the review panel on application detail pages."
    };
  } catch (error) {
    console.error("Error fetching assigned applications:", error);
    return { success: false, error: "Failed to fetch assigned applications" };
  }
}

/**
 * Update application scores
 * NOTE: Stubbed - requires schema refactoring. Use Two-Tier Review system instead.
 */
export async function updateApplicationScores(_updates: ScoreUpdate[]) {
  return {
    success: false,
    error: "This legacy scoring system has been replaced by the Two-Tier Review system. Please use the review panel on application detail pages."
  };
}
