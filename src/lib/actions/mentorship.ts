"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  businesses,
  mentors,
  mentorshipMatches,
  mentorshipSessions,
  users,
} from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

const sectorValues = [
  "agriculture_and_agribusiness",
  "manufacturing",
  "renewable_energy",
  "water_management",
  "waste_management",
  "forestry",
  "tourism",
  "transport",
  "construction",
  "ict",
  "trade",
  "healthcare",
  "education",
  "other",
] as const;

const createMentorSchema = z.object({
  userEmail: z.string().email(),
  expertiseArea: z.enum(sectorValues),
});

export async function createMentor(
  input: z.infer<typeof createMentorSchema>
): Promise<ActionResponse<{ id: number }>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = createMentorSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid mentor details.");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.userEmail.trim().toLowerCase()),
    });
    if (!user) return errorResponse("No user found with that email.");

    const existing = await db.query.mentors.findFirst({
      where: eq(mentors.userId, user.id),
    });
    if (existing) return errorResponse("That user is already registered as a mentor.");

    const [row] = await db
      .insert(mentors)
      .values({
        userId: user.id,
        expertiseArea: parsed.data.expertiseArea,
      })
      .returning({ id: mentors.id });

    revalidatePath("/admin/mentorship");
    return successResponse({ id: row.id });
  } catch (e) {
    console.error("createMentor", e);
    return errorResponse("Failed to create mentor");
  }
}

export async function createMentorshipMatch(
  businessId: number,
  mentorId: number,
  startDate?: Date
): Promise<ActionResponse<{ matchId: number }>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
    });
    if (!business) return errorResponse("Business not found");

    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.id, mentorId),
    });
    if (!mentor) return errorResponse("Mentor not found");

    const base = startDate ?? new Date();

    const matchId = await db.transaction(async (tx) => {
      const [match] = await tx
        .insert(mentorshipMatches)
        .values({
          businessId,
          mentorId,
        })
        .returning({ id: mentorshipMatches.id });

      if (!match) throw new Error("Insert match failed");

      const sessionRows = [1, 2, 3, 4, 5, 6].map((n) => {
        const scheduled = new Date(base);
        scheduled.setDate(scheduled.getDate() + (n - 1) * 7);
        return {
          matchId: match.id,
          sessionNumber: n,
          sessionType: n === 1 || n === 6 ? ("physical" as const) : ("virtual" as const),
          status: "scheduled" as const,
          scheduledDate: scheduled,
        };
      });

      await tx.insert(mentorshipSessions).values(sessionRows);
      return match.id;
    });

    revalidatePath("/admin/mentorship");
    revalidatePath(`/admin/mentorship/matches/${businessId}`);
    return successResponse({ matchId });
  } catch (e) {
    console.error("createMentorshipMatch", e);
    return errorResponse("Failed to create mentorship match");
  }
}

export async function completeMentorshipSession(input: {
  sessionId: number;
  diagnosticNotes?: string;
  photographicEvidenceUrl?: string;
}): Promise<ActionResponse<void>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const row = await db.query.mentorshipSessions.findFirst({
      where: eq(mentorshipSessions.id, input.sessionId),
    });
    if (!row) return errorResponse("Session not found");
    if (row.status === "completed") {
      return errorResponse("Session is already completed.");
    }

    if (row.sessionNumber > 1) {
      const prev = await db.query.mentorshipSessions.findFirst({
        where: and(
          eq(mentorshipSessions.matchId, row.matchId),
          eq(mentorshipSessions.sessionNumber, row.sessionNumber - 1)
        ),
      });
      if (!prev || prev.status !== "completed") {
        return errorResponse(
          `Session ${row.sessionNumber - 1} must be completed before session ${row.sessionNumber}.`
        );
      }
    }

    const notes = (input.diagnosticNotes ?? "").trim();
    const photo = (input.photographicEvidenceUrl ?? "").trim();

    if (row.sessionType === "physical") {
      if (!notes.length || !photo.length) {
        return errorResponse(
          "Physical sessions require diagnostic notes and a photographic evidence URL before completion."
        );
      }
    }

    await db
      .update(mentorshipSessions)
      .set({
        status: "completed",
        completedDate: new Date(),
        diagnosticNotes: notes.length ? notes : null,
        photographicEvidenceUrl: photo.length ? photo : null,
        updatedAt: new Date(),
      })
      .where(eq(mentorshipSessions.id, input.sessionId));

    const match = await db.query.mentorshipMatches.findFirst({
      where: eq(mentorshipMatches.id, row.matchId),
    });
    if (match) {
      revalidatePath(`/admin/mentorship/matches/${match.businessId}`);
    }
    revalidatePath("/admin/mentorship");
    return successResponse(undefined);
  } catch (e) {
    console.error("completeMentorshipSession", e);
    return errorResponse("Failed to complete session");
  }
}

export async function completeMentorshipSessionFromForm(
  _prev: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isFinite(sessionId)) {
    return errorResponse("Invalid session");
  }
  return completeMentorshipSession({
    sessionId,
    diagnosticNotes: String(formData.get("diagnosticNotes") ?? ""),
    photographicEvidenceUrl: String(formData.get("photographicEvidenceUrl") ?? ""),
  });
}

export type MentorListRow = {
  id: number;
  userEmail: string;
  userName: string | null;
  expertiseArea: string;
  isActive: boolean;
};

export async function listMentorsForAdmin(): Promise<ActionResponse<MentorListRow[]>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.mentors.findMany({
      orderBy: (m, { asc }) => [asc(m.id)],
      with: { user: true },
    });

    const data: MentorListRow[] = rows.map((m) => ({
      id: m.id,
      userEmail: m.user.email,
      userName: m.user.name,
      expertiseArea: m.expertiseArea,
      isActive: m.isActive ?? true,
    }));

    return successResponse(data);
  } catch (e) {
    console.error("listMentorsForAdmin", e);
    return errorResponse("Failed to load mentors");
  }
}

export type MentorshipMatchWithSessions = Awaited<
  ReturnType<typeof loadMentorshipMatchesForBusiness>
>;

async function loadMentorshipMatchesForBusiness(businessId: number) {
  const matches = await db.query.mentorshipMatches.findMany({
    where: eq(mentorshipMatches.businessId, businessId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
    with: {
      mentor: { with: { user: true } },
      sessions: {
        orderBy: (s, { asc }) => [asc(s.sessionNumber)],
      },
    },
  });
  return matches;
}

export async function listMentorshipMatchesForBusiness(
  businessId: number
): Promise<ActionResponse<MentorshipMatchWithSessions>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const data = await loadMentorshipMatchesForBusiness(businessId);
    return successResponse(data);
  } catch (e) {
    console.error("listMentorshipMatchesForBusiness", e);
    return errorResponse("Failed to load matches");
  }
}

export async function createMentorFromForm(
  _prev: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  const parsed = createMentorSchema.safeParse({
    userEmail: String(formData.get("userEmail") ?? ""),
    expertiseArea: String(formData.get("expertiseArea") ?? ""),
  });
  if (!parsed.success) {
    return errorResponse("Enter a valid email and expertise area.");
  }
  return createMentor(parsed.data);
}
