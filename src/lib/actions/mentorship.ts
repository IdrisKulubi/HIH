"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  businesses,
  mentors,
  mentorshipMatches,
  mentorshipSessions,
  userProfiles,
  users,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";
import { formatMentorshipDurationMinutes } from "@/lib/mentorship/session-display";
import {
  mentorshipEvidenceFilesFromLegacyUrl,
  parseMentorshipEvidenceFilesInput,
  primaryMentorshipEvidenceUrl,
  type MentorshipEvidenceFile,
} from "@/lib/mentorship/evidence";
import { computeMentorshipAnalytics, type MentorshipAnalytics } from "@/lib/mentorship/analytics";
import { loadMentorshipExportData } from "@/lib/mentorship/export";
import { sendMentorshipAssignmentEmail } from "@/lib/email";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function isMentorshipSessionApprover(role?: string | null) {
  return role === "redo";
}

function isMentorRole(role?: string | null) {
  return role === "mentor";
}

async function mentorOwnsSession(userId: string, sessionId: number): Promise<boolean> {
  const row = await db.query.mentorshipSessions.findFirst({
    where: eq(mentorshipSessions.id, sessionId),
    with: {
      match: {
        with: { mentor: true },
      },
    },
  });
  if (!row?.match?.mentor) return false;
  return row.match.mentor.userId === userId;
}

async function canCompleteMentorshipSession(
  userId: string,
  role: string | null | undefined,
  sessionId: number
): Promise<boolean> {
  if (isPhase2Admin(role)) return true;
  if (!isMentorRole(role)) return false;
  return mentorOwnsSession(userId, sessionId);
}

function parseSessionDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function parseDurationMinutes(hoursRaw: unknown, minutesRaw: unknown): number | null {
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || minutes < 0 || minutes > 59) return null;
  const total = Math.round(hours * 60 + minutes);
  if (total <= 0) return null;
  return total;
}

async function revalidateMentorshipPaths(businessId?: number) {
  revalidatePath("/admin/mentorship");
  revalidatePath("/admin/mentorship/approvals");
  revalidatePath("/admin/mentorship/approved");
  revalidatePath("/admin/mentorship/analytics");
  revalidatePath("/oversight");
  revalidatePath("/mentor");
  if (businessId != null) {
    revalidatePath(`/admin/mentorship/matches/${businessId}`);
  }
}

/** Postgres undefined_table — usually migrations not applied to this database. */
function isPgUndefinedTableError(e: unknown): boolean {
  const chain: unknown[] = [e];
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur && typeof cur === "object" && "cause" in cur; i++) {
    cur = (cur as { cause: unknown }).cause;
    chain.push(cur);
  }
  for (const err of chain) {
    if (!err || typeof err !== "object") continue;
    const code = (err as { code?: string }).code;
    if (code === "42P01") return true;
    const msg = (err as Error).message ?? String(err);
    if (/relation .* does not exist/i.test(msg)) return true;
  }
  return false;
}

const MIGRATION_HINT =
  "Database schema is out of date (missing tables). From the project root, run: pnpm db:migrate (or npm run db:migrate) against the same POSTGRES_URL this app uses.";

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

export type MentorCandidate = {
  id: string;
  email: string;
  name: string;
  role: string;
  alreadyMentor: boolean;
};

function toCandidate(
  r: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
  },
  alreadyMentor: boolean
): MentorCandidate {
  return {
    id: r.id,
    email: r.email,
    name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.name || r.email,
    role: r.role ?? "applicant",
    alreadyMentor,
  };
}

/** Users with role TA (`mentor`) get a mentors row so they can be assigned. */
async function syncTaUsersIntoMentorsTable() {
  const taUsers = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.role, "mentor"));

  if (taUsers.length === 0) return;

  const existing = await db.select({ userId: mentors.userId }).from(mentors);
  const taken = new Set(existing.map((r) => r.userId));
  const toInsert = taUsers.filter((u) => !taken.has(u.userId));
  if (toInsert.length === 0) return;

  await db.insert(mentors).values(
    toInsert.map((u) => ({
      userId: u.userId,
      expertiseArea: "other" as const,
    }))
  );
}

export async function listUsersForMentorOnboarding(): Promise<
  ActionResponse<MentorCandidate[]>
> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const userSelect = {
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      role: userProfiles.role,
    };

    const [taRows, otherRows] = await Promise.all([
      db
        .select(userSelect)
        .from(users)
        .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(userProfiles.role, "mentor"))
        .orderBy(asc(userProfiles.lastName), asc(userProfiles.firstName)),
      db
        .select(userSelect)
        .from(users)
        .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(ne(userProfiles.role, "mentor"))
        .orderBy(asc(userProfiles.lastName), asc(userProfiles.firstName))
        .limit(400),
    ]);

    let taken = new Set<string>();
    try {
      const existing = await db.select({ userId: mentors.userId }).from(mentors);
      taken = new Set(existing.map((r) => r.userId));
    } catch (e) {
      if (!isPgUndefinedTableError(e)) throw e;
    }

    const seen = new Set<string>();
    const data: MentorCandidate[] = [];
    for (const r of [...taRows, ...otherRows]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      data.push(toCandidate(r, taken.has(r.id)));
    }

    return successResponse(data);
  } catch (e) {
    console.error("listUsersForMentorOnboarding", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load users");
  }
}

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

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, user.id),
    });
    if (profile?.role === "applicant") {
      await db
        .update(userProfiles)
        .set({ role: "mentor", updatedAt: new Date() })
        .where(eq(userProfiles.userId, user.id));
      await db
        .update(users)
        .set({ role: "user", updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    revalidatePath("/admin/mentorship");
    revalidatePath("/admin/users");
    return successResponse({ id: row.id });
  } catch (e) {
    console.error("createMentor", e);
    return errorResponse("Failed to create mentor");
  }
}

function buildMentorshipSessionRows(matchId: number, startDate: Date) {
  return [1, 2, 3, 4, 5, 6].map((n) => {
    const scheduled = new Date(startDate);
    scheduled.setDate(scheduled.getDate() + (n - 1) * 7);
    return {
      matchId,
      sessionNumber: n,
      sessionType: n === 1 || n === 6 ? ("physical" as const) : ("virtual" as const),
      status: "scheduled" as const,
      scheduledDate: scheduled,
    };
  });
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
      with: { user: true },
    });
    if (!mentor?.user) return errorResponse("Mentor not found");

    const existingActiveMatch = await db.query.mentorshipMatches.findFirst({
      where: and(
        eq(mentorshipMatches.businessId, businessId),
        eq(mentorshipMatches.mentorId, mentorId),
        eq(mentorshipMatches.status, "active")
      ),
    });
    if (existingActiveMatch) {
      return errorResponse("This mentor already has an active match with this business.");
    }

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

      await tx.insert(mentorshipSessions).values(buildMentorshipSessionRows(match.id, base));
      return match.id;
    });

    await revalidateMentorshipPaths(businessId);

    void sendMentorshipAssignmentEmail({
      mentorEmail: mentor.user.email,
      mentorName: mentor.user.name ?? mentor.user.email,
      enterpriseNames: [business.name],
    }).catch((error) => {
      console.error("createMentorshipMatch email", error);
    });

    return successResponse({ matchId });
  } catch (e) {
    console.error("createMentorshipMatch", e);
    return errorResponse("Failed to create mentorship match");
  }
}

export async function assignMentorToEnterprises(
  mentorId: number,
  businessIds: number[]
): Promise<ActionResponse<{ assignedCount: number; skippedCount: number; assignedNames: string[] }>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const uniqueBusinessIds = [...new Set(businessIds.filter((id) => Number.isFinite(id)))];
    if (uniqueBusinessIds.length === 0) {
      return errorResponse("Select at least one enterprise.");
    }

    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.id, mentorId),
      with: { user: true },
    });
    if (!mentor?.user) return errorResponse("Mentor not found");

    const selectedBusinesses = await db.query.businesses.findMany({
      where: inArray(businesses.id, uniqueBusinessIds),
      columns: { id: true, name: true },
    });
    if (selectedBusinesses.length === 0) {
      return errorResponse("No matching enterprises were found.");
    }

    const existingActiveMatches = await db.query.mentorshipMatches.findMany({
      where: and(
        eq(mentorshipMatches.mentorId, mentorId),
        eq(mentorshipMatches.status, "active"),
        inArray(mentorshipMatches.businessId, selectedBusinesses.map((b) => b.id))
      ),
      columns: { businessId: true },
    });
    const alreadyAssigned = new Set(existingActiveMatches.map((m) => m.businessId));
    const toAssign = selectedBusinesses.filter((b) => !alreadyAssigned.has(b.id));
    const skippedCount = uniqueBusinessIds.length - toAssign.length;

    if (toAssign.length === 0) {
      return successResponse({
        assignedCount: 0,
        skippedCount,
        assignedNames: [],
      });
    }

    const base = new Date();
    const assignedNames = await db.transaction(async (tx) => {
      const names: string[] = [];
      for (const business of toAssign) {
        const [match] = await tx
          .insert(mentorshipMatches)
          .values({
            businessId: business.id,
            mentorId,
          })
          .returning({ id: mentorshipMatches.id });

        if (!match) throw new Error("Insert match failed");

        await tx.insert(mentorshipSessions).values(buildMentorshipSessionRows(match.id, base));
        names.push(business.name);
      }
      return names;
    });

    await revalidateMentorshipPaths();
    for (const business of toAssign) {
      revalidatePath(`/admin/mentorship/matches/${business.id}`);
    }

    void sendMentorshipAssignmentEmail({
      mentorEmail: mentor.user.email,
      mentorName: mentor.user.name ?? mentor.user.email,
      enterpriseNames: assignedNames,
    }).catch((error) => {
      console.error("assignMentorToEnterprises email", error);
    });

    return successResponse({
      assignedCount: assignedNames.length,
      skippedCount,
      assignedNames,
    });
  } catch (e) {
    console.error("assignMentorToEnterprises", e);
    return errorResponse("Failed to assign enterprises to this mentor");
  }
}

export async function completeMentorshipSession(input: {
  sessionId: number;
  completedDate: string;
  durationHours: number;
  durationMinutes: number;
  diagnosticNotes?: string;
  evidenceFiles?: MentorshipEvidenceFile[];
}): Promise<ActionResponse<void>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return errorResponse("Unauthorized");
    }

    const allowed = await canCompleteMentorshipSession(
      authSession.user.id,
      authSession.user.role ?? null,
      input.sessionId
    );
    if (!allowed) {
      return errorResponse("Unauthorized");
    }

    const row = await db.query.mentorshipSessions.findFirst({
      where: eq(mentorshipSessions.id, input.sessionId),
    });
    if (!row) return errorResponse("Session not found");
    if (row.status === "completed") {
      return errorResponse("Session is already completed.");
    }
    if (row.status === "pending_approval") {
      return errorResponse("Session is already awaiting admin approval.");
    }
    if (row.status !== "scheduled") {
      return errorResponse("This session cannot be submitted right now.");
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

    const completedDate = parseSessionDateInput(input.completedDate);
    if (!completedDate) {
      return errorResponse("Enter a valid session date.");
    }

    const durationMinutes = parseDurationMinutes(input.durationHours, input.durationMinutes);
    if (durationMinutes == null) {
      return errorResponse("Enter a valid session duration (hours and minutes, total must be greater than zero).");
    }

    const notes = (input.diagnosticNotes ?? "").trim();
    const evidenceFiles = input.evidenceFiles ?? [];

    if (row.sessionType === "physical") {
      if (!notes.length || evidenceFiles.length === 0) {
        return errorResponse(
          "Physical sessions require diagnostic notes and evidence (upload or URL)."
        );
      }
    }

    const primaryEvidenceUrl = primaryMentorshipEvidenceUrl(evidenceFiles);

    await db
      .update(mentorshipSessions)
      .set({
        status: "pending_approval",
        completedDate,
        durationMinutes,
        diagnosticNotes: notes.length ? notes : null,
        photographicEvidenceUrl: primaryEvidenceUrl,
        evidenceFiles,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(mentorshipSessions.id, input.sessionId));

    const match = await db.query.mentorshipMatches.findFirst({
      where: eq(mentorshipMatches.id, row.matchId),
    });
    await revalidateMentorshipPaths(match?.businessId);
    return successResponse(undefined);
  } catch (e) {
    console.error("completeMentorshipSession", e);
    return errorResponse("Failed to submit session");
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
    completedDate: String(formData.get("completedDate") ?? ""),
    durationHours: Number(formData.get("durationHours")),
    durationMinutes: Number(formData.get("durationMinutes")),
    diagnosticNotes: String(formData.get("diagnosticNotes") ?? ""),
    evidenceFiles: parseMentorshipEvidenceFilesInput(String(formData.get("evidenceFiles") ?? "")),
  });
}

export type MentorshipSessionReviewRow = {
  sessionId: number;
  matchId: number;
  businessId: number;
  businessName: string;
  applicantName: string;
  mentorName: string;
  mentorEmail: string;
  sessionNumber: number;
  sessionType: "physical" | "virtual";
  scheduledDate: string;
  completedDate: string;
  durationMinutes: number;
  durationLabel: string;
  diagnosticNotes: string | null;
  photographicEvidenceUrl: string | null;
  evidenceFiles: MentorshipEvidenceFile[];
  submittedAt: string;
};

export async function listMentorshipSessionsPendingApproval(): Promise<
  ActionResponse<MentorshipSessionReviewRow[]>
> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isMentorshipSessionApprover(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.mentorshipSessions.findMany({
      where: eq(mentorshipSessions.status, "pending_approval"),
      orderBy: (s, { desc }) => [desc(s.updatedAt)],
      with: {
        match: {
          with: {
            business: { with: { applicant: true } },
            mentor: { with: { user: true } },
          },
        },
      },
    });

    const data: MentorshipSessionReviewRow[] = rows
      .filter((row) => row.match?.business && row.match.mentor?.user && row.completedDate)
      .map((row) => ({
        sessionId: row.id,
        matchId: row.matchId,
        businessId: row.match.businessId,
        businessName: row.match.business.name,
        applicantName:
          `${row.match.business.applicant.firstName} ${row.match.business.applicant.lastName}`.trim(),
        mentorName: row.match.mentor.user.name ?? row.match.mentor.user.email,
        mentorEmail: row.match.mentor.user.email,
        sessionNumber: row.sessionNumber,
        sessionType: row.sessionType,
        scheduledDate: row.scheduledDate.toISOString(),
        completedDate: row.completedDate!.toISOString(),
        durationMinutes: row.durationMinutes ?? 0,
        durationLabel: formatMentorshipDurationMinutes(row.durationMinutes),
        diagnosticNotes: row.diagnosticNotes,
        photographicEvidenceUrl: row.photographicEvidenceUrl,
        evidenceFiles: mentorshipEvidenceFilesFromLegacyUrl(
          row.photographicEvidenceUrl,
          row.evidenceFiles
        ),
        submittedAt: row.updatedAt.toISOString(),
      }));

    return successResponse(data);
  } catch (e) {
    console.error("listMentorshipSessionsPendingApproval", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load pending sessions");
  }
}

export async function countMentorshipSessionsPendingApproval(): Promise<
  ActionResponse<number>
> {
  try {
    const authSession = await auth();
    const role = authSession?.user?.role ?? null;
    if (
      !authSession?.user?.id ||
      (!isMentorshipSessionApprover(role) && !isPhase2Admin(role))
    ) {
      return errorResponse("Unauthorized");
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mentorshipSessions)
      .where(eq(mentorshipSessions.status, "pending_approval"));

    return successResponse(Number(row?.count ?? 0));
  } catch (e) {
    console.error("countMentorshipSessionsPendingApproval", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to count pending sessions");
  }
}

export async function approveMentorshipSession(
  sessionId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isMentorshipSessionApprover(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const row = await db.query.mentorshipSessions.findFirst({
      where: eq(mentorshipSessions.id, sessionId),
      with: { match: true },
    });
    if (!row?.match) return errorResponse("Session not found");
    if (row.status !== "pending_approval") {
      return errorResponse("Only sessions awaiting approval can be approved.");
    }

    await db
      .update(mentorshipSessions)
      .set({
        status: "completed",
        approvedById: authSession.user.id,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(mentorshipSessions.id, sessionId));

    await revalidateMentorshipPaths(row.match.businessId);
    return successResponse({ businessId: row.match.businessId });
  } catch (e) {
    console.error("approveMentorshipSession", e);
    return errorResponse("Failed to approve session");
  }
}

export async function returnMentorshipSession(
  sessionId: number,
  reason: string
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isMentorshipSessionApprover(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const parsedReason = z.string().trim().min(5).max(2000).safeParse(reason);
    if (!parsedReason.success) {
      return errorResponse("Enter a return reason of at least 5 characters.");
    }

    const row = await db.query.mentorshipSessions.findFirst({
      where: eq(mentorshipSessions.id, sessionId),
      with: { match: true },
    });
    if (!row?.match) return errorResponse("Session not found");
    if (row.status !== "pending_approval") {
      return errorResponse("Only sessions awaiting approval can be returned.");
    }

    await db
      .update(mentorshipSessions)
      .set({
        status: "scheduled",
        rejectionReason: parsedReason.data,
        approvedById: authSession.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mentorshipSessions.id, sessionId));

    await revalidateMentorshipPaths(row.match.businessId);
    return successResponse({ businessId: row.match.businessId });
  } catch (e) {
    console.error("returnMentorshipSession", e);
    return errorResponse("Failed to return session");
  }
}

export type MentorListRow = {
  id: number;
  userEmail: string;
  userName: string | null;
  expertiseArea: string;
  isActive: boolean;
  enterpriseCount: number;
  enterpriseNames: string[];
  assignedBusinessIds: number[];
};

export async function listMentorsForAdmin(): Promise<ActionResponse<MentorListRow[]>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    try {
      await syncTaUsersIntoMentorsTable();
    } catch (e) {
      if (!isPgUndefinedTableError(e)) throw e;
    }

    const [rows, activeMatches] = await Promise.all([
      db.query.mentors.findMany({
        orderBy: (m, { asc }) => [asc(m.id)],
        with: { user: true },
      }),
      db.query.mentorshipMatches.findMany({
        where: eq(mentorshipMatches.status, "active"),
        with: { business: { columns: { name: true } } },
      }),
    ]);

    const enterprisesByMentor = new Map<number, { id: number; name: string }[]>();
    for (const match of activeMatches) {
      const list = enterprisesByMentor.get(match.mentorId) ?? [];
      list.push({ id: match.businessId, name: match.business.name });
      enterprisesByMentor.set(match.mentorId, list);
    }

    const data: MentorListRow[] = rows.map((m) => {
      const enterprises = enterprisesByMentor.get(m.id) ?? [];
      return {
        id: m.id,
        userEmail: m.user.email,
        userName: m.user.name,
        expertiseArea: m.expertiseArea,
        isActive: m.isActive ?? true,
        enterpriseCount: enterprises.length,
        enterpriseNames: enterprises.map((e) => e.name),
        assignedBusinessIds: enterprises.map((e) => e.id),
      };
    });

    return successResponse(data);
  } catch (e) {
    console.error("listMentorsForAdmin", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
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
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load matches");
  }
}

export type MyMentorshipMatchRow = {
  id: number;
  status: string;
  businessId: number;
  businessName: string;
  applicantName: string;
  sessions: Array<{
    id: number;
    sessionNumber: number;
    sessionType: "physical" | "virtual";
    status: string;
    scheduledDate: Date;
    completedDate: Date | null;
    durationMinutes: number | null;
    diagnosticNotes: string | null;
    photographicEvidenceUrl: string | null;
    evidenceFiles: MentorshipEvidenceFile[];
    rejectionReason: string | null;
  }>;
};

export async function listMyMentorshipMatches(): Promise<
  ActionResponse<MyMentorshipMatchRow[]>
> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isMentorRole(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.userId, authSession.user.id),
    });
    if (!mentor) {
      return successResponse([]);
    }

    const matches = await db.query.mentorshipMatches.findMany({
      where: eq(mentorshipMatches.mentorId, mentor.id),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      with: {
        business: { with: { applicant: true } },
        sessions: {
          orderBy: (s, { asc }) => [asc(s.sessionNumber)],
        },
      },
    });

    const data: MyMentorshipMatchRow[] = matches.map((match) => ({
      id: match.id,
      status: match.status,
      businessId: match.businessId,
      businessName: match.business.name,
      applicantName: `${match.business.applicant.firstName} ${match.business.applicant.lastName}`.trim(),
      sessions: match.sessions.map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        sessionType: s.sessionType,
        status: s.status,
        scheduledDate: s.scheduledDate,
        completedDate: s.completedDate,
        durationMinutes: s.durationMinutes,
        diagnosticNotes: s.diagnosticNotes,
        photographicEvidenceUrl: s.photographicEvidenceUrl,
        evidenceFiles: mentorshipEvidenceFilesFromLegacyUrl(
          s.photographicEvidenceUrl,
          s.evidenceFiles
        ),
        rejectionReason: s.rejectionReason,
      })),
    }));

    return successResponse(data);
  } catch (e) {
    console.error("listMyMentorshipMatches", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load your mentorship matches");
  }
}

export type MentorshipApprovedSessionRow = {
  sessionId: number;
  businessId: number;
  businessName: string;
  applicantName: string;
  mentorName: string;
  mentorEmail: string;
  sessionNumber: number;
  sessionType: "physical" | "virtual";
  scheduledDate: string;
  completedDate: string | null;
  durationMinutes: number;
  durationLabel: string;
  diagnosticNotes: string | null;
  photographicEvidenceUrl: string | null;
  evidenceFiles: MentorshipEvidenceFile[];
  approvedAt: string;
  approverId: string | null;
  approverName: string;
  approverEmail: string | null;
};

export async function listApprovedMentorshipSessions(): Promise<
  ActionResponse<MentorshipApprovedSessionRow[]>
> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.mentorshipSessions.findMany({
      where: and(
        eq(mentorshipSessions.status, "completed"),
        isNotNull(mentorshipSessions.approvedAt)
      ),
      orderBy: (s, { desc: orderDesc }) => [orderDesc(s.approvedAt)],
      with: {
        match: {
          with: {
            business: { with: { applicant: true } },
            mentor: { with: { user: true } },
          },
        },
      },
    });

    const approverIds = [
      ...new Set(rows.map((row) => row.approvedById).filter((id): id is string => Boolean(id))),
    ];
    const approverRows =
      approverIds.length > 0
        ? await db.query.users.findMany({
            where: inArray(users.id, approverIds),
            columns: { id: true, email: true, name: true },
          })
        : [];
    const approverById = new Map(approverRows.map((user) => [user.id, user]));

    const data: MentorshipApprovedSessionRow[] = rows
      .filter((row) => row.match?.business && row.match.mentor?.user && row.approvedAt)
      .map((row) => {
        const approver = row.approvedById ? approverById.get(row.approvedById) : null;
        return {
          sessionId: row.id,
          businessId: row.match.businessId,
          businessName: row.match.business.name,
          applicantName:
            `${row.match.business.applicant.firstName} ${row.match.business.applicant.lastName}`.trim(),
          mentorName: row.match.mentor.user.name ?? row.match.mentor.user.email,
          mentorEmail: row.match.mentor.user.email,
          sessionNumber: row.sessionNumber,
          sessionType: row.sessionType,
          scheduledDate: row.scheduledDate.toISOString(),
          completedDate: row.completedDate?.toISOString() ?? null,
          durationMinutes: row.durationMinutes ?? 0,
          durationLabel: formatMentorshipDurationMinutes(row.durationMinutes),
          diagnosticNotes: row.diagnosticNotes,
          photographicEvidenceUrl: row.photographicEvidenceUrl,
          evidenceFiles: mentorshipEvidenceFilesFromLegacyUrl(
            row.photographicEvidenceUrl,
            row.evidenceFiles
          ),
          approvedAt: row.approvedAt!.toISOString(),
          approverId: row.approvedById,
          approverName: approver?.name ?? approver?.email ?? "Unknown approver",
          approverEmail: approver?.email ?? null,
        };
      });

    return successResponse(data);
  } catch (e) {
    console.error("listApprovedMentorshipSessions", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load approved sessions");
  }
}

export type { MentorshipAnalytics };

export async function getMentorshipAnalytics(): Promise<ActionResponse<MentorshipAnalytics>> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id || !isPhase2Admin(authSession.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const data = await loadMentorshipExportData();
    return successResponse(computeMentorshipAnalytics(data));
  } catch (e) {
    console.error("getMentorshipAnalytics", e);
    if (isPgUndefinedTableError(e)) return errorResponse(MIGRATION_HINT);
    return errorResponse("Failed to load mentorship analytics");
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
