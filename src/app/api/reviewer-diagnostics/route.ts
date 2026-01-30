import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import {
  users,
  userProfiles,
  applications,
  eligibilityResults,
  businesses,
} from "../../../../db/schema";
import { eq, and, isNotNull, isNull, or, count } from "drizzle-orm";

interface ReviewerDiagnostic {
  id: string;
  name: string;
  role: string;
  email: string;
  r1: {
    assigned: number;
    completed: number;
    pending: number;
  };
  r2: {
    assigned: number;
    completed: number;
    pending: number;
  };
}

interface PendingApplicationSnippet {
  id: number;
  businessName: string;
  assignedR1Id: string | null;
  assignedR1Name: string | null;
  r1Score: string | null;
  assignedR2Id: string | null;
  assignedR2Name: string | null;
  r2Score: string | null;
  status: string;
}

interface DuplicateUserInfo {
  userId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

interface DuplicateGroup {
  key: string;
  duplicateType: "email" | "name";
  users: DuplicateUserInfo[];
}

// Public API - no auth required
export async function GET() {
  try {
    // Get only reviewers (reviewer_1 and reviewer_2 roles)
    const reviewers = await db.query.userProfiles.findMany({
      where: or(
        eq(userProfiles.role, "reviewer_1"),
        eq(userProfiles.role, "reviewer_2")
      ),
    });

    const reviewerStats: ReviewerDiagnostic[] = [];

    for (const r of reviewers) {
      // Reviewer 1 stats
      const r1AssignmentsResult = await db
        .select({ count: count() })
        .from(eligibilityResults)
        .where(eq(eligibilityResults.assignedReviewer1Id, r.userId));

      const r1CompletedResult = await db
        .select({ count: count() })
        .from(eligibilityResults)
        .where(
          and(
            eq(eligibilityResults.assignedReviewer1Id, r.userId),
            isNotNull(eligibilityResults.reviewer1Score)
          )
        );

      // Reviewer 2 stats
      const r2AssignmentsResult = await db
        .select({ count: count() })
        .from(eligibilityResults)
        .where(eq(eligibilityResults.assignedReviewer2Id, r.userId));

      const r2CompletedResult = await db
        .select({ count: count() })
        .from(eligibilityResults)
        .where(
          and(
            eq(eligibilityResults.assignedReviewer2Id, r.userId),
            isNotNull(eligibilityResults.reviewer2Score)
          )
        );

      reviewerStats.push({
        id: r.userId,
        name: `${r.firstName} ${r.lastName}`,
        role: r.role,
        email: r.email,
        r1: {
          assigned: Number(r1AssignmentsResult[0].count),
          completed: Number(r1CompletedResult[0].count),
          pending:
            Number(r1AssignmentsResult[0].count) -
            Number(r1CompletedResult[0].count),
        },
        r2: {
          assigned: Number(r2AssignmentsResult[0].count),
          completed: Number(r2CompletedResult[0].count),
          pending:
            Number(r2AssignmentsResult[0].count) -
            Number(r2CompletedResult[0].count),
        },
      });
    }

    // Get pending applications with reviewer names
    const pendingAppsRaw = await db
      .select({
        id: applications.id,
        businessName: businesses.name,
        assignedR1Id: eligibilityResults.assignedReviewer1Id,
        r1Score: eligibilityResults.reviewer1Score,
        assignedR2Id: eligibilityResults.assignedReviewer2Id,
        r2Score: eligibilityResults.reviewer2Score,
        status: applications.status,
      })
      .from(applications)
      .innerJoin(
        eligibilityResults,
        eq(applications.id, eligibilityResults.applicationId)
      )
      .innerJoin(businesses, eq(applications.businessId, businesses.id))
      .where(
        or(
          and(
            isNotNull(eligibilityResults.assignedReviewer1Id),
            isNull(eligibilityResults.reviewer1Score)
          ),
          and(
            isNotNull(eligibilityResults.assignedReviewer2Id),
            isNull(eligibilityResults.reviewer2Score)
          )
        )
      );

    // Create a map of reviewer names
    const reviewerMap = new Map<string, string>();
    for (const r of reviewers) {
      reviewerMap.set(r.userId, `${r.firstName} ${r.lastName}`);
    }

    // Add reviewer names to pending apps
    const pendingApps: PendingApplicationSnippet[] = pendingAppsRaw.map(
      (app) => ({
        ...app,
        assignedR1Name: app.assignedR1Id
          ? reviewerMap.get(app.assignedR1Id) || "Unknown"
          : null,
        assignedR2Name: app.assignedR2Id
          ? reviewerMap.get(app.assignedR2Id) || "Unknown"
          : null,
      })
    );

    // Find duplicate reviewers by name
    const nameMap = new Map<string, DuplicateUserInfo[]>();
    for (const r of reviewers) {
      const normalizedName = `${r.firstName} ${r.lastName}`
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
      if (normalizedName.length < 3) continue;
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, []);
      }

      // Get user creation date
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, r.userId),
      });

      nameMap.get(normalizedName)!.push({
        userId: r.userId,
        email: r.email,
        name: `${r.firstName} ${r.lastName}`,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role,
        createdAt: userRecord?.createdAt?.toISOString() || "Unknown",
      });
    }

    // Collect duplicates
    const duplicates: DuplicateGroup[] = [];
    for (const [name, usersInGroup] of nameMap.entries()) {
      if (usersInGroup.length > 1) {
        duplicates.push({
          key: name,
          duplicateType: "name",
          users: usersInGroup.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        });
      }
    }

    // Get admins for reference
    const admins = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(userProfiles.role, "admin"));

    // Calculate totals directly from pending applications
    const totalPending = pendingApps.length;
    
    // Count R1 pending: applications where R1 is assigned but no R1 score
    const totalR1Pending = pendingApps.filter(
      (app) => app.assignedR1Id && !app.r1Score
    ).length;
    
    // Count R2 pending: applications where R2 is assigned but no R2 score
    const totalR2Pending = pendingApps.filter(
      (app) => app.assignedR2Id && !app.r2Score
    ).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        reviewers: reviewerStats,
        pendingApplications: pendingApps,
        duplicates,
        admins: admins.map((a) => ({
          userId: a.userId,
          email: a.email,
          name: `${a.firstName} ${a.lastName}`,
          createdAt: a.createdAt.toISOString(),
        })),
        summary: {
          totalReviewers: reviewerStats.length,
          totalPendingApplications: totalPending,
          totalR1Pending,
          totalR2Pending,
          duplicateGroups: duplicates.length,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching reviewer diagnostics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
