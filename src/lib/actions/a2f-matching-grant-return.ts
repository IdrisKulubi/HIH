"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fMatchingGrantApplications,
  a2fPipeline,
  userProfiles,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  A2F_STAFF_ROLES,
  canWriteA2fStaff,
} from "@/lib/a2f-access";
import {
  PIPELINE_STAGE_ORDER,
  type A2fPipelineStatus,
} from "@/lib/a2f-constants";
import {
  getMatchingGrantReturnSummary,
  listMatchingGrantReturnAssignees,
} from "@/lib/matching-grant-return";
import { sendMatchingGrantReturnedToEdoEmail } from "@/lib/email";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const returnSchema = z.object({
  a2fId: z.number().int().positive(),
  assignedToId: z.string().trim().min(1),
  returnReason: z.string().trim().min(10, "Provide a return reason of at least 10 characters.").max(4000),
});

function displayName(profile: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    "Programme staff"
  );
}

export async function getMatchingGrantReturnAssigneesAction(): Promise<
  ActionResponse<Array<{ id: string; name: string; email: string; role: string }>>
> {
  try {
    const session = await auth();
    if (!session?.user || !canWriteA2fStaff(session.user.role)) {
      return errorResponse("Unauthorized");
    }
    return successResponse(await listMatchingGrantReturnAssignees());
  } catch (error) {
    console.error("getMatchingGrantReturnAssigneesAction", error);
    return errorResponse("Unable to load EDO assignees.");
  }
}

export async function getMatchingGrantReturnSummaryAction(a2fId: number) {
  try {
    const session = await auth();
    if (!session?.user || !A2F_STAFF_ROLES.includes(session.user.role as typeof A2F_STAFF_ROLES[number])) {
      return errorResponse("Unauthorized");
    }
    const summary = await getMatchingGrantReturnSummary(a2fId);
    return successResponse(summary);
  } catch (error) {
    console.error("getMatchingGrantReturnSummaryAction", error);
    return errorResponse("Unable to load return status.");
  }
}

export async function returnMatchingGrantForCorrectionAction(input: {
  a2fId: number;
  assignedToId: string;
  returnReason: string;
}): Promise<ActionResponse<{ status: string }>> {
  try {
    const session = await auth();
    if (!session?.user || !canWriteA2fStaff(session.user.role)) {
      return errorResponse("Unauthorized");
    }

    const value = returnSchema.parse(input);

    const pipeline = await db.query.a2fPipeline.findFirst({
      where: eq(a2fPipeline.id, value.a2fId),
      with: {
        application: {
          with: {
            business: { with: { applicant: true } },
          },
        },
        matchingGrantApplications: true,
      },
    });

    if (!pipeline) return errorResponse("A2F pipeline entry not found");
    if (pipeline.instrumentType !== "matching_grant") {
      return errorResponse("Only Matching Grant pipeline entries can be returned.");
    }

    const mg = pipeline.matchingGrantApplications?.[0];
    if (!mg) return errorResponse("Matching Grant application not found.");
    if (mg.status !== "submitted") {
      return errorResponse("Only submitted applications can be sent back for correction.");
    }

    const [assignee] = await db
      .select({
        userId: userProfiles.userId,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: userProfiles.email,
        role: userProfiles.role,
      })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.userId, value.assignedToId),
          inArray(userProfiles.role, ["bds_edo", "redo"])
        )
      )
      .limit(1);

    if (!assignee) return errorResponse("Select a valid EDO or head assignee.");

    const preIcIndex = PIPELINE_STAGE_ORDER.indexOf("pre_ic_scoring");
    const currentIndex = PIPELINE_STAGE_ORDER.indexOf(pipeline.status as A2fPipelineStatus);
    const shouldRegress = currentIndex > preIcIndex;

    await db.transaction(async (tx) => {
      await tx
        .update(a2fMatchingGrantApplications)
        .set({
          status: "returned_for_correction",
          returnedAt: new Date(),
          returnedById: session.user!.id,
          returnedToEdoId: value.assignedToId,
          returnReason: value.returnReason,
          returnCount: mg.returnCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(a2fMatchingGrantApplications.id, mg.id));

      if (shouldRegress) {
        await tx
          .update(a2fPipeline)
          .set({ status: "pre_ic_scoring", updatedAt: new Date() })
          .where(eq(a2fPipeline.id, value.a2fId));
      }
    });

    const applicant = pipeline.application?.business?.applicant;
    const businessName = pipeline.application?.business?.name ?? "Enterprise";
    const applicantName = applicant
      ? `${applicant.firstName} ${applicant.lastName}`.trim()
      : "Applicant";

    await sendMatchingGrantReturnedToEdoEmail({
      edoEmail: assignee.email,
      edoName: displayName(assignee),
      applicantName,
      businessName,
      applicantEmail: applicant?.email?.trim() || "Not available",
      applicantPhone: applicant?.phoneNumber?.trim() || "Not available",
      returnReason: value.returnReason,
    });

    revalidatePath(`/a2f/${value.a2fId}/scoring`);
    revalidatePath(`/a2f/${value.a2fId}/matching-grant`);
    revalidatePath(`/access-to-finance/application/${value.a2fId}`);
    revalidatePath("/access-to-finance");
    revalidatePath("/profile");

    return successResponse(
      { status: "returned_for_correction" },
      "Application sent back for correction. The selected EDO has been notified."
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message ?? "Invalid return request.");
    }
    console.error("returnMatchingGrantForCorrectionAction", error);
    return errorResponse("Failed to send application back for correction.");
  }
}
