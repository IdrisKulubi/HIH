"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fDocumentResolutionIssues,
  a2fMatchingGrantApplications,
  a2fPipeline,
  userProfiles,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorResponse, successResponse } from "./types";

const ASSIGNEE_ROLES = ["bds_edo", "redo"] as const;
const REVIEWER_ROLES = ["admin", "a2f_officer"] as const;
const issueStatusSchema = z.enum(["open", "in_progress", "resolved"]);

const createIssueSchema = z.object({
  a2fId: z.number().int().positive(),
  documentName: z.string().trim().min(1).max(300),
  documentUrl: z.string().trim().max(2000).optional(),
  documentFileName: z.string().trim().max(500).optional(),
  issueDetails: z.string().trim().min(10, "Describe what the applicant needs to fix.").max(4000),
  assignedToId: z.string().trim().min(1),
});

export type A2fDocumentIssueStatus = z.infer<typeof issueStatusSchema>;

function displayName(profile: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim()
    || profile.email
    || "Programme staff"
  );
}

export async function listDocumentResolutionAssignees() {
  const session = await auth();
  if (!session?.user || !REVIEWER_ROLES.includes(session.user.role as (typeof REVIEWER_ROLES)[number])) {
    return errorResponse("Unauthorized");
  }

  const profiles = await db
    .select({
      id: userProfiles.userId,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      email: userProfiles.email,
      role: userProfiles.role,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.role, [...ASSIGNEE_ROLES]))
    .orderBy(userProfiles.firstName, userProfiles.lastName);

  return successResponse(
    profiles.map((profile) => ({
      id: profile.id,
      name: displayName(profile),
      email: profile.email,
      role: profile.role,
    }))
  );
}

export async function createDocumentResolutionIssue(input: {
  a2fId: number;
  documentName: string;
  documentUrl?: string;
  documentFileName?: string;
  issueDetails: string;
  assignedToId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user || !REVIEWER_ROLES.includes(session.user.role as (typeof REVIEWER_ROLES)[number])) {
      return errorResponse("Only an Access to Finance officer or administrator can raise document issues.");
    }

    const parsed = createIssueSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Check the issue details.");
    }

    const [pipeline, assignee, matchingGrantApplication] = await Promise.all([
      db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.id, parsed.data.a2fId),
        columns: { id: true },
      }),
      db.query.userProfiles.findFirst({
        where: and(
          eq(userProfiles.userId, parsed.data.assignedToId),
          inArray(userProfiles.role, [...ASSIGNEE_ROLES])
        ),
        columns: { userId: true },
      }),
      db.query.a2fMatchingGrantApplications.findFirst({
        where: eq(a2fMatchingGrantApplications.a2fId, parsed.data.a2fId),
        columns: { id: true },
      }),
    ]);

    if (!pipeline) return errorResponse("A2F pipeline entry not found.");
    if (!assignee) return errorResponse("Select a valid EDOR or REDOR assignee.");

    const [issue] = await db
      .insert(a2fDocumentResolutionIssues)
      .values({
        a2fId: parsed.data.a2fId,
        matchingGrantApplicationId: matchingGrantApplication?.id ?? null,
        documentName: parsed.data.documentName,
        documentUrl: parsed.data.documentUrl || null,
        documentFileName: parsed.data.documentFileName || null,
        issueDetails: parsed.data.issueDetails,
        assignedToId: parsed.data.assignedToId,
        raisedById: session.user.id,
      })
      .returning({ id: a2fDocumentResolutionIssues.id });

    revalidatePath(`/a2f/${parsed.data.a2fId}/matching-grant`);
    revalidatePath("/application-resolutions");
    return successResponse(issue, "Issue sent to the selected EDOR/REDOR.");
  } catch (error) {
    console.error("Error creating document resolution issue:", error);
    return errorResponse("Failed to raise the document issue.");
  }
}

export async function listApplicationDocumentIssues(a2fId: number) {
  const session = await auth();
  if (!session?.user || !REVIEWER_ROLES.includes(session.user.role as (typeof REVIEWER_ROLES)[number])) {
    return errorResponse("Unauthorized");
  }

  const rows = await db
    .select({
      id: a2fDocumentResolutionIssues.id,
      documentName: a2fDocumentResolutionIssues.documentName,
      issueDetails: a2fDocumentResolutionIssues.issueDetails,
      status: a2fDocumentResolutionIssues.status,
      resolutionNotes: a2fDocumentResolutionIssues.resolutionNotes,
      createdAt: a2fDocumentResolutionIssues.createdAt,
      assignedToId: a2fDocumentResolutionIssues.assignedToId,
      assigneeName: sql<string>`TRIM(CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName}))`,
      assigneeRole: userProfiles.role,
    })
    .from(a2fDocumentResolutionIssues)
    .innerJoin(userProfiles, eq(userProfiles.userId, a2fDocumentResolutionIssues.assignedToId))
    .where(eq(a2fDocumentResolutionIssues.a2fId, a2fId))
    .orderBy(desc(a2fDocumentResolutionIssues.createdAt));

  return successResponse(rows);
}

export async function listMyDocumentResolutionIssues() {
  const session = await auth();
  if (!session?.user || !["admin", ...ASSIGNEE_ROLES].includes(session.user.role ?? "")) {
    return errorResponse("Unauthorized");
  }

  const where = session.user.role === "admin"
    ? undefined
    : eq(a2fDocumentResolutionIssues.assignedToId, session.user.id);

  const rows = await db.query.a2fDocumentResolutionIssues.findMany({
    where,
    orderBy: [desc(a2fDocumentResolutionIssues.createdAt)],
    with: {
      a2fPipeline: {
        with: {
          application: {
            with: { business: true },
          },
        },
      },
      raisedBy: { with: { userProfile: true } },
      assignedTo: { with: { userProfile: true } },
    },
  });

  return successResponse(
    rows.map((row) => ({
      id: row.id,
      a2fId: row.a2fId,
      businessName: row.a2fPipeline.application?.business?.name ?? "Enterprise",
      documentName: row.documentName,
      documentUrl: row.documentUrl,
      documentFileName: row.documentFileName,
      issueDetails: row.issueDetails,
      status: row.status as A2fDocumentIssueStatus,
      resolutionNotes: row.resolutionNotes,
      createdAt: row.createdAt,
      raisedByName: row.raisedBy?.userProfile
        ? displayName(row.raisedBy.userProfile)
        : row.raisedBy?.name ?? "A2F officer",
      assignedToName: row.assignedTo?.userProfile
        ? displayName(row.assignedTo.userProfile)
        : row.assignedTo?.name ?? "Programme staff",
    }))
  );
}

export async function updateDocumentResolutionIssue(input: {
  issueId: number;
  status: A2fDocumentIssueStatus;
  resolutionNotes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", ...ASSIGNEE_ROLES].includes(session.user.role ?? "")) {
      return errorResponse("Unauthorized");
    }

    const status = issueStatusSchema.safeParse(input.status);
    if (!status.success) return errorResponse("Select a valid status.");

    const issue = await db.query.a2fDocumentResolutionIssues.findFirst({
      where: eq(a2fDocumentResolutionIssues.id, input.issueId),
    });
    if (!issue) return errorResponse("Issue not found.");
    if (session.user.role !== "admin" && issue.assignedToId !== session.user.id) {
      return errorResponse("This issue is assigned to another user.");
    }

    const notes = input.resolutionNotes?.trim() ?? "";
    if (status.data === "resolved" && notes.length < 5) {
      return errorResponse("Add a short resolution note before marking this resolved.");
    }

    await db
      .update(a2fDocumentResolutionIssues)
      .set({
        status: status.data,
        resolutionNotes: notes || null,
        resolvedAt: status.data === "resolved" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(a2fDocumentResolutionIssues.id, issue.id));

    revalidatePath("/application-resolutions");
    revalidatePath(`/a2f/${issue.a2fId}/matching-grant`);
    return successResponse({ id: issue.id }, "Resolution updated.");
  } catch (error) {
    console.error("Error updating document resolution issue:", error);
    return errorResponse("Failed to update the resolution.");
  }
}
