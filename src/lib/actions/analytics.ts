"use server";

import db from "@/db/drizzle";
import { 
  applications, 
  applicationScores, 
  scoringCriteria, 
  userProfiles,
  businesses,
  applicants
} from "../../../db/schema";
import { eq, desc, sql, count, avg, sum, gte, isNotNull } from "drizzle-orm";
import { auth } from "@/auth";

// Simple helper to ensure admin access
async function verifyAdminAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id)
  });

  if (!userProfile || userProfile.role !== 'admin') {
    throw new Error("Admin access required");
  }

  return userProfile;
}

// Get basic application statistics
export async function getBasicStats() {
  try {
    await verifyAdminAccess();
    
    // Total applications count
    const totalAppsResult = await db.select({ count: count() }).from(applications);
    const totalApplications = totalAppsResult[0]?.count || 0;

    // Applications with scores (evaluated)
    const evaluatedAppsResult = await db
      .select({ count: count() })
      .from(applications)
      .innerJoin(applicationScores, eq(applications.id, applicationScores.applicationId));
    const evaluatedApplications = evaluatedAppsResult[0]?.count || 0;

    // Applications from this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyAppsResult = await db
      .select({ count: count() })
      .from(applications)
      .where(gte(applications.createdAt, oneWeekAgo));
    const newThisWeek = weeklyAppsResult[0]?.count || 0;

    // Average score
    const avgScoreResult = await db
      .select({ average: avg(applicationScores.score) })
      .from(applicationScores);
    const averageScore = Math.round(Number(avgScoreResult[0]?.average || 0));

    return {
      success: true,
      data: {
        totalApplications,
        evaluatedApplications,
        evaluationRate: totalApplications > 0 ? Math.round((evaluatedApplications / totalApplications) * 100) : 0,
        newThisWeek,
        averageScore
      }
    };
  } catch (error) {
    console.error("Error fetching basic stats:", error);
    return { success: false, error: "Failed to fetch basic statistics" };
  }
}

// Get application status distribution
export async function getStatusDistribution() {
  try {
    await verifyAdminAccess();
    
    const statusResults = await db
      .select({
        status: applications.status,
        count: count()
      })
      .from(applications)
      .groupBy(applications.status);

    const statusDistribution: Record<string, number> = {};
    statusResults.forEach(result => {
      statusDistribution[result.status] = result.count;
    });

    return {
      success: true,
      data: statusDistribution
    };
  } catch (error) {
    console.error("Error fetching status distribution:", error);
    return { success: false, error: "Failed to fetch status distribution" };
  }
}

// Get country distribution
export async function getCountryDistribution() {
  try {
    await verifyAdminAccess();
    
    const countryResults = await db
      .select({
        country: businesses.country,
        count: count()
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .groupBy(businesses.country)
      .orderBy(desc(count()));

    const countryDistribution: Record<string, number> = {};
    countryResults.forEach(result => {
      if (result.country) {
        countryDistribution[result.country] = result.count;
      }
    });

    return {
      success: true,
      data: countryDistribution
    };
  } catch (error) {
    console.error("Error fetching country distribution:", error);
    return { success: false, error: "Failed to fetch country distribution" };
  }
}

// Get gender distribution
export async function getGenderDistribution() {
  try {
    await verifyAdminAccess();
    
    const genderResults = await db
      .select({
        gender: applicants.gender,
        count: count()
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .innerJoin(applicants, eq(businesses.applicantId, applicants.id))
      .groupBy(applicants.gender)
      .orderBy(desc(count()));

    const genderDistribution: Record<string, number> = {};
    genderResults.forEach(result => {
      if (result.gender) {
        genderDistribution[result.gender] = result.count;
      }
    });

    return {
      success: true,
      data: genderDistribution
    };
  } catch (error) {
    console.error("Error fetching gender distribution:", error);
    return { success: false, error: "Failed to fetch gender distribution" };
  }
}

// Get sector distribution
export async function getSectorDistribution() {
  try {
    await verifyAdminAccess();
    
    const sectorResults = await db
      .select({
        sector: businesses.sector,
        count: count()
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .where(isNotNull(businesses.sector))
      .groupBy(businesses.sector)
      .orderBy(desc(count()));

    const sectorDistribution: Record<string, number> = {};
    sectorResults.forEach(result => {
      if (result.sector) {
        sectorDistribution[result.sector] = result.count;
      }
    });

    return {
      success: true,
      data: sectorDistribution
    };
  } catch (error) {
    console.error("Error fetching sector distribution:", error);
    return { success: false, error: "Failed to fetch sector distribution" };
  }
}

// Get evaluator statistics
export async function getEvaluatorStats() {
  try {
    await verifyAdminAccess();
    
    // Total evaluators
    const totalEvaluatorsResult = await db
      .select({ count: count() })
      .from(userProfiles)
      .where(sql`${userProfiles.role} IN ('technical_reviewer', 'jury_member', 'dragons_den_judge')`);
    const totalEvaluators = totalEvaluatorsResult[0]?.count || 0;

    // Active evaluators (evaluated in last 7 days)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeEvaluatorsResult = await db
      .select({ count: sql`count(distinct ${userProfiles.userId})` })
      .from(userProfiles)
      .innerJoin(applicationScores, eq(userProfiles.userId, applicationScores.evaluatedBy))
      .where(
        sql`${userProfiles.role} IN ('technical_reviewer', 'jury_member', 'dragons_den_judge') 
            AND ${applicationScores.evaluatedAt} >= ${oneWeekAgo}`
      );
    const activeEvaluators = Number(activeEvaluatorsResult[0]?.count || 0);

    return {
      success: true,
      data: {
        totalEvaluators,
        activeEvaluators
      }
    };
  } catch (error) {
    console.error("Error fetching evaluator stats:", error);
    return { success: false, error: "Failed to fetch evaluator statistics" };
  }
}

// Get top applications by total score
export async function getTopApplications(limit = 10) {
  try {
    await verifyAdminAccess();
    
    const topAppsResults = await db
      .select({
        applicationId: applications.id,
        businessName: businesses.name,
        applicantFirstName: applicants.firstName,
        applicantLastName: applicants.lastName,
        totalScore: sum(applicationScores.score),
        scoreCount: count(applicationScores.score)
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .innerJoin(applicants, eq(businesses.applicantId, applicants.id))
      .innerJoin(applicationScores, eq(applications.id, applicationScores.applicationId))
      .groupBy(applications.id, businesses.name, applicants.firstName, applicants.lastName)
      .orderBy(desc(sum(applicationScores.score)))
      .limit(limit);

    const topApplications = topAppsResults.map(app => ({
      applicationId: app.applicationId,
      businessName: app.businessName,
      applicantName: `${app.applicantFirstName} ${app.applicantLastName}`,
      totalScore: Number(app.totalScore || 0),
      scoreCount: app.scoreCount
    }));

    return {
      success: true,
      data: topApplications
    };
  } catch (error) {
    console.error("Error fetching top applications:", error);
    return { success: false, error: "Failed to fetch top applications" };
  }
}

// Get scoring criteria performance
export async function getScoringCriteriaStats() {
  try {
    await verifyAdminAccess();
    
    const criteriaStats = await db
      .select({
        criteriaId: scoringCriteria.id,
        name: scoringCriteria.name,
        category: scoringCriteria.category,
        maxPoints: scoringCriteria.maxPoints,
        averageScore: avg(applicationScores.score),
        totalScores: count(applicationScores.score)
      })
      .from(scoringCriteria)
      .leftJoin(applicationScores, eq(scoringCriteria.id, applicationScores.criteriaId))
      .groupBy(
        scoringCriteria.id, 
        scoringCriteria.name, 
        scoringCriteria.category, 
        scoringCriteria.maxPoints
      )
      .orderBy(scoringCriteria.sortOrder);

    const criteriaAnalytics = criteriaStats.map(criteria => ({
      ...criteria,
      averageScore: Number(criteria.averageScore || 0),
      utilizationRate: criteria.maxPoints > 0 
        ? Math.round((Number(criteria.averageScore || 0) / criteria.maxPoints) * 100) 
        : 0
    }));

    return {
      success: true,
      data: criteriaAnalytics
    };
  } catch (error) {
    console.error("Error fetching scoring criteria stats:", error);
    return { success: false, error: "Failed to fetch scoring criteria statistics" };
  }
}

// Get evaluator performance details
export async function getEvaluatorPerformanceDetails() {
  try {
    await verifyAdminAccess();
    
    const evaluatorPerformance = await db
      .select({
        evaluatorId: userProfiles.id,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: userProfiles.email,
        role: userProfiles.role,
        totalScores: count(applicationScores.score),
        averageScore: avg(applicationScores.score)
      })
      .from(userProfiles)
      .leftJoin(applicationScores, eq(userProfiles.userId, applicationScores.evaluatedBy))
      .where(sql`${userProfiles.role} IN ('technical_reviewer', 'jury_member', 'dragons_den_judge')`)
      .groupBy(
        userProfiles.id, 
        userProfiles.firstName, 
        userProfiles.lastName, 
        userProfiles.email, 
        userProfiles.role
      )
      .orderBy(desc(count(applicationScores.score)));

    const evaluators = evaluatorPerformance.map(evaluator => ({
      evaluatorId: evaluator.evaluatorId,
      name: `${evaluator.firstName} ${evaluator.lastName}`,
      email: evaluator.email,
      role: evaluator.role,
      totalEvaluations: evaluator.totalScores,
      averageScore: Number(evaluator.averageScore || 0)
    }));

    return {
      success: true,
      data: evaluators
    };
  } catch (error) {
    console.error("Error fetching evaluator performance details:", error);
    return { success: false, error: "Failed to fetch evaluator performance details" };
  }
}

// Combined analytics dashboard data
export async function getAnalyticsDashboardData() {
  try {
    const [
      basicStats,
      statusDistribution,
      countryDistribution,
      genderDistribution,
      sectorDistribution,
      evaluatorStats
    ] = await Promise.all([
      getBasicStats(),
      getStatusDistribution(),
      getCountryDistribution(),
      getGenderDistribution(),
      getSectorDistribution(),
      getEvaluatorStats()
    ]);

    if (!basicStats.success || !statusDistribution.success || 
        !countryDistribution.success || !genderDistribution.success || 
        !sectorDistribution.success || !evaluatorStats.success) {
      throw new Error("Failed to fetch one or more analytics components");
    }

    return {
      success: true,
      data: {
        ...basicStats.data,
        ...evaluatorStats.data,
        statusDistribution: statusDistribution.data,
        countryDistribution: countryDistribution.data,
        genderDistribution: genderDistribution.data,
        sectorDistribution: sectorDistribution.data
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return { success: false, error: "Failed to fetch analytics dashboard data" };
  }
}

// Combined scoring analytics
export async function getScoringAnalytics() {
  try {
    const [criteriaStats, topApplications] = await Promise.all([
      getScoringCriteriaStats(),
      getTopApplications(10)
    ]);

    if (!criteriaStats.success || !topApplications.success) {
      throw new Error("Failed to fetch scoring analytics components");
    }

    return {
      success: true,
      data: {
        criteriaAnalytics: criteriaStats.data,
        topApplications: topApplications.data
      }
    };
  } catch (error) {
    console.error("Error fetching scoring analytics:", error);
    return { success: false, error: "Failed to fetch scoring analytics" };
  }
}

// Combined evaluator performance
export async function getEvaluatorPerformance() {
  try {
    const evaluatorDetails = await getEvaluatorPerformanceDetails();
    
    if (!evaluatorDetails.success) {
      throw new Error("Failed to fetch evaluator performance details");
    }

    return {
      success: true,
      data: {
        evaluators: evaluatorDetails.data,
        summary: {
          totalEvaluators: evaluatorDetails.data?.length || 0,
          totalEvaluations: evaluatorDetails.data?.reduce((sum, e) => sum + e.totalEvaluations, 0) || 0,
          averageScore: evaluatorDetails.data && evaluatorDetails.data.length && evaluatorDetails.data.length > 0 
            ? Math.round((evaluatorDetails.data.reduce((sum, e) => sum + e.averageScore, 0) || 0) / (evaluatorDetails.data.length || 1))
            : 0
        }
      }
    };
  } catch (error) {
    console.error("Error fetching evaluator performance:", error);
    return { success: false, error: "Failed to fetch evaluator performance" };
  }
} 