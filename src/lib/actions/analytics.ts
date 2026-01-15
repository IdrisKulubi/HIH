"use server";

import db from "@/db/drizzle";
import {
  applications,
  applicationScores,
  scoringCriteria,
  userProfiles,
  businesses,
  applicants,
  eligibilityResults
} from "../../../db/schema";
import { eq, desc, sql, count, avg, sum, gte, isNotNull, or, and } from "drizzle-orm";
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
    // Use eligibilityResults because it links 1:1 with applications and has totalScore
    const evaluatedAppsResult = await db
      .select({ count: count() })
      .from(eligibilityResults)
      .where(isNotNull(eligibilityResults.totalScore));
    const evaluatedApplications = evaluatedAppsResult[0]?.count || 0;

    // Applications from this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyAppsResult = await db
      .select({ count: count() })
      .from(applications)
      .where(gte(applications.createdAt, oneWeekAgo));
    const newThisWeek = weeklyAppsResult[0]?.count || 0;

    // Average score - using eligibilityResults.totalScore
    const avgScoreResult = await db
      .select({ average: avg(eligibilityResults.totalScore) })
      .from(eligibilityResults)
      .where(isNotNull(eligibilityResults.totalScore));

    // Convert decimal string to number for rounding
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

// Get track distribution (Foundation vs Acceleration)
export async function getTrackDistribution() {
  try {
    await verifyAdminAccess();

    const trackResults = await db
      .select({
        track: applications.track,
        count: count()
      })
      .from(applications)
      .where(isNotNull(applications.track))
      .groupBy(applications.track)
      .orderBy(desc(count()));

    const trackDistribution: Record<string, number> = {
      foundation: 0,
      acceleration: 0
    };

    trackResults.forEach(result => {
      if (result.track) {
        trackDistribution[result.track] = result.count;
      }
    });

    return {
      success: true,
      data: trackDistribution
    };
  } catch (error) {
    console.error("Error fetching track distribution:", error);
    return { success: false, error: "Failed to fetch track distribution" };
  }
}

// Get Kenya county distribution
export async function getCountyDistribution() {
  try {
    await verifyAdminAccess();

    const countyResults = await db
      .select({
        county: businesses.county,
        count: count()
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .where(isNotNull(businesses.county))
      .groupBy(businesses.county)
      .orderBy(desc(count()));

    const countyDistribution: Record<string, number> = {};
    countyResults.forEach(result => {
      if (result.county) {
        // Format county name nicely
        const countyName = result.county.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        countyDistribution[countyName] = result.count;
      }
    });

    return {
      success: true,
      data: countyDistribution
    };
  } catch (error) {
    console.error("Error fetching county distribution:", error);
    return { success: false, error: "Failed to fetch county distribution" };
  }
}

// Get demographics breakdown (age, gender)
export async function getDemographicsBreakdown() {
  try {
    await verifyAdminAccess();

    // Gender distribution
    const genderResult = await getGenderDistribution();

    // Age group distribution - calculate from dateOfBirth
    // Using raw SQL for age calculation since Drizzle doesn't have a direct 'age' helper
    const ageResults = await db.execute(sql`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) BETWEEN 18 AND 24 THEN '18-24'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) BETWEEN 25 AND 30 THEN '25-30'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) BETWEEN 31 AND 35 THEN '31-35'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) >= 36 THEN '36+'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
      FROM ${applicants}
      GROUP BY age_group
    `);

    const ageGroups: Record<string, number> = {
      '18-24': 0,
      '25-30': 0,
      '31-35': 0,
      '36+': 0
    };

    (ageResults as unknown as any[]).forEach((result: any) => {
      if (result.age_group && result.age_group !== 'Unknown') {
        ageGroups[result.age_group] = Number(result.count);
      }
    });

    return {
      success: true,
      data: {
        gender: genderResult.success ? genderResult.data : {},
        education: {}, // Removed as column is missing in schema
        ageGroups
      }
    };
  } catch (error) {
    console.error("Error fetching demographics breakdown:", error);
    return { success: false, error: "Failed to fetch demographics breakdown" };
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
    // Link userProfiles to eligibilityResults via reviewer1Id OR reviewer2Id
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Complex query: Count distinct userIds where id IN (reviewer1Id where reviewer1At > 7d)
    // For simplicity with Drizzle/SQL:
    const activeEvaluatorsResult = await db.execute(sql`
      SELECT COUNT(DISTINCT up.user_id) as count
      FROM ${userProfiles} up
      LEFT JOIN ${eligibilityResults} er ON (up.user_id = er.reviewer1_id OR up.user_id = er.reviewer2_id)
      WHERE 
        up.role IN ('technical_reviewer', 'jury_member', 'dragons_den_judge')
        AND (
          (er.reviewer1_id = up.user_id AND er.reviewer1_at >= ${oneWeekAgo})
          OR 
          (er.reviewer2_id = up.user_id AND er.reviewer2_at >= ${oneWeekAgo})
        )
    `);

    const activeEvaluators = Number((activeEvaluatorsResult as unknown as any[])[0]?.count || 0);

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

    // Use eligibilityResults.totalScore directly
    const topAppsResults = await db
      .select({
        applicationId: applications.id,
        businessName: businesses.name,
        applicantFirstName: applicants.firstName,
        applicantLastName: applicants.lastName,
        totalScore: eligibilityResults.totalScore,
        // scoreCount? Maybe redundant if we have total. 
      })
      .from(applications)
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .innerJoin(applicants, eq(businesses.applicantId, applicants.id))
      .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
      .where(isNotNull(eligibilityResults.totalScore))
      .orderBy(desc(eligibilityResults.totalScore))
      .limit(limit);

    const topApplications = topAppsResults.map(app => ({
      applicationId: app.applicationId,
      businessName: app.businessName,
      applicantName: `${app.applicantFirstName} ${app.applicantLastName}`,
      totalScore: Number(app.totalScore || 0),
      scoreCount: 1 // Simplified
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

    // This requires applicationScores table. 
    // Join: scoringCriteria -> applicationScores.
    const criteriaStats = await db
      .select({
        criteriaId: scoringCriteria.id,
        name: scoringCriteria.criteriaName, // Note: Schema calls it criteriaName, not name
        category: scoringCriteria.category,
        maxPoints: scoringCriteria.weight, // Schema calls it weight, not maxPoints
        averageScore: avg(applicationScores.score),
        totalScores: count(applicationScores.score)
      })
      .from(scoringCriteria)
      .leftJoin(applicationScores, eq(scoringCriteria.id, applicationScores.criteriaId))
      .groupBy(
        scoringCriteria.id,
        scoringCriteria.criteriaName,
        scoringCriteria.category,
        scoringCriteria.weight
      )
      // .orderBy(scoringCriteria.sortOrder); // Schema doesn't have sortOrder shown in snippet
      .orderBy(scoringCriteria.category);

    const criteriaAnalytics = criteriaStats.map(criteria => ({
      criteriaId: criteria.criteriaId,
      name: criteria.name,
      category: criteria.category,
      maxPoints: criteria.maxPoints,
      averageScore: Number(criteria.averageScore || 0),
      totalScores: criteria.totalScores,
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

    // We need to count how many eligibilityResults.reviewer1Id or reviewer2Id match this user.
    // This is hard to do in a single Drizzle query without complex SQL.
    // Alternative: custom SQL query.

    const performanceResult = await db.execute(sql`
        SELECT 
            up.user_id as "evaluatorId",
            up.first_name as "firstName",
            up.last_name as "lastName",
            up.email as "email",
            up.role as "role",
            (
                SELECT COUNT(*) 
                FROM ${eligibilityResults} er 
                WHERE er.reviewer1_id = up.user_id OR er.reviewer2_id = up.user_id
            ) as "totalEvaluations",
            (
                SELECT AVG(CASE WHEN er.reviewer1_id = up.user_id THEN CAST(er.reviewer1_score AS DECIMAL) ELSE CAST(er.reviewer2_score AS DECIMAL) END)
                FROM ${eligibilityResults} er 
                WHERE er.reviewer1_id = up.user_id OR er.reviewer2_id = up.user_id
            ) as "averageScore"
        FROM ${userProfiles} up
        WHERE up.role IN ('technical_reviewer', 'jury_member', 'dragons_den_judge')
        ORDER BY "totalEvaluations" DESC
    `);

    // Drizzle execute returns Rows. Map them.
    const evaluators = (performanceResult as unknown as any[]).map((row: any) => ({
      evaluatorId: row.evaluatorId,
      name: `${row.firstName} ${row.lastName}`,
      email: row.email,
      role: row.role,
      totalEvaluations: Number(row.totalEvaluations),
      averageScore: Number(row.averageScore || 0)
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
      evaluatorStats,
      trackDistribution,
      countyDistribution,
      demographics
    ] = await Promise.all([
      getBasicStats(),
      getStatusDistribution(),
      getCountryDistribution(),
      getGenderDistribution(),
      getSectorDistribution(),
      getEvaluatorStats(),
      getTrackDistribution(),
      getCountyDistribution(),
      getDemographicsBreakdown()
    ]);

    // Relaxed failure check - if some secondary stats fail, still return what we have? 
    // Sticking to strict for now but could be improved.
    if (!basicStats.success) {
      throw new Error("Failed to fetch basic stats");
    }

    return {
      success: true,
      data: {
        ...(basicStats.data || { totalApplications: 0, evaluatedApplications: 0, evaluationRate: 0, newThisWeek: 0, averageScore: 0 }),
        ...(evaluatorStats.data || { totalEvaluators: 0, activeEvaluators: 0 }),
        statusDistribution: statusDistribution.data || {},
        countryDistribution: countryDistribution.data || {},
        genderDistribution: genderDistribution.data || {},
        sectorDistribution: sectorDistribution.data || {},
        trackDistribution: trackDistribution.data || { foundation: 0, acceleration: 0 },
        countyDistribution: countyDistribution.data || {},
        demographics: demographics.data || { gender: {}, education: {}, ageGroups: {} }
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    // Return empty/zeroed structure rather than failing entire dashboard
    return {
      success: false,
      error: "Failed to fetch analytics dashboard data",
      // Should ideally return fallback data structure here for UI resilience
    };
  }
}

// Combined scoring analytics
export async function getScoringAnalytics() {
  try {
    const [criteriaStats, topApplications] = await Promise.all([
      getScoringCriteriaStats(),
      getTopApplications(10)
    ]);

    return {
      success: true,
      data: {
        criteriaAnalytics: criteriaStats.data || [],
        topApplications: topApplications.data || []
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

    if (!evaluatorDetails.success || !evaluatorDetails.data) {
      throw new Error("Failed to fetch evaluator performance details");
    }

    return {
      success: true,
      data: {
        evaluators: evaluatorDetails.data,
        summary: {
          totalEvaluators: evaluatorDetails.data.length,
          totalEvaluations: evaluatorDetails.data.reduce((sum, e) => sum + e.totalEvaluations, 0),
          averageScore: evaluatorDetails.data.length > 0
            ? Math.round(evaluatorDetails.data.reduce((sum, e) => sum + e.averageScore, 0) / evaluatorDetails.data.length)
            : 0
        }
      }
    };
  } catch (error) {
    console.error("Error fetching evaluator performance:", error);
    return { success: false, error: "Failed to fetch evaluator performance" };
  }
}

// =============================================================================
// SCORING PROGRESS STATS - For Analytics Stats Tab
// =============================================================================

export interface TrackScoringStats {
  total: number;
  scored: number;  // Has eligibility result with totalScore
  firstReview: number;  // Has reviewer1Score
  secondReview: number;  // Has reviewer2Score
}

export interface ScoringProgressStats {
  foundation: TrackScoringStats;
  acceleration: TrackScoringStats;
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export async function getScoringProgressStats(filters?: {
  dateFrom?: string;
  dateTo?: string;
  track?: "foundation" | "acceleration" | "all";
}): Promise<{ success: boolean; data?: ScoringProgressStats; error?: string }> {
  try {
    await verifyAdminAccess();

    const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters?.dateTo ? new Date(filters.dateTo) : null;
    const trackFilter = filters?.track || "all";

    // Build date condition
    const buildDateCondition = () => {
      if (dateFrom && dateTo) {
        return and(
          gte(applications.submittedAt, dateFrom),
          sql`${applications.submittedAt} <= ${dateTo}`
        );
      } else if (dateFrom) {
        return gte(applications.submittedAt, dateFrom);
      } else if (dateTo) {
        return sql`${applications.submittedAt} <= ${dateTo}`;
      }
      return undefined;
    };

    const dateCondition = buildDateCondition();

    // Foundation stats
    const getTrackStats = async (track: "foundation" | "acceleration"): Promise<TrackScoringStats> => {
      // Base track condition
      const trackCondition = eq(applications.track, track);
      const observationExclude = sql`${applications.isObservationOnly} = false`;

      // Total for this track
      const totalConditions = dateCondition
        ? and(trackCondition, observationExclude, dateCondition)
        : and(trackCondition, observationExclude);

      const totalResult = await db
        .select({ count: count() })
        .from(applications)
        .where(totalConditions);
      const total = totalResult[0]?.count || 0;

      // Scored (has eligibility result with totalScore)
      const scoredResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          dateCondition
            ? and(trackCondition, observationExclude, dateCondition, isNotNull(eligibilityResults.totalScore))
            : and(trackCondition, observationExclude, isNotNull(eligibilityResults.totalScore))
        );
      const scored = scoredResult[0]?.count || 0;

      // First review (has reviewer1Score)
      const firstReviewResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          dateCondition
            ? and(trackCondition, observationExclude, dateCondition, isNotNull(eligibilityResults.reviewer1Score))
            : and(trackCondition, observationExclude, isNotNull(eligibilityResults.reviewer1Score))
        );
      const firstReview = firstReviewResult[0]?.count || 0;

      // Second review (has reviewer2Score)
      const secondReviewResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          dateCondition
            ? and(trackCondition, observationExclude, dateCondition, isNotNull(eligibilityResults.reviewer2Score))
            : and(trackCondition, observationExclude, isNotNull(eligibilityResults.reviewer2Score))
        );
      const secondReview = secondReviewResult[0]?.count || 0;

      return { total, scored, firstReview, secondReview };
    };

    // Fetch stats based on track filter
    let foundationStats: TrackScoringStats = { total: 0, scored: 0, firstReview: 0, secondReview: 0 };
    let accelerationStats: TrackScoringStats = { total: 0, scored: 0, firstReview: 0, secondReview: 0 };

    if (trackFilter === "all" || trackFilter === "foundation") {
      foundationStats = await getTrackStats("foundation");
    }
    if (trackFilter === "all" || trackFilter === "acceleration") {
      accelerationStats = await getTrackStats("acceleration");
    }

    return {
      success: true,
      data: {
        foundation: foundationStats,
        acceleration: accelerationStats,
        dateRange: {
          from: filters?.dateFrom || null,
          to: filters?.dateTo || null
        }
      }
    };
  } catch (error) {
    console.error("Error fetching scoring progress stats:", error);
    return { success: false, error: "Failed to fetch scoring progress statistics" };
  }
}

// Export scoring report to DOCX
export async function exportScoringReport(filters?: {
  dateFrom?: string;
  dateTo?: string;
  track?: "foundation" | "acceleration" | "all";
}): Promise<{ success: boolean; data?: { base64: string; filename: string }; error?: string }> {
  try {
    await verifyAdminAccess();

    // Get stats
    const statsResult = await getScoringProgressStats(filters);
    if (!statsResult.success || !statsResult.data) {
      throw new Error("Failed to get scoring stats");
    }

    const stats = statsResult.data;
    const dateFrom = filters?.dateFrom || "All time";
    const dateTo = filters?.dateTo || "Present";
    const trackFilter = filters?.track || "all";

    // Create simple text report (since docx library may not be available)
    // In production, use docx library for proper formatting
    const reportContent = `
SCORING STATISTICS REPORT
=========================
Generated: ${new Date().toISOString().split('T')[0]}

DATE RANGE
----------
From: ${dateFrom}
To: ${dateTo}
Track Filter: ${trackFilter.charAt(0).toUpperCase() + trackFilter.slice(1)}

FOUNDATION TRACK
----------------
Total Applications: ${stats.foundation.total}
Scored: ${stats.foundation.scored} (${stats.foundation.total > 0 ? Math.round((stats.foundation.scored / stats.foundation.total) * 100) : 0}%)
1st Review Completed: ${stats.foundation.firstReview} (${stats.foundation.scored > 0 ? Math.round((stats.foundation.firstReview / stats.foundation.scored) * 100) : 0}% of scored)
2nd Review Completed: ${stats.foundation.secondReview} (${stats.foundation.scored > 0 ? Math.round((stats.foundation.secondReview / stats.foundation.scored) * 100) : 0}% of scored)

ACCELERATION TRACK
------------------
Total Applications: ${stats.acceleration.total}
Scored: ${stats.acceleration.scored} (${stats.acceleration.total > 0 ? Math.round((stats.acceleration.scored / stats.acceleration.total) * 100) : 0}%)
1st Review Completed: ${stats.acceleration.firstReview} (${stats.acceleration.scored > 0 ? Math.round((stats.acceleration.firstReview / stats.acceleration.scored) * 100) : 0}% of scored)
2nd Review Completed: ${stats.acceleration.secondReview} (${stats.acceleration.scored > 0 ? Math.round((stats.acceleration.secondReview / stats.acceleration.scored) * 100) : 0}% of scored)

SUMMARY
-------
Total Applications: ${stats.foundation.total + stats.acceleration.total}
Total Scored: ${stats.foundation.scored + stats.acceleration.scored}
Total 1st Reviews: ${stats.foundation.firstReview + stats.acceleration.firstReview}
Total 2nd Reviews: ${stats.foundation.secondReview + stats.acceleration.secondReview}
`;

    // Convert to base64
    const base64 = Buffer.from(reportContent).toString('base64');
    const filename = `scoring_report_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      success: true,
      data: { base64, filename }
    };
  } catch (error) {
    console.error("Error exporting scoring report:", error);
    return { success: false, error: "Failed to export scoring report" };
  }
}
