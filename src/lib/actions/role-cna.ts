"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  businesses,
  cnaAssessments,
  cnaQuestionBank,
  cnaQuestionResponses,
  cnaRoleReviews,
  type CnaAssessment,
  type CnaQuestion,
  type CnaQuestionResponse,
  type CnaRoleReview,
} from "@/db/schema";
import {
  isBusinessInQualifiedCnaCohort,
  listQualifiedCnaBusinessRows,
} from "@/lib/cna/qualified-businesses";
import { computeQuestionWeights, computeRoleBasedCnaResult, scoreQuestionResponse } from "@/lib/cna/role-based-scoring";
import {
  CNA_RATINGS,
  CNA_REVIEWER_ROLES,
  type CnaAssessmentResult,
  type CnaRating,
  type CnaReviewerRole,
} from "@/lib/cna/role-based-types";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";
import type { BusinessListRow } from "./cna";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isAdminRole(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function isCnaReviewerRole(role?: string | null): role is CnaReviewerRole {
  return !!role && CNA_REVIEWER_ROLES.includes(role as CnaReviewerRole);
}

function roleHome(role: CnaReviewerRole) {
  switch (role) {
    case "mentor":
      return "/mentor/cna";
    case "bds_edo":
      return "/bds/cna";
    case "investment_analyst":
      return "/investment/cna";
    case "mel":
      return "/mel/cna";
  }
}

async function requireCnaRole(): Promise<
  | { ok: true; userId: string; role: CnaReviewerRole; isAdmin: false }
  | { ok: true; userId: string; role: null; isAdmin: true }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role ?? null;
  if (!userId) return { ok: false, error: "Unauthorized" };
  if (isAdminRole(role)) return { ok: true, userId, role: null, isAdmin: true };
  if (isCnaReviewerRole(role)) return { ok: true, userId, role, isAdmin: false };
  return { ok: false, error: "Unauthorized" };
}

export async function listBusinessesForCnaRole(): Promise<ActionResponse<BusinessListRow[]>> {
  try {
    const actor = await requireCnaRole();
    if (!actor.ok) return errorResponse(actor.error);

    return successResponse(await listQualifiedCnaBusinessRows());
  } catch (e) {
    console.error("listBusinessesForCnaRole", e);
    return errorResponse("Failed to load businesses");
  }
}

export type CnaRoleWorkspace = {
  business: {
    id: number;
    name: string;
    applicantName: string;
    applicantEmail: string;
  };
  assessment: CnaAssessment;
  roleReview: CnaRoleReview;
  questions: CnaQuestion[];
  responses: CnaQuestionResponse[];
  result: CnaAssessmentResult;
  viewerRole: CnaReviewerRole;
  canSubmit: boolean;
};

export type AdminCnaBusinessOverview = {
  assessment: CnaAssessment | null;
  roleReviews: CnaRoleReview[];
  result: CnaAssessmentResult | null;
  responses: (CnaQuestionResponse & { question?: CnaQuestion | null })[];
};

async function getOrCreateAssessment(businessId: number, userId: string) {
  const existing = await db.query.cnaAssessments.findFirst({
    where: and(eq(cnaAssessments.businessId, businessId), eq(cnaAssessments.status, "in_progress")),
    orderBy: [desc(cnaAssessments.updatedAt)],
  });
  if (existing) return existing;

  const [created] = await db
    .insert(cnaAssessments)
    .values({
      businessId,
      status: "in_progress",
      createdById: userId,
    })
    .returning();
  return created;
}

async function getOrCreateRoleReview(
  assessmentId: number,
  role: CnaReviewerRole,
  userId: string
) {
  const existing = await db.query.cnaRoleReviews.findFirst({
    where: and(eq(cnaRoleReviews.assessmentId, assessmentId), eq(cnaRoleReviews.role, role)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(cnaRoleReviews)
    .values({
      assessmentId,
      role,
      reviewerId: userId,
      status: "in_progress",
      startedAt: new Date(),
    })
    .returning();
  return created;
}

export async function getCnaRoleWorkspace(
  businessId: number,
  requestedRole?: CnaReviewerRole
): Promise<ActionResponse<CnaRoleWorkspace>> {
  try {
    const actor = await requireCnaRole();
    if (!actor.ok) return errorResponse(actor.error);

    const viewerRole = requestedRole ?? actor.role;
    if (!viewerRole) return errorResponse("Select a CNA reviewer role.");
    if (!actor.isAdmin && actor.role !== viewerRole) return errorResponse("Unauthorized");

    if (!(await isBusinessInQualifiedCnaCohort(businessId))) {
      return errorResponse("CNA is only available for businesses that passed final due diligence.");
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      with: { applicant: true },
    });
    if (!business) return errorResponse("Business not found");

    const assessment = await getOrCreateAssessment(businessId, actor.userId);
    const roleReview = await getOrCreateRoleReview(assessment.id, viewerRole, actor.userId);

    const [roleQuestions, allQuestions, responses] = await Promise.all([
      db.query.cnaQuestionBank.findMany({
        where: and(eq(cnaQuestionBank.assignedRole, viewerRole), eq(cnaQuestionBank.isActive, true)),
        orderBy: [asc(cnaQuestionBank.sectionCode), asc(cnaQuestionBank.sortOrder)],
      }),
      db.query.cnaQuestionBank.findMany({
        where: eq(cnaQuestionBank.isActive, true),
        orderBy: [asc(cnaQuestionBank.sectionCode), asc(cnaQuestionBank.sortOrder)],
      }),
      db.query.cnaQuestionResponses.findMany({
        where: eq(cnaQuestionResponses.assessmentId, assessment.id),
        orderBy: [asc(cnaQuestionResponses.questionId)],
      }),
    ]);

    const result = computeRoleBasedCnaResult(
      allQuestions.map((q) => ({
        id: q.id,
        sectionCode: q.sectionCode,
        sectionName: q.sectionName,
        assignedRole: q.assignedRole,
      })),
      responses.map((r) => ({
        questionId: r.questionId,
        ratingLabel: r.ratingLabel,
        scoreValue: r.scoreValue,
      }))
    );

    return successResponse({
      business: {
        id: business.id,
        name: business.name,
        applicantName: `${business.applicant.firstName} ${business.applicant.lastName}`.trim(),
        applicantEmail: business.applicant.email,
      },
      assessment,
      roleReview,
      questions: roleQuestions,
      responses,
      result,
      viewerRole,
      canSubmit: roleQuestions.every((q) => responses.some((r) => r.questionId === q.id)),
    });
  } catch (e) {
    console.error("getCnaRoleWorkspace", e);
    return errorResponse("Failed to load CNA workspace");
  }
}

export async function getAdminCnaBusinessOverview(
  businessId: number
): Promise<ActionResponse<AdminCnaBusinessOverview>> {
  try {
    const actor = await requireCnaRole();
    if (!actor.ok) return errorResponse(actor.error);
    if (!actor.isAdmin) return errorResponse("Unauthorized");

    const assessment = await db.query.cnaAssessments.findFirst({
      where: eq(cnaAssessments.businessId, businessId),
      orderBy: [desc(cnaAssessments.updatedAt)],
      with: {
        roleReviews: { orderBy: [asc(cnaRoleReviews.role)] },
        responses: {
          orderBy: [asc(cnaQuestionResponses.questionId)],
          with: { question: true },
        },
      },
    });

    if (!assessment) {
      return successResponse({
        assessment: null,
        roleReviews: [],
        result: null,
        responses: [],
      });
    }

    const questions = await db.query.cnaQuestionBank.findMany({
      where: eq(cnaQuestionBank.isActive, true),
      orderBy: [asc(cnaQuestionBank.sectionCode), asc(cnaQuestionBank.sortOrder)],
    });

    const result = computeRoleBasedCnaResult(
      questions.map((q) => ({
        id: q.id,
        sectionCode: q.sectionCode,
        sectionName: q.sectionName,
        assignedRole: q.assignedRole,
      })),
      assessment.responses.map((r) => ({
        questionId: r.questionId,
        ratingLabel: r.ratingLabel,
        scoreValue: r.scoreValue,
      }))
    );

    return successResponse({
      assessment,
      roleReviews: assessment.roleReviews,
      result,
      responses: assessment.responses,
    });
  } catch (e) {
    console.error("getAdminCnaBusinessOverview", e);
    return errorResponse("Failed to load role-based CNA overview");
  }
}

const saveResponseSchema = z.object({
  businessId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  ratingLabel: z.enum(CNA_RATINGS),
  comment: z.string().max(8000).optional().nullable(),
  reviewerRole: z.enum(CNA_REVIEWER_ROLES).optional(),
});

export async function saveCnaQuestionResponse(
  input: z.infer<typeof saveResponseSchema>
): Promise<ActionResponse<{ assessmentId: number }>> {
  try {
    const actor = await requireCnaRole();
    if (!actor.ok) return errorResponse(actor.error);
    const parsed = saveResponseSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid CNA response");

    const effectiveRole = actor.isAdmin ? parsed.data.reviewerRole : actor.role;
    if (!effectiveRole) return errorResponse("Select the reviewer role for this response.");

    const question = await db.query.cnaQuestionBank.findFirst({
      where: eq(cnaQuestionBank.id, parsed.data.questionId),
    });
    if (!question || !question.isActive) return errorResponse("Question not found");
    if (question.assignedRole !== effectiveRole) return errorResponse("This question belongs to another role.");

    if (parsed.data.ratingLabel !== "great" && !parsed.data.comment?.trim()) {
      return errorResponse("Add a short reason when rating a question Poor or Fair.");
    }

    if (!(await isBusinessInQualifiedCnaCohort(parsed.data.businessId))) {
      return errorResponse("CNA is only available for businesses that passed final due diligence.");
    }

    const assessment = await getOrCreateAssessment(parsed.data.businessId, actor.userId);
    if (assessment.status === "locked" || assessment.status === "archived") {
      return errorResponse("This CNA assessment is locked.");
    }
    const roleReview = await getOrCreateRoleReview(assessment.id, effectiveRole, actor.userId);

    const sectionQuestions = await db.query.cnaQuestionBank.findMany({
      where: and(
        eq(cnaQuestionBank.sectionCode, question.sectionCode),
        eq(cnaQuestionBank.isActive, true)
      ),
    });
    const weights = computeQuestionWeights(
      sectionQuestions.map((q) => ({
        id: q.id,
        sectionCode: q.sectionCode,
        sectionName: q.sectionName,
        assignedRole: q.assignedRole,
      }))
    );
    const questionWeight = weights.get(question.id) ?? 0;
    const scoreValue = scoreQuestionResponse(parsed.data.ratingLabel as CnaRating, questionWeight);

    const existing = await db.query.cnaQuestionResponses.findFirst({
      where: and(
        eq(cnaQuestionResponses.assessmentId, assessment.id),
        eq(cnaQuestionResponses.questionId, question.id)
      ),
    });

    if (existing) {
      await db
        .update(cnaQuestionResponses)
        .set({
          roleReviewId: roleReview.id,
          ratingLabel: parsed.data.ratingLabel,
          questionWeight: String(questionWeight),
          scoreValue: String(scoreValue),
          comment: parsed.data.comment?.trim() || null,
          answeredById: actor.userId,
          answeredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cnaQuestionResponses.id, existing.id));
    } else {
      await db.insert(cnaQuestionResponses).values({
        assessmentId: assessment.id,
        roleReviewId: roleReview.id,
        questionId: question.id,
        ratingLabel: parsed.data.ratingLabel,
        questionWeight: String(questionWeight),
        scoreValue: String(scoreValue),
        comment: parsed.data.comment?.trim() || null,
        answeredById: actor.userId,
      });
    }

    await db
      .update(cnaRoleReviews)
      .set({
        reviewerId: actor.userId,
        status: "in_progress",
        startedAt: roleReview.startedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cnaRoleReviews.id, roleReview.id));

    revalidatePath(roleHome(effectiveRole));
    revalidatePath(`${roleHome(effectiveRole)}/${parsed.data.businessId}`);
    revalidatePath("/admin/cna");
    revalidatePath(`/admin/cna/${parsed.data.businessId}`);
    return successResponse({ assessmentId: assessment.id });
  } catch (e) {
    console.error("saveCnaQuestionResponse", e);
    return errorResponse("Failed to save CNA response");
  }
}

const submitReviewSchema = z.object({
  businessId: z.number().int().positive(),
  reviewerRole: z.enum(CNA_REVIEWER_ROLES).optional(),
});

export async function submitCnaRoleReview(
  input: z.infer<typeof submitReviewSchema>
): Promise<ActionResponse<{ assessmentId: number }>> {
  try {
    const actor = await requireCnaRole();
    if (!actor.ok) return errorResponse(actor.error);
    const parsed = submitReviewSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid review");

    const effectiveRole = actor.isAdmin ? parsed.data.reviewerRole : actor.role;
    if (!effectiveRole) return errorResponse("Select the reviewer role to submit.");

    const workspace = await getCnaRoleWorkspace(parsed.data.businessId, effectiveRole);
    if (!workspace.success || !workspace.data) {
      return errorResponse(workspace.error ?? "Failed to load review");
    }
    if (!workspace.data.canSubmit) {
      return errorResponse("Answer all assigned questions before submitting.");
    }

    await db
      .update(cnaRoleReviews)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        reviewerId: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(cnaRoleReviews.id, workspace.data.roleReview.id));

    revalidatePath(roleHome(effectiveRole));
    revalidatePath(`${roleHome(effectiveRole)}/${parsed.data.businessId}`);
    revalidatePath("/admin/cna");
    revalidatePath(`/admin/cna/${parsed.data.businessId}`);
    return successResponse({ assessmentId: workspace.data.assessment.id });
  } catch (e) {
    console.error("submitCnaRoleReview", e);
    return errorResponse("Failed to submit CNA review");
  }
}
