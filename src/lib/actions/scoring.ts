"use server";

import  db  from "../../../db/drizzle";
import {
  scoringConfigurations,
  scoringCriteria,
  evaluationHistory,
  eligibilityResults,
  applications,
} from "../../../db/schema";
import { eq,  inArray } from "drizzle-orm";
import { auth } from "../../../auth";
import { revalidatePath } from "next/cache";
import { ScoringConfigurationData, DEFAULT_KCIC_SCORING_CONFIG } from "../types/scoring";

/**
 * Create a new scoring configuration
 */
export async function createScoringConfiguration(configData: ScoringConfigurationData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate user is admin
    if (session.user.role !== "admin") {
      return { success: false, error: "Admin access required" };
    }

    // Insert configuration
    const [config] = await db
      .insert(scoringConfigurations)
      .values({
        name: configData.name,
        description: configData.description,
        version: configData.version,
        totalMaxScore: configData.totalMaxScore,
        passThreshold: configData.passThreshold,
        createdBy: session.user.id,
      })
      .returning();

    // Insert criteria
    if (configData.criteria && configData.criteria.length > 0) {
      const criteriaToInsert = configData.criteria.map((criteria) => ({
        configId: config.id,
        category: criteria.category,
        name: criteria.name,
        description: criteria.description,
        maxPoints: criteria.maxPoints,
        weightage: criteria.weightage ? criteria.weightage.toString() : undefined,
        scoringLevels: JSON.stringify(criteria.scoringLevels),
        evaluationType: criteria.evaluationType || 'manual',
        sortOrder: criteria.sortOrder || 0,
        isRequired: criteria.isRequired !== false,
      }));

      await db.insert(scoringCriteria).values(criteriaToInsert);
    }

    revalidatePath("/admin");
    return { success: true, data: config };
  } catch (error) {
    console.error("Error creating scoring configuration:", error);
    return { success: false, error: "Failed to create scoring configuration" };
  }
}

/**
 * Get all scoring configurations
 */
export async function getScoringConfigurations() {
  try {
    const configs = await db.query.scoringConfigurations.findMany({
      with: {
        criteria: {
          orderBy: (criteria, { asc }) => [asc(criteria.sortOrder)],
        },
        creator: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: (configs, { desc }) => [desc(configs.createdAt)],
    });

    return { success: true, data: configs };
  } catch (error) {
    console.error("Error fetching scoring configurations:", error);
    return { success: false, error: "Failed to fetch scoring configurations" };
  }
}

/**
 * Get active scoring configuration
 */
export async function getActiveScoringConfiguration() {
  try {
    const config = await db.query.scoringConfigurations.findFirst({
      where: eq(scoringConfigurations.isActive, true),
      with: {
        criteria: {
          orderBy: (criteria, { asc }) => [asc(criteria.sortOrder)],
        },
      },
    });

    return { success: true, data: config };
  } catch (error) {
    console.error("Error fetching active scoring configuration:", error);
    return { success: false, error: "Failed to fetch active configuration" };
  }
}

/**
 * Activate a scoring configuration
 */
export async function activateScoringConfiguration(configId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    // Deactivate all configs first
    await db
      .update(scoringConfigurations)
      .set({ isActive: false })
      .where(eq(scoringConfigurations.isActive, true));

    // Activate the selected config
    await db
      .update(scoringConfigurations)
      .set({ isActive: true })
      .where(eq(scoringConfigurations.id, configId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error activating scoring configuration:", error);
    return { success: false, error: "Failed to activate configuration" };
  }
}

/**
 * Re-evaluate applications with new scoring configuration
 */
export async function reEvaluateApplications(configId: number, applicationIds?: number[]) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    // Get the new scoring configuration
    const configResult = await db.query.scoringConfigurations.findFirst({
      where: eq(scoringConfigurations.id, configId),
      with: {
        criteria: {
          orderBy: (criteria, { asc }) => [asc(criteria.sortOrder)],
        },
      },
    });

    if (!configResult) {
      return { success: false, error: "Scoring configuration not found" };
    }

    // Get applications to re-evaluate
    let appsToEvaluate;
    if (applicationIds && applicationIds.length > 0) {
      appsToEvaluate = await db.query.applications.findMany({
        where: inArray(applications.id, applicationIds),
        with: {
          business: {
            with: {
              applicant: true,
            },
          },
          eligibilityResults: true,
        },
      });
    } else {
      appsToEvaluate = await db.query.applications.findMany({
        with: {
          business: {
            with: {
              applicant: true,
            },
          },
          eligibilityResults: true,
        },
      });
    }

    if (!appsToEvaluate || appsToEvaluate.length === 0) {
      return { success: false, error: "No applications found to re-evaluate" };
    }

    const results = [];
    const evaluationHistoryEntries = [];

    for (const app of appsToEvaluate) {
      // Get current eligibility result
      const currentResult = app.eligibilityResults?.[0] || null;

      // Calculate new score
      const newScore = calculateBasicScore(app, configResult);
      const newEligible = newScore >= configResult.passThreshold;

      const currentScore = currentResult?.totalScore || 0;
      const currentEligible = currentResult?.isEligible || false;

      // Create history entry
      evaluationHistoryEntries.push({
        applicationId: app.id,
        newConfigId: configId,
        previousTotalScore: currentScore,
        newTotalScore: newScore,
        previousIsEligible: currentEligible,
        newIsEligible: newEligible,
        evaluatedBy: session.user.id,
      });

      // Update or create eligibility result
      if (currentResult) {
        await db
          .update(eligibilityResults)
          .set({
            totalScore: newScore,
            isEligible: newEligible,
            scoringConfigId: configId,
            evaluatedAt: new Date(),
          })
          .where(eq(eligibilityResults.id, currentResult.id));
      } else {
        await db.insert(eligibilityResults).values({
          applicationId: app.id,
          totalScore: newScore,
          isEligible: newEligible,
          scoringConfigId: configId,
          ageEligible: true, // Required field - set default
          registrationEligible: true, // Required field - set default
          revenueEligible: true, // Required field - set default
          businessPlanEligible: true, // Required field - set default
          impactEligible: true, // Required field - set default
          evaluatedAt: new Date(),
        });
      }

      results.push({
        applicationId: app.id,
        applicantName: app.business?.applicant?.firstName + " " + app.business?.applicant?.lastName,
        businessName: app.business?.name,
        previousScore: currentScore,
        newScore: newScore,
        previousEligible: currentEligible,
        newEligible: newEligible,
        scoreChange: newScore - currentScore,
        eligibilityChanged: currentEligible !== newEligible,
      });
    }

    // Save evaluation history
    if (evaluationHistoryEntries.length > 0) {
      await db.insert(evaluationHistory).values(evaluationHistoryEntries);
    }

    // Calculate summary statistics
    const totalEvaluated = results.length;
    const eligibilityChanges = results.filter(r => r.eligibilityChanged).length;
    const newEligible = results.filter(r => r.newEligible && !r.previousEligible).length;
    const lostEligibility = results.filter(r => !r.newEligible && r.previousEligible).length;
    const averageScoreChange = results.reduce((sum, r) => sum + r.scoreChange, 0) / totalEvaluated;

    revalidatePath("/admin");
    return {
      success: true,
      data: {
        results,
        summary: {
          totalEvaluated,
          eligibilityChanges,
          newEligible,
          lostEligibility,
          averageScoreChange: Math.round(averageScoreChange * 100) / 100,
        },
      },
    };
  } catch (error) {
    console.error("Error re-evaluating applications:", error);
    return { success: false, error: "Failed to re-evaluate applications" };
  }
}

/**
 * Calculate a basic score for an application based on the scoring configuration
 */
//eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateBasicScore(application: any, config: any): number {
  let totalScore = 0;
  
  // For demonstration, we'll assign scores based on some heuristics
  // In a real implementation, this would be based on actual evaluation criteria
  for (const criteria of config.criteria) {
    let criteriaScore = 0;
    
    // Simple heuristic scoring based on criteria type
    if (criteria.name.toLowerCase().includes('innovation')) {
      criteriaScore = Math.min(criteria.maxPoints, Math.floor(Math.random() * criteria.maxPoints * 0.8) + criteria.maxPoints * 0.2);
    } else if (criteria.name.toLowerCase().includes('business') || criteria.name.toLowerCase().includes('financial')) {
      criteriaScore = Math.min(criteria.maxPoints, Math.floor(Math.random() * criteria.maxPoints * 0.7) + criteria.maxPoints * 0.3);
    } else if (criteria.name.toLowerCase().includes('climate') || criteria.name.toLowerCase().includes('adaptation')) {
      criteriaScore = Math.min(criteria.maxPoints, Math.floor(Math.random() * criteria.maxPoints * 0.9) + criteria.maxPoints * 0.1);
    } else {
      criteriaScore = Math.floor(Math.random() * criteria.maxPoints);
    }
    
    totalScore += criteriaScore;
  }
  
  return Math.min(totalScore, config.totalMaxScore);
}

/**
 * Initialize the default KCIC scoring configuration
 */
export async function initializeDefaultScoringConfig() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    // Check if default config already exists
    const existingConfig = await db.query.scoringConfigurations.findFirst({
      where: eq(scoringConfigurations.name, DEFAULT_KCIC_SCORING_CONFIG.name),
    });

    if (existingConfig) {
      return { success: false, error: "Default KCIC configuration already exists" };
    }

    // Create the default configuration
    const result = await createScoringConfiguration(DEFAULT_KCIC_SCORING_CONFIG);
    
    if (result.success && result.data) {
      // Activate it as the default
      await activateScoringConfiguration(result.data.id);
    }

    return result;
  } catch (error) {
    console.error("Error initializing default scoring config:", error);
    return { success: false, error: "Failed to initialize default configuration" };
  }
}
