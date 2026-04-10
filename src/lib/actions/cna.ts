"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { businesses, cnaDiagnostics, type CnaDiagnostic } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";
import { computeCnaOutputs } from "@/lib/cna/compute-cna-outputs";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

const scoreSchema = z.number().int().min(1).max(5);

const saveCnaSchema = z.object({
  businessId: z.number().int().positive(),
  financialManagementScore: scoreSchema,
  marketReachScore: scoreSchema,
  operationsScore: scoreSchema,
  complianceScore: scoreSchema,
});

export async function saveCnaDiagnosticFromForm(
  _prev: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  const businessId = Number(formData.get("businessId"));
  return saveCnaDiagnostic({
    businessId,
    financialManagementScore: Number(formData.get("financialManagementScore")),
    marketReachScore: Number(formData.get("marketReachScore")),
    operationsScore: Number(formData.get("operationsScore")),
    complianceScore: Number(formData.get("complianceScore")),
  });
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
      return errorResponse("Invalid CNA scores (each must be 1–5).");
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, parsed.data.businessId),
    });
    if (!business) return errorResponse("Business not found");

    const { topRiskArea, resilienceIndex } = computeCnaOutputs(parsed.data);

    const [row] = await db
      .insert(cnaDiagnostics)
      .values({
        businessId: parsed.data.businessId,
        conductedById: session.user.id,
        financialManagementScore: parsed.data.financialManagementScore,
        marketReachScore: parsed.data.marketReachScore,
        operationsScore: parsed.data.operationsScore,
        complianceScore: parsed.data.complianceScore,
        topRiskArea,
        resilienceIndex,
      })
      .returning({ id: cnaDiagnostics.id });

    revalidatePath("/admin/cna");
    revalidatePath(`/admin/cna/${parsed.data.businessId}`);
    return successResponse({ id: row.id });
  } catch (e) {
    console.error("saveCnaDiagnostic", e);
    return errorResponse("Failed to save diagnostic");
  }
}

export async function listCnaDiagnosticsForBusiness(
  businessId: number
): Promise<ActionResponse<CnaDiagnostic[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.cnaDiagnostics.findMany({
      where: eq(cnaDiagnostics.businessId, businessId),
      orderBy: [desc(cnaDiagnostics.conductedAt)],
    });
    return successResponse(rows);
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
    }));

    return successResponse(data);
  } catch (e) {
    console.error("listBusinessesWithApplicantForAdmin", e);
    return errorResponse("Failed to load businesses");
  }
}
