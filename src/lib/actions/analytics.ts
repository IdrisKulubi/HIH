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
import { eq, desc, sql, count, avg, sum, gte, isNotNull, or, and, ne, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } from "docx";

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

    // Handle both array and { rows: [] } response formats from Neon
    const ageRows = Array.isArray(ageResults) ? ageResults : (ageResults as any).rows || [];
    ageRows.forEach((result: any) => {
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

    // Total evaluators (using actual roles from user_role enum)
    const totalEvaluatorsResult = await db
      .select({ count: count() })
      .from(userProfiles)
      .where(sql`${userProfiles.role} IN ('technical_reviewer', 'reviewer_1', 'reviewer_2')`);
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
        up.role IN ('technical_reviewer', 'reviewer_1', 'reviewer_2')
        AND (
          (er.reviewer1_id = up.user_id AND er.reviewer1_at >= ${oneWeekAgo})
          OR 
          (er.reviewer2_id = up.user_id AND er.reviewer2_at >= ${oneWeekAgo})
        )
    `);

    // Handle both array and { rows: [] } response formats from Neon
    const activeRows = Array.isArray(activeEvaluatorsResult) ? activeEvaluatorsResult : (activeEvaluatorsResult as any).rows || [];
    const activeEvaluators = Number(activeRows[0]?.count || 0);

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
        WHERE up.role IN ('technical_reviewer', 'reviewer_1', 'reviewer_2')
        ORDER BY "totalEvaluations" DESC
    `);

    // Handle both array and { rows: [] } response formats from Neon
    const performanceRows = Array.isArray(performanceResult) ? performanceResult : (performanceResult as any).rows || [];
    const evaluators = performanceRows.map((row: any) => ({
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
          totalEvaluations: evaluatorDetails.data.reduce((sum: number, e: { totalEvaluations: number }) => sum + e.totalEvaluations, 0),
          averageScore: evaluatorDetails.data.length > 0
            ? Math.round(evaluatorDetails.data.reduce((sum: number, e: { averageScore: number }) => sum + e.averageScore, 0) / evaluatorDetails.data.length)
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
  passed: number; // status is 'finalist' or 'approved'
  rejected: number; // status is 'rejected'
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
      const total = Number(totalResult[0]?.count || 0);

      // Scored (has at least one manual review or is finalized)
      const scoredResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          and(
            trackCondition,
            observationExclude,
            dateCondition || sql`TRUE`,
            or(
              isNotNull(eligibilityResults.reviewer1Score),
              isNotNull(eligibilityResults.reviewer2Score),
              isNotNull(eligibilityResults.evaluatedAt),
              ne(applications.status, 'submitted'),
              ne(applications.status, 'scoring_phase')
            )
          )
        );
      const scored = Number(scoredResult[0]?.count || 0);

      // First review (has reviewer1Score or was reviewed by admin)
      const firstReviewResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          and(
            trackCondition,
            observationExclude,
            dateCondition || sql`TRUE`,
            or(
              isNotNull(eligibilityResults.reviewer1Score),
              isNotNull(eligibilityResults.evaluatedBy),
              inArray(applications.status, ['approved', 'rejected', 'finalist', 'pending_senior_review'])
            )
          )
        );
      const firstReview = Number(firstReviewResult[0]?.count || 0);

      // Second review (has reviewer2Score or was finalized by admin)
      const secondReviewResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          and(
            trackCondition,
            observationExclude,
            dateCondition || sql`TRUE`,
            or(
              isNotNull(eligibilityResults.reviewer2Score),
              inArray(applications.status, ['approved', 'rejected', 'finalist'])
            )
          )
        );
      const secondReview = Number(secondReviewResult[0]?.count || 0);

      // Passed (status 'finalist' or 'approved', or 'under_review' with high score)
      const passedResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          and(
            trackCondition,
            observationExclude,
            dateCondition || sql`TRUE`,
            or(
              inArray(applications.status, ['finalist', 'approved']),
              and(eq(applications.status, 'under_review'), gte(eligibilityResults.totalScore, "60"))
            )
          )
        );
      const passed = Number(passedResult[0]?.count || 0);

      // Rejected (status 'rejected', or 'under_review' with low score)
      const rejectedResult = await db
        .select({ count: count() })
        .from(applications)
        .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
        .where(
          and(
            trackCondition,
            observationExclude,
            dateCondition || sql`TRUE`,
            or(
              eq(applications.status, 'rejected'),
              and(eq(applications.status, 'under_review'), sql`${eligibilityResults.totalScore} < 40`, isNotNull(eligibilityResults.evaluatedBy))
            )
          )
        );
      const rejected = Number(rejectedResult[0]?.count || 0);

      return { total, scored, firstReview, secondReview, passed, rejected };
    };

    // Fetch stats based on track filter
    let foundationStats: TrackScoringStats = { total: 0, scored: 0, firstReview: 0, secondReview: 0, passed: 0, rejected: 0 };
    let accelerationStats: TrackScoringStats = { total: 0, scored: 0, firstReview: 0, secondReview: 0, passed: 0, rejected: 0 };

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

    // Create DOCX document
    const createTableCell = (text: string, options: { bold?: boolean; color?: string; bg?: string; align?: any; width?: number; colSpan?: number } = {}) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text,
                bold: options.bold,
                color: options.color || "000000",
                size: 24 // Increased font size for readability
              })
            ],
            alignment: options.align || AlignmentType.LEFT,
            spacing: { before: 120, after: 120 } // Increased spacing
          })
        ],
        width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
        columnSpan: options.colSpan,
        shading: options.bg ? { fill: options.bg, type: ShadingType.CLEAR } : undefined,
        verticalAlign: AlignmentType.CENTER,
        margins: { top: 144, bottom: 144, left: 144, right: 144 }, // ~0.1 inch margin
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        }
      });
    };

    const createHeaderCell = (text: string) => createTableCell(text, { bold: true, color: "FFFFFF", bg: "1D4ED8", align: AlignmentType.CENTER });

    const createTableRow = (label: string, value: string | number, percent?: string) => {
      return new TableRow({
        children: [
          createTableCell(label, { bold: true, width: 5000 }), // ~3.5 inches
          createTableCell(String(value), { align: AlignmentType.CENTER, width: 2000 }), // ~1.4 inches
          createTableCell(percent || "-", { align: AlignmentType.CENTER, width: 2000 }) // ~1.4 inches
        ]
      });
    };

    const createTrackTable = (trackName: string, trackStats: TrackScoringStats) => {
      const scoredPercent = trackStats.total > 0 ? `${Math.round((trackStats.scored / trackStats.total) * 100)}%` : "0%";
      const firstReviewPercent = trackStats.scored > 0 ? `${Math.round((trackStats.firstReview / trackStats.scored) * 100)}%` : "0%";
      const secondReviewPercent = trackStats.scored > 0 ? `${Math.round((trackStats.secondReview / trackStats.scored) * 100)}%` : "0%";
      const passedPercent = trackStats.secondReview > 0 ? `${Math.round((trackStats.passed / trackStats.secondReview) * 100)}%` : "0%";
      const rejectedPercent = trackStats.secondReview > 0 ? `${Math.round((trackStats.rejected / trackStats.secondReview) * 100)}%` : "0%";

      return [
        new Paragraph({
          children: [new TextRun({ text: trackName, bold: true, size: 28, color: "1D4ED8" })],
          spacing: { before: 400, after: 200 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell("Metric", { bold: true, color: "FFFFFF", bg: "1D4ED8", align: AlignmentType.CENTER, width: 5000 }),
                createTableCell("Count", { bold: true, color: "FFFFFF", bg: "1D4ED8", align: AlignmentType.CENTER, width: 2000 }),
                createTableCell("Percentage", { bold: true, color: "FFFFFF", bg: "1D4ED8", align: AlignmentType.CENTER, width: 2000 })
              ]
            }),
            createTableRow("Total Applications", trackStats.total, "100%"),
            createTableRow("Scored Applications", trackStats.scored, scoredPercent),
            createTableRow("1st Review Completed", trackStats.firstReview, firstReviewPercent),
            createTableRow("2nd Review Completed", trackStats.secondReview, secondReviewPercent),
            createTableRow("Passed (Approved/Finalist)", trackStats.passed, passedPercent),
            createTableRow("Rejected", trackStats.rejected, rejectedPercent)
          ]
        })
      ];
    };

    const sections = [];

    // Header
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "BIRE 2026 Programme", bold: true, size: 48, color: "1D4ED8" })],
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.TITLE
      }),
      new Paragraph({
        children: [new TextRun({ text: "Scoring Statistics Report", bold: true, size: 32, color: "6B7280" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Filter Info - Stacked vertically for better space usage
    sections.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA }, // Fixed overall width
        rows: [
          new TableRow({
            children: [
              createTableCell("Report Configuration", { bold: true, bg: "F3F4F6", colSpan: 2, align: AlignmentType.CENTER, width: 9000 })
            ]
          }),
          new TableRow({
            children: [
              createTableCell("Date Range:", { bold: true, width: 3000 }),
              createTableCell(`${dateFrom} - ${dateTo}`, { width: 6000 })
            ]
          }),
          new TableRow({
            children: [
              createTableCell("Track:", { bold: true, width: 3000 }),
              createTableCell(trackFilter.charAt(0).toUpperCase() + trackFilter.slice(1), { width: 6000 })
            ]
          }),
          new TableRow({
            children: [
              createTableCell("Generated On:", { bold: true, width: 3000 }),
              createTableCell(new Date().toLocaleDateString(), { width: 6000 })
            ]
          })
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: "9CA3AF" },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: "9CA3AF" },
          left: { style: BorderStyle.SINGLE, size: 2, color: "9CA3AF" },
          right: { style: BorderStyle.SINGLE, size: 2, color: "9CA3AF" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        }
      })
    );

    // Track Sections
    if (trackFilter === "all" || trackFilter === "foundation") {
      sections.push(...createTrackTable("Foundation Track", stats.foundation));
    }
    if (trackFilter === "all" || trackFilter === "acceleration") {
      sections.push(...createTrackTable("Acceleration Track", stats.acceleration));
    }

    // Overall Summary
    const totalStats = {
      total: stats.foundation.total + stats.acceleration.total,
      scored: stats.foundation.scored + stats.acceleration.scored,
      firstReview: stats.foundation.firstReview + stats.acceleration.firstReview,
      secondReview: stats.foundation.secondReview + stats.acceleration.secondReview,
      passed: stats.foundation.passed + stats.acceleration.passed,
      rejected: stats.foundation.rejected + stats.acceleration.rejected,
    };

    sections.push(...createTrackTable("Overall Summary", totalStats));

    // Footer
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "— End of Report —", size: 18, italics: true, color: "9CA3AF" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 }
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const base64 = (buffer as Buffer).toString('base64');
    const filename = `scoring_report_${new Date().toISOString().split('T')[0]}.docx`;

    return {
      success: true,
      data: { base64, filename }
    };
  } catch (error) {
    console.error("Error exporting scoring report:", error);
    return { success: false, error: "Failed to export scoring report" };
  }
}

// =============================================================================
// DD QUALIFICATION STATS
// =============================================================================

export interface DDQualifiedStats {
  foundation: number;
  acceleration: number;
  total: number;
}

/**
 * Get counts of applications that qualify for Due Diligence (≥60% score)
 * broken down by Foundation and Acceleration tracks.
 */
export async function getDDQualifiedStats(): Promise<{
  success: boolean;
  data?: DDQualifiedStats;
  error?: string;
}> {
  try {
    // Fetch all eligibility results joined with applications to get track info
    const allResults = await db
      .select({
        track: applications.track,
        totalScore: eligibilityResults.totalScore,
        reviewer1Score: eligibilityResults.reviewer1Score,
        reviewer2Score: eligibilityResults.reviewer2Score,
        qualifiesForDueDiligence: eligibilityResults.qualifiesForDueDiligence,
      })
      .from(eligibilityResults)
      .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id));

    let foundationCount = 0;
    let accelerationCount = 0;

    for (const row of allResults) {
      const r1 = row.reviewer1Score ? parseFloat(row.reviewer1Score) : 0;
      const r2 = row.reviewer2Score ? parseFloat(row.reviewer2Score) : 0;

      // Only count if BOTH reviewers have scored (review completed)
      if (r1 > 0 && r2 > 0) {
        const avgScore = (r1 + r2) / 2;

        // Qualifies if average is >= 60%
        if (avgScore >= 60) {
          if (row.track === "foundation") {
            foundationCount++;
          } else if (row.track === "acceleration") {
            accelerationCount++;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        foundation: foundationCount,
        acceleration: accelerationCount,
        total: foundationCount + accelerationCount,
      },
    };
  } catch (error) {
    console.error("Error fetching DD qualified stats:", error);
    return { success: false, error: "Failed to fetch DD qualified statistics" };
  }
}
