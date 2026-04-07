"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
  applicants,
  applications,
  businesses,
  kycChangeRequests,
  kycDocuments,
  kycFieldChanges,
  kycProfiles,
} from "../../../db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";

const KYC_READY_APPLICATION_STATUSES = ["approved", "finalist"] as const;
const KYC_ADMIN_ROLES = ["admin", "oversight"] as const;

const kycDocumentInputSchema = z.object({
  documentType: z.enum([
    "tax_compliance_certificate",
    "cr12",
    "bank_account_proof",
    "programme_consent_form",
    "director_id_document",
    "additional_supporting_document",
  ]),
  fileUrl: z.string().min(1),
  fileName: z.string().optional(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

const kycDraftSchema = z.object({
  gpsCoordinates: z.string().max(255).optional(),
  registrationTypeConfirmed: z.enum([
    "limited_company",
    "partnership",
    "cooperative",
    "self_help_group_cbo",
    "sole_proprietorship",
    "other",
  ]).optional(),
  kraPin: z.string().max(100).optional(),
  bankName: z.string().max(255).optional(),
  bankAccountName: z.string().max(255).optional(),
  baselineMonthLabel: z.string().max(100).optional(),
  baselineRevenue: z.number().nonnegative().optional(),
  baselineEmployeeCount: z.number().int().nonnegative().optional(),
  secondaryContactName: z.string().max(255).optional(),
  secondaryContactPhone: z.string().max(50).optional(),
  secondaryContactEmail: z.string().email().optional(),
  documents: z.array(kycDocumentInputSchema).optional(),
});

const kycSubmitSchema = kycDraftSchema.extend({
  gpsCoordinates: z.string().min(1).max(255),
  registrationTypeConfirmed: z.enum([
    "limited_company",
    "partnership",
    "cooperative",
    "self_help_group_cbo",
    "sole_proprietorship",
    "other",
  ]),
  kraPin: z.string().min(1).max(100),
  bankName: z.string().min(1).max(255),
  bankAccountName: z.string().min(1).max(255),
  baselineMonthLabel: z.string().min(1).max(100),
  baselineRevenue: z.number().nonnegative(),
  baselineEmployeeCount: z.number().int().nonnegative(),
});

const kycReviewSchema = z.object({
  applicationId: z.number().int().positive(),
  action: z.enum(["verify", "needs_info", "reject"]),
  reviewNotes: z.string().optional(),
  reason: z.string().optional(),
});

const kycChangeRequestSchema = z.object({
  fieldName: z.string().min(1).max(120),
  requestedValue: z.unknown(),
  reason: z.string().min(10),
});

type KycDraftInput = z.infer<typeof kycDraftSchema>;
type KycSubmitInput = z.infer<typeof kycSubmitSchema>;
type KycReviewInput = z.infer<typeof kycReviewSchema>;
type KycChangeRequestInput = z.infer<typeof kycChangeRequestSchema>;

function isKycAdmin(role?: string | null) {
  return !!role && KYC_ADMIN_ROLES.includes(role as (typeof KYC_ADMIN_ROLES)[number]);
}

function buildOriginalSnapshot(application: {
  id: number;
  track: string | null;
  status: string;
  business: {
    id: number;
    name: string;
    county: string | null;
    city: string;
    sector: string | null;
    registrationType: string | null;
    revenueLastYear: string | null;
    fullTimeEmployeesTotal: number | null;
  };
}) {
  return {
    application: {
      id: application.id,
      track: application.track,
      status: application.status,
    },
    business: {
      id: application.business.id,
      name: application.business.name,
      county: application.business.county,
      city: application.business.city,
      sector: application.business.sector,
      registrationType: application.business.registrationType,
      revenueLastYear: application.business.revenueLastYear,
      fullTimeEmployeesTotal: application.business.fullTimeEmployeesTotal,
    },
  };
}

function buildSubmittedSnapshot(data: KycDraftInput | KycSubmitInput) {
  return {
    gpsCoordinates: data.gpsCoordinates ?? null,
    registrationTypeConfirmed: data.registrationTypeConfirmed ?? null,
    kraPin: data.kraPin ?? null,
    bankName: data.bankName ?? null,
    bankAccountName: data.bankAccountName ?? null,
    baselineMonthLabel: data.baselineMonthLabel ?? null,
    baselineRevenue: data.baselineRevenue ?? null,
    baselineEmployeeCount: data.baselineEmployeeCount ?? null,
    secondaryContactName: data.secondaryContactName ?? null,
    secondaryContactPhone: data.secondaryContactPhone ?? null,
    secondaryContactEmail: data.secondaryContactEmail ?? null,
  };
}

function computeFieldChanges(
  originalSnapshot: ReturnType<typeof buildOriginalSnapshot>,
  submittedSnapshot: ReturnType<typeof buildSubmittedSnapshot>
) {
  const fields = [
    ["registrationType", originalSnapshot.business.registrationType, submittedSnapshot.registrationTypeConfirmed, true],
    ["baselineRevenue", originalSnapshot.business.revenueLastYear, submittedSnapshot.baselineRevenue, true],
    ["baselineEmployeeCount", originalSnapshot.business.fullTimeEmployeesTotal, submittedSnapshot.baselineEmployeeCount, true],
    ["gpsCoordinates", null, submittedSnapshot.gpsCoordinates, false],
    ["kraPin", null, submittedSnapshot.kraPin, true],
    ["bankName", null, submittedSnapshot.bankName, true],
    ["bankAccountName", null, submittedSnapshot.bankAccountName, true],
  ] as const;

  return fields
    .filter(([, before, after]) => JSON.stringify(before ?? null) !== JSON.stringify(after ?? null))
    .map(([fieldName, oldValue, newValue, isCoreField]) => ({ fieldName, oldValue, newValue, isCoreField }));
}

async function getAuthorizedKycApplication(userId: string) {
  return db.query.applications.findFirst({
    where: eq(applications.userId, userId),
    with: {
      business: {
        with: {
          applicant: true,
        },
      },
    },
  });
}

async function upsertKycDocuments(profileId: number, userId: string, docs?: KycDraftInput["documents"]) {
  if (!docs?.length) return;

  for (const doc of docs) {
    const existing = await db.query.kycDocuments.findFirst({
      where: and(
        eq(kycDocuments.kycProfileId, profileId),
        eq(kycDocuments.documentType, doc.documentType)
      ),
    });

    if (existing) {
      await db.update(kycDocuments).set({
        fileUrl: doc.fileUrl,
        fileName: doc.fileName ?? existing.fileName,
        documentNumber: doc.documentNumber ?? existing.documentNumber,
        notes: doc.notes ?? existing.notes,
        uploadedById: userId,
        isVerified: false,
        verifiedById: null,
        verifiedAt: null,
        rejectionReason: null,
        updatedAt: new Date(),
      }).where(eq(kycDocuments.id, existing.id));
      continue;
    }

    await db.insert(kycDocuments).values({
      kycProfileId: profileId,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      documentNumber: doc.documentNumber,
      notes: doc.notes,
      uploadedById: userId,
    });
  }
}

async function syncKycFieldChanges(
  profileId: number,
  userId: string,
  originalSnapshot: ReturnType<typeof buildOriginalSnapshot>,
  submittedSnapshot: ReturnType<typeof buildSubmittedSnapshot>
) {
  const existing = await db.query.kycFieldChanges.findMany({
    where: eq(kycFieldChanges.kycProfileId, profileId),
  });

  for (const item of existing) {
    await db.delete(kycFieldChanges).where(eq(kycFieldChanges.id, item.id));
  }

  const changes = computeFieldChanges(originalSnapshot, submittedSnapshot);
  if (!changes.length) return;

  await db.insert(kycFieldChanges).values(
    changes.map((change) => ({
      kycProfileId: profileId,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      isCoreField: change.isCoreField,
      changedById: userId,
    }))
  );
}

async function ensureKycProfile(userId: string) {
  const application = await getAuthorizedKycApplication(userId);

  if (!application) {
    return { error: "No application found for this user." as const };
  }

  if (!KYC_READY_APPLICATION_STATUSES.includes(application.status as (typeof KYC_READY_APPLICATION_STATUSES)[number])) {
    return { error: "KYC is only available for selected enterprises." as const };
  }

  let profile = await db.query.kycProfiles.findFirst({
    where: eq(kycProfiles.applicationId, application.id),
    with: {
      documents: true,
      fieldChanges: true,
      changeRequests: true,
    },
  });

  if (!profile) {
    const originalSnapshot = buildOriginalSnapshot(application);
    const [created] = await db.insert(kycProfiles).values({
      applicationId: application.id,
      businessId: application.business.id,
      userId,
      status: "in_progress",
      originalSnapshot,
      submittedSnapshot: {},
      lastSavedAt: new Date(),
    }).returning();

    await db.update(applications).set({
      kycRequired: true,
      kycStatus: "in_progress",
      updatedAt: new Date(),
    }).where(eq(applications.id, application.id));

    profile = {
      ...created,
      documents: [],
      fieldChanges: [],
      changeRequests: [],
    };
  }

  return { application, profile };
}

export async function getCurrentUserKycProfile(): Promise<ActionResponse<{
  applicationId: number;
  applicationStatus: string;
  kycRequired: boolean;
  kycStatus: string;
  profile: typeof kycProfiles.$inferSelect;
  business: {
    id: number;
    name: string;
    county: string | null;
    city: string;
    registrationType: string | null;
    revenueLastYear: string | null;
    fullTimeEmployeesTotal: number | null;
  };
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  documents: typeof kycDocuments.$inferSelect[];
  fieldChanges: typeof kycFieldChanges.$inferSelect[];
  changeRequests: typeof kycChangeRequests.$inferSelect[];
}>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");

    const result = await ensureKycProfile(session.user.id);
    if ("error" in result) return errorResponse(result.error ?? "KYC profile unavailable");

    const { application, profile } = result;

    return successResponse({
      applicationId: application.id,
      applicationStatus: application.status,
      kycRequired: application.kycRequired,
      kycStatus: application.kycStatus,
      profile,
      business: {
        id: application.business.id,
        name: application.business.name,
        county: application.business.county,
        city: application.business.city,
        registrationType: application.business.registrationType,
        revenueLastYear: application.business.revenueLastYear,
        fullTimeEmployeesTotal: application.business.fullTimeEmployeesTotal,
      },
      applicant: {
        firstName: application.business.applicant.firstName,
        lastName: application.business.applicant.lastName,
        email: application.business.applicant.email,
        phoneNumber: application.business.applicant.phoneNumber,
      },
      documents: profile.documents,
      fieldChanges: profile.fieldChanges,
      changeRequests: profile.changeRequests,
    });
  } catch (error) {
    console.error("Error loading KYC profile:", error);
    return errorResponse("Failed to load KYC profile");
  }
}

export async function saveKycDraft(input: KycDraftInput): Promise<ActionResponse<{ profileId: number; status: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");

    const validated = kycDraftSchema.parse(input);
    const result = await ensureKycProfile(session.user.id);
    if ("error" in result) return errorResponse(result.error ?? "KYC profile unavailable");

    const { application, profile } = result;
    if (profile.profileLockStatus === "locked") {
      return errorResponse("This profile is locked. Submit a change request instead.");
    }

    const originalSnapshot = (profile.originalSnapshot as ReturnType<typeof buildOriginalSnapshot>) || buildOriginalSnapshot(application);
    const submittedSnapshot = buildSubmittedSnapshot(validated);

    await db.update(kycProfiles).set({
      status: "in_progress",
      gpsCoordinates: validated.gpsCoordinates ?? profile.gpsCoordinates,
      registrationTypeConfirmed: validated.registrationTypeConfirmed ?? profile.registrationTypeConfirmed,
      kraPin: validated.kraPin ?? profile.kraPin,
      bankName: validated.bankName ?? profile.bankName,
      bankAccountName: validated.bankAccountName ?? profile.bankAccountName,
      baselineMonthLabel: validated.baselineMonthLabel ?? profile.baselineMonthLabel,
      baselineRevenue: validated.baselineRevenue !== undefined ? String(validated.baselineRevenue) : profile.baselineRevenue,
      baselineEmployeeCount: validated.baselineEmployeeCount ?? profile.baselineEmployeeCount,
      secondaryContactName: validated.secondaryContactName ?? profile.secondaryContactName,
      secondaryContactPhone: validated.secondaryContactPhone ?? profile.secondaryContactPhone,
      secondaryContactEmail: validated.secondaryContactEmail ?? profile.secondaryContactEmail,
      submittedSnapshot,
      originalSnapshot,
      lastSavedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(kycProfiles.id, profile.id));

    await db.update(applications).set({
      kycRequired: true,
      kycStatus: "in_progress",
      updatedAt: new Date(),
    }).where(eq(applications.id, application.id));

    await upsertKycDocuments(profile.id, session.user.id, validated.documents);
    await syncKycFieldChanges(profile.id, session.user.id, originalSnapshot, submittedSnapshot);

    revalidatePath("/kyc");
    revalidatePath("/profile");

    return successResponse({ profileId: profile.id, status: "in_progress" }, "KYC draft saved");
  } catch (error) {
    console.error("Error saving KYC draft:", error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation failed: ${error.errors.map((item) => item.message).join(", ")}`);
    }
    return errorResponse("Failed to save KYC draft");
  }
}

export async function submitKycProfile(input: KycSubmitInput): Promise<ActionResponse<{ profileId: number; status: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");

    const validated = kycSubmitSchema.parse(input);
    const result = await ensureKycProfile(session.user.id);
    if ("error" in result) return errorResponse(result.error ?? "KYC profile unavailable");

    const { application, profile } = result;
    if (profile.profileLockStatus === "locked") {
      return errorResponse("This profile is locked and cannot be resubmitted.");
    }

    await upsertKycDocuments(profile.id, session.user.id, validated.documents);

    const allDocs = await db.query.kycDocuments.findMany({
      where: eq(kycDocuments.kycProfileId, profile.id),
    });
    const documentTypes = new Set(allDocs.map((doc) => doc.documentType));
    const requiredDocuments = [
      "tax_compliance_certificate",
      "bank_account_proof",
      "programme_consent_form",
    ];

    if (validated.registrationTypeConfirmed === "limited_company") {
      requiredDocuments.push("cr12");
    }

    const missing = requiredDocuments.filter((docType) => !documentTypes.has(docType as typeof allDocs[number]["documentType"]));
    if (missing.length) {
      return errorResponse(`Missing required KYC documents: ${missing.join(", ")}`);
    }

    const originalSnapshot = (profile.originalSnapshot as ReturnType<typeof buildOriginalSnapshot>) || buildOriginalSnapshot(application);
    const submittedSnapshot = buildSubmittedSnapshot(validated);

    await db.update(kycProfiles).set({
      status: "submitted",
      gpsCoordinates: validated.gpsCoordinates,
      registrationTypeConfirmed: validated.registrationTypeConfirmed,
      kraPin: validated.kraPin,
      bankName: validated.bankName,
      bankAccountName: validated.bankAccountName,
      baselineMonthLabel: validated.baselineMonthLabel,
      baselineRevenue: String(validated.baselineRevenue),
      baselineEmployeeCount: validated.baselineEmployeeCount,
      secondaryContactName: validated.secondaryContactName ?? profile.secondaryContactName,
      secondaryContactPhone: validated.secondaryContactPhone ?? profile.secondaryContactPhone,
      secondaryContactEmail: validated.secondaryContactEmail ?? profile.secondaryContactEmail,
      submittedSnapshot,
      originalSnapshot,
      submittedAt: new Date(),
      lastSavedAt: new Date(),
      reviewNotes: null,
      rejectionReason: null,
      needsInfoReason: null,
      updatedAt: new Date(),
    }).where(eq(kycProfiles.id, profile.id));

    await db.update(applications).set({
      kycRequired: true,
      kycStatus: "submitted",
      kycSubmittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(applications.id, application.id));

    await db.update(businesses).set({
      verificationStatus: "pending",
      updatedAt: new Date(),
    }).where(eq(businesses.id, application.business.id));

    await syncKycFieldChanges(profile.id, session.user.id, originalSnapshot, submittedSnapshot);

    revalidatePath("/kyc");
    revalidatePath("/profile");
    revalidatePath("/admin/kyc");

    return successResponse({ profileId: profile.id, status: "submitted" }, "KYC profile submitted");
  } catch (error) {
    console.error("Error submitting KYC profile:", error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation failed: ${error.errors.map((item) => item.message).join(", ")}`);
    }
    return errorResponse("Failed to submit KYC profile");
  }
}

export async function getKycQueue(status?: string): Promise<ActionResponse<Array<{
  applicationId: number;
  businessName: string;
  applicantName: string;
  applicantEmail: string;
  kycStatus: string;
  profileLockStatus: string;
  submittedAt: string | null;
  verifiedAt: string | null;
}>>> {
  try {
    const session = await auth();
    if (!isKycAdmin(session?.user?.role ?? null)) return errorResponse("Unauthorized");

    const profiles = await db.query.kycProfiles.findMany({
      where: status ? eq(kycProfiles.status, status as typeof kycProfiles.$inferSelect.status) : undefined,
      orderBy: [desc(kycProfiles.updatedAt), asc(kycProfiles.id)],
      with: {
        application: {
          with: {
            business: {
              with: {
                applicant: true,
              },
            },
          },
        },
      },
    });

    return successResponse(
      profiles.map((profile) => ({
        applicationId: profile.applicationId,
        businessName: profile.application.business.name,
        applicantName: `${profile.application.business.applicant.firstName} ${profile.application.business.applicant.lastName}`.trim(),
        applicantEmail: profile.application.business.applicant.email,
        kycStatus: profile.status,
        profileLockStatus: profile.profileLockStatus,
        submittedAt: profile.submittedAt?.toISOString() ?? null,
        verifiedAt: profile.verifiedAt?.toISOString() ?? null,
      }))
    );
  } catch (error) {
    console.error("Error getting KYC queue:", error);
    return errorResponse("Failed to load KYC queue");
  }
}

export async function getKycProfileForAdmin(applicationId: number): Promise<ActionResponse<{
  profile: typeof kycProfiles.$inferSelect;
  application: typeof applications.$inferSelect;
  business: typeof businesses.$inferSelect;
  applicant: typeof applicants.$inferSelect;
  documents: typeof kycDocuments.$inferSelect[];
  fieldChanges: typeof kycFieldChanges.$inferSelect[];
  changeRequests: typeof kycChangeRequests.$inferSelect[];
}>> {
  try {
    const session = await auth();
    if (!isKycAdmin(session?.user?.role ?? null)) return errorResponse("Unauthorized");

    const profile = await db.query.kycProfiles.findFirst({
      where: eq(kycProfiles.applicationId, applicationId),
      with: {
        application: true,
        business: true,
        documents: true,
        fieldChanges: true,
        changeRequests: true,
      },
    });

    if (!profile) return errorResponse("KYC profile not found");

    const applicant = await db.query.applicants.findFirst({
      where: eq(applicants.id, profile.business.applicantId),
    });

    if (!applicant) return errorResponse("Applicant not found");

    return successResponse({
      profile,
      application: profile.application,
      business: profile.business,
      applicant,
      documents: profile.documents,
      fieldChanges: profile.fieldChanges,
      changeRequests: profile.changeRequests,
    });
  } catch (error) {
    console.error("Error loading admin KYC profile:", error);
    return errorResponse("Failed to load KYC profile");
  }
}

export async function reviewKycSubmission(input: KycReviewInput): Promise<ActionResponse<{ status: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isKycAdmin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const validated = kycReviewSchema.parse(input);
    const profile = await db.query.kycProfiles.findFirst({
      where: eq(kycProfiles.applicationId, validated.applicationId),
      with: {
        application: true,
        business: true,
      },
    });

    if (!profile) return errorResponse("KYC profile not found");

    if (validated.action !== "verify" && (!validated.reason || validated.reason.trim().length < 5)) {
      return errorResponse("A reason is required for this review action.");
    }

    const status = validated.action === "verify"
      ? "verified"
      : validated.action === "reject"
        ? "rejected"
        : "needs_info";
    const lockStatus = validated.action === "verify" ? "locked" : "unlocked";
    const verificationStatus = validated.action === "verify"
      ? "verified"
      : validated.action === "reject"
        ? "rejected"
        : "needs_info";

    await db.update(kycProfiles).set({
      status,
      profileLockStatus: lockStatus,
      reviewNotes: validated.reviewNotes ?? null,
      rejectionReason: validated.action === "reject" ? validated.reason ?? null : null,
      needsInfoReason: validated.action === "needs_info" ? validated.reason ?? null : null,
      reviewedAt: new Date(),
      verifiedAt: validated.action === "verify" ? new Date() : null,
      verifiedById: validated.action === "verify" ? session.user.id : null,
      lockedAt: validated.action === "verify" ? new Date() : null,
      lockedById: validated.action === "verify" ? session.user.id : null,
      updatedAt: new Date(),
    }).where(eq(kycProfiles.id, profile.id));

    await db.update(applications).set({
      kycStatus: status,
      kycVerifiedAt: validated.action === "verify" ? new Date() : null,
      kycVerifiedBy: validated.action === "verify" ? session.user.id : null,
      updatedAt: new Date(),
    }).where(eq(applications.id, profile.application.id));

    await db.update(businesses).set({
      verificationStatus,
      registrationType: validated.action === "verify"
        ? (profile.registrationTypeConfirmed ?? profile.business.registrationType)
        : profile.business.registrationType,
      revenueLastYear: validated.action === "verify"
        ? (profile.baselineRevenue ?? profile.business.revenueLastYear)
        : profile.business.revenueLastYear,
      fullTimeEmployeesTotal: validated.action === "verify"
        ? (profile.baselineEmployeeCount ?? profile.business.fullTimeEmployeesTotal)
        : profile.business.fullTimeEmployeesTotal,
      updatedAt: new Date(),
    }).where(eq(businesses.id, profile.business.id));

    revalidatePath("/admin/kyc");
    revalidatePath(`/admin/kyc/${validated.applicationId}`);
    revalidatePath("/kyc");
    revalidatePath("/profile");

    return successResponse({ status }, "KYC review saved");
  } catch (error) {
    console.error("Error reviewing KYC submission:", error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation failed: ${error.errors.map((item) => item.message).join(", ")}`);
    }
    return errorResponse("Failed to review KYC submission");
  }
}

export async function requestKycProfileChange(input: KycChangeRequestInput): Promise<ActionResponse<{ requestId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");

    const validated = kycChangeRequestSchema.parse(input);
    const profile = await db.query.kycProfiles.findFirst({
      where: eq(kycProfiles.userId, session.user.id),
    });

    if (!profile) return errorResponse("KYC profile not found");
    if (profile.profileLockStatus !== "locked") {
      return errorResponse("Change requests are only available after profile verification.");
    }

    const currentValue = (profile.submittedSnapshot as Record<string, unknown> | null)?.[validated.fieldName] ?? null;

    const [request] = await db.insert(kycChangeRequests).values({
      kycProfileId: profile.id,
      requestedById: session.user.id,
      fieldName: validated.fieldName,
      currentValue,
      requestedValue: validated.requestedValue,
      reason: validated.reason,
      status: "pending",
    }).returning();

    await db.update(kycProfiles).set({
      profileLockStatus: "change_requested",
      updatedAt: new Date(),
    }).where(eq(kycProfiles.id, profile.id));

    revalidatePath("/kyc");
    revalidatePath("/profile");
    revalidatePath("/admin/kyc");

    return successResponse({ requestId: request.id }, "Change request submitted");
  } catch (error) {
    console.error("Error requesting KYC profile change:", error);
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation failed: ${error.errors.map((item) => item.message).join(", ")}`);
    }
    return errorResponse("Failed to submit change request");
  }
}

export async function reviewKycChangeRequest(
  requestId: number,
  action: "approved" | "rejected",
  reviewNotes?: string
): Promise<ActionResponse<{ status: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isKycAdmin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const request = await db.query.kycChangeRequests.findFirst({
      where: eq(kycChangeRequests.id, requestId),
      with: {
        kycProfile: true,
      },
    });

    if (!request) return errorResponse("Change request not found");

    await db.update(kycChangeRequests).set({
      status: action,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes ?? null,
      updatedAt: new Date(),
    }).where(eq(kycChangeRequests.id, requestId));

    if (action === "approved") {
      const nextSnapshot = {
        ...((request.kycProfile.submittedSnapshot as Record<string, unknown>) ?? {}),
        [request.fieldName]: request.requestedValue,
      };

      const profileUpdate: Partial<typeof kycProfiles.$inferInsert> = {
        submittedSnapshot: nextSnapshot,
        profileLockStatus: "locked",
        updatedAt: new Date(),
      };

      if (request.fieldName === "baselineRevenue" && typeof request.requestedValue === "number") {
        profileUpdate.baselineRevenue = String(request.requestedValue);
      }
      if (request.fieldName === "baselineEmployeeCount" && typeof request.requestedValue === "number") {
        profileUpdate.baselineEmployeeCount = request.requestedValue;
      }
      if (request.fieldName === "registrationType" && typeof request.requestedValue === "string") {
        profileUpdate.registrationTypeConfirmed = request.requestedValue as typeof kycProfiles.$inferInsert["registrationTypeConfirmed"];
      }
      if (request.fieldName === "gpsCoordinates" && typeof request.requestedValue === "string") {
        profileUpdate.gpsCoordinates = request.requestedValue;
      }
      if (request.fieldName === "kraPin" && typeof request.requestedValue === "string") {
        profileUpdate.kraPin = request.requestedValue;
      }
      if (request.fieldName === "bankName" && typeof request.requestedValue === "string") {
        profileUpdate.bankName = request.requestedValue;
      }
      if (request.fieldName === "bankAccountName" && typeof request.requestedValue === "string") {
        profileUpdate.bankAccountName = request.requestedValue;
      }

      await db.update(kycProfiles).set(profileUpdate).where(eq(kycProfiles.id, request.kycProfileId));
    } else {
      await db.update(kycProfiles).set({
        profileLockStatus: "locked",
        updatedAt: new Date(),
      }).where(eq(kycProfiles.id, request.kycProfileId));
    }

    revalidatePath("/admin/kyc");
    revalidatePath("/kyc");
    revalidatePath("/profile");

    return successResponse({ status: action }, "Change request reviewed");
  } catch (error) {
    console.error("Error reviewing KYC change request:", error);
    return errorResponse("Failed to review change request");
  }
}
