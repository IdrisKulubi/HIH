"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  businesses,
  cnaDiagnostics,
  cnaScores,
  type CnaDiagnostic,
  type CnaScore,
} from "@/db/schema";
import { computeFullCnaSurveyOutputs } from "@/lib/cna/compute-cna-outputs";
import { CDP_FOCUS_CODES, cdpFocusCodeSchema, score0to5to10Schema } from "@/lib/cdp/focus-areas";
import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

const cnaSurveyRowSchema = z
  .object({
    focusCode: cdpFocusCodeSchema,
    score0to10: score0to5to10Schema,
    gapReason: z.string().max(8000).optional().nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.score0to10 === 0 || row.score0to10 === 5) {
      if (!String(row.gapReason ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Focus ${row.focusCode}: a reason is required when the score is 0 or 5.`,
          path: ["gapReason"],
        });
      }
    }
  });

const saveCnaSchema = z.object({
  businessId: z.number().int().positive(),
  rows: z
    .array(cnaSurveyRowSchema)
    .length(12)
    .refine(
      (rows) => new Set(rows.map((r) => r.focusCode)).size === 12,
      "Each focus code A–L must appear exactly once."
    ),
});

export type CnaDiagnosticWithScores = CnaDiagnostic & { cnaScores: CnaScore[] };

export async function saveCnaDiagnosticFromForm(
  _prev: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  const businessId = Number(formData.get("businessId"));
  const rows = CDP_FOCUS_CODES.map((focusCode) => ({
    focusCode,
    score0to10: Number(formData.get(`score_${focusCode}`)) as 0 | 5 | 10,
    gapReason: String(formData.get(`gap_${focusCode}`) ?? "") || null,
  }));
  return saveCnaDiagnostic({ businessId, rows });
}

export async function saveCnaDiagnostic(
  input: z.infer<typeof saveCnaSchema>
): Promise<ActionResponse<{ id: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const parsed = saveCnaSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message;
      return errorResponse(msg ?? "Invalid CNA survey.");
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, parsed.data.businessId),
    });
    if (!business) return errorResponse("Business not found");

    const { topRiskArea, resilienceIndex } = computeFullCnaSurveyOutputs(parsed.data.rows);

    const id = await db.transaction(async (tx) => {
      const [diag] = await tx
        .insert(cnaDiagnostics)
        .values({
          businessId: parsed.data.businessId,
          conductedById: session.user.id,
          financialManagementScore: null,
          marketReachScore: null,
          operationsScore: null,
          complianceScore: null,
          topRiskArea,
          resilienceIndex,
        })
        .returning({ id: cnaDiagnostics.id });

      for (const r of parsed.data.rows) {
        await tx.insert(cnaScores).values({
          diagnosticId: diag.id,
          focusCode: r.focusCode,
          score0to10: r.score0to10,
          gapReason: r.gapReason?.trim() || null,
        });
      }
      return diag.id;
    });

    revalidatePath("/admin/cna");
    revalidatePath(`/admin/cna/${parsed.data.businessId}`);
    return successResponse({ id });
  } catch (e) {
    console.error("saveCnaDiagnostic", e);
    return errorResponse("Failed to save diagnostic");
  }
}

export async function listCnaDiagnosticsForBusiness(
  businessId: number
): Promise<ActionResponse<CnaDiagnosticWithScores[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.cnaDiagnostics.findMany({
      where: eq(cnaDiagnostics.businessId, businessId),
      orderBy: [desc(cnaDiagnostics.conductedAt)],
      with: {
        cnaScores: { orderBy: [asc(cnaScores.focusCode)] },
      },
    });
    return successResponse(rows as CnaDiagnosticWithScores[]);
  } catch (e) {
    console.error("listCnaDiagnosticsForBusiness", e);
    return errorResponse("Failed to load diagnostics");
  }
}

export type BusinessListRow = {
  businessId: number;
  businessName: string;
  applicantName: string;
  applicantEmail: string;
  /** `business_sector` enum value */
  sector: string;
};

export async function listBusinessesWithApplicantForAdmin(): Promise<
  ActionResponse<BusinessListRow[]>
> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.businesses.findMany({
      orderBy: (b, { asc }) => [asc(b.name)],
      with: {
        applicant: true,
      },
    });

    const data: BusinessListRow[] = rows.map((b) => ({
      businessId: b.id,
      businessName: b.name,
      applicantName: `${b.applicant.firstName} ${b.applicant.lastName}`.trim(),
      applicantEmail: b.applicant.email,
      sector: b.sector,
    }));

    return successResponse(data);
  } catch (e) {
    console.error("listBusinessesWithApplicantForAdmin", e);
    return errorResponse("Failed to load businesses");
  }
}
