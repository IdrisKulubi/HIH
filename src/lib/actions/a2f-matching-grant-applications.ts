"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fMatchingGrantApplications,
    a2fPipeline,
    businesses,
    capacityDevelopmentPlans,
    kycProfiles,
} from "../../../db/schema";
import { desc, eq } from "drizzle-orm";
import type {
    MgBusinessDocFields,
    MgCdpEvidenceRef,
    MgKycDocumentRef,
} from "@/lib/mg-supporting-documents";
import { revalidatePath } from "next/cache";
import { ActionResponse, errorResponse, successResponse } from "./types";
import {
    parseFinancialOverview,
    parseGovernanceCompliance,
    resolveAnnualRevenueForEligibility,
    serializeFinancialOverview,
    validateMatchingGrantSubmitFields,
    type MatchingGrantOfficialUse,
} from "@/lib/matching-grant-form-types";
import type { A2fEnterpriseTrack } from "@/lib/a2f-constants";
import {
    A2F_STAFF_ROLES,
    assertApplicantOwnsPipeline,
    assertMatchingGrantApplicationSubmitted,
    hasA2fStaffRead,
} from "@/lib/a2f-access";
import { canEditMatchingGrantApplication } from "@/lib/a2f-nav";
import { sendMatchingGrantSubmissionEmail } from "@/lib/email";

const A2F_ROLES = A2F_STAFF_ROLES;

export type MatchingGrantApplicationStatus = "draft" | "submitted";

export interface MatchingGrantApplicationInput {
    status?: MatchingGrantApplicationStatus;
    totalProjectAmount: number;
    bireGrantAmount: number;
    enterpriseContributionAmount: number;
    coInvestmentSource?: string;
    coInvestmentJustification?: string;
    projectTitle?: string;
    fundingNeed?: string;
    withoutGrantImpact?: string;
    capexOnlyConfirmed: boolean;
    enterpriseIdentification?: Record<string, unknown>;
    leadEntrepreneur?: Record<string, unknown>;
    programmeEngagement?: Record<string, unknown>;
    businessOverview?: Record<string, unknown>;
    financialOverview?: Record<string, unknown>;
    budgetItems?: Array<Record<string, unknown>>;
    otherFunding?: Record<string, unknown>;
    implementationMilestones?: Array<Record<string, unknown>>;
    financialProjections?: Record<string, unknown>;
    jobCreationPlan?: Array<Record<string, unknown>>;
    impact?: Record<string, unknown>;
    governanceCompliance?: Record<string, unknown>;
    supportingDocuments?: Array<Record<string, unknown>>;
    declaration?: Record<string, unknown>;
}

export interface MatchingGrantValidation {
    bireSharePct: number;
    enterpriseSharePct: number;
    warnings: string[];
}

export interface MatchingGrantDocumentSources {
    business: MgBusinessDocFields;
    kycDocuments: MgKycDocumentRef[];
    cdpEvidence: MgCdpEvidenceRef[];
    savedSupportingDocuments: unknown;
}

async function assertMatchingGrantReadAccess(
    role: string | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
    if (hasA2fStaffRead(role)) return { ok: true };
    if (role === "applicant") return { ok: true };
    return { ok: false, error: "Unauthorized" };
}

export async function getMatchingGrantDocumentSources(
    a2fId: number
): Promise<ActionResponse<MatchingGrantDocumentSources>> {
    try {
        const session = await auth();
        if (!session?.user) return errorResponse("Unauthorized");
        const readAuth = await assertMatchingGrantReadAccess(session.user.role);
        if (!readAuth.ok) return errorResponse(readAuth.error);
        if (session.user.role === "applicant") {
            const owned = await assertApplicantOwnsPipeline(session.user.id, a2fId);
            if (!owned.ok) return errorResponse(owned.error);
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: { business: true },
                },
            },
        });

        if (!pipeline?.application?.business) {
            return errorResponse("Pipeline entry or business not found");
        }

        const business = pipeline.application.business;
        const applicationId = pipeline.applicationId;
        const businessId = business.id;

        const [kycProfile, cdpPlan, mgApp] = await Promise.all([
            db.query.kycProfiles.findFirst({
                where: eq(kycProfiles.applicationId, applicationId),
                with: { documents: true },
            }),
            db.query.capacityDevelopmentPlans.findFirst({
                where: eq(capacityDevelopmentPlans.businessId, businessId),
                orderBy: [desc(capacityDevelopmentPlans.updatedAt)],
                with: { supportSessions: true },
            }),
            db.query.a2fMatchingGrantApplications.findFirst({
                where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
                columns: { supportingDocuments: true },
            }),
        ]);

        const cdpEvidence: MgCdpEvidenceRef[] = [];
        const seenUrls = new Set<string>();
        for (const sessionRow of cdpPlan?.supportSessions ?? []) {
            const files = (sessionRow.evidenceFiles ?? []) as Array<{ url?: string; name?: string }>;
            for (const file of files) {
                const url = typeof file.url === "string" ? file.url.trim() : "";
                if (!url || seenUrls.has(url)) continue;
                seenUrls.add(url);
                cdpEvidence.push({
                    url,
                    name: typeof file.name === "string" && file.name.trim()
                        ? file.name.trim()
                        : url.split("/").pop() ?? "Evidence file",
                });
            }
        }

        const kycDocuments: MgKycDocumentRef[] = (kycProfile?.documents ?? [])
            .filter((doc) => doc.fileUrl?.trim())
            .map((doc) => ({
                documentType: doc.documentType,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
            }));

        return successResponse({
            business: {
                registrationCertificateUrl: business.registrationCertificateUrl,
                taxComplianceUrl: business.taxComplianceUrl,
                auditedAccountsUrl: business.auditedAccountsUrl,
                financialRecordsUrl: business.financialRecordsUrl,
                complianceDocumentsUrl: business.complianceDocumentsUrl,
                salesEvidenceUrl: business.salesEvidenceUrl,
                photosUrl: business.photosUrl,
            },
            kycDocuments,
            cdpEvidence,
            savedSupportingDocuments: mgApp?.supportingDocuments ?? [],
        });
    } catch (error) {
        console.error("Error loading Matching Grant document sources:", error);
        return errorResponse("Failed to load document sources");
    }
}

export async function getMatchingGrantApplication(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user) return errorResponse("Unauthorized");
        const readAuth = await assertMatchingGrantReadAccess(session.user.role);
        if (!readAuth.ok) return errorResponse(readAuth.error);
        if (session.user.role === "applicant") {
            const owned = await assertApplicantOwnsPipeline(session.user.id, a2fId);
            if (!owned.ok) return errorResponse(owned.error);
        }

        const application = await db.query.a2fMatchingGrantApplications.findFirst({
            where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
            with: {
                submittedBy: { with: { userProfile: true } },
            },
        });

        return successResponse(application ?? null);
    } catch (error) {
        console.error("Error loading Matching Grant application:", error);
        return errorResponse("Failed to load Matching Grant application");
    }
}

export async function saveMatchingGrantApplication(
    a2fId: number,
    input: MatchingGrantApplicationInput
): Promise<ActionResponse<{ id: number; validation: MatchingGrantValidation }>> {
    try {
        const session = await auth();
        if (!session?.user) return errorResponse("Unauthorized");

        const isApplicant = session.user.role === "applicant";
        if (isApplicant) {
            const owned = await assertApplicantOwnsPipeline(session.user.id, a2fId);
            if (!owned.ok) return errorResponse(owned.error);
        } else if (!canEditMatchingGrantApplication(session.user.role)) {
            return errorResponse("You do not have permission to edit Matching Grant applications.");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: { business: { with: { applicant: true } } },
                },
            },
        });

        if (!pipeline) return errorResponse("A2F pipeline entry not found");
        if (pipeline.instrumentType !== "matching_grant") {
            return errorResponse("Matching Grant application can only be captured for Matching Grant pipeline entries.");
        }
        if (!pipeline.application?.track) {
            return errorResponse("Application track is required before saving a Matching Grant application.");
        }

        const validation = validateMatchingGrantApplication(input);
        const track = pipeline.application.track as A2fEnterpriseTrack;
        const fallbackRevenue = Number(pipeline.application.business?.revenueLastYear ?? 0);
        const submitError = validateMatchingGrantSubmitFields({
            status: input.status,
            track,
            capexOnlyConfirmed: input.capexOnlyConfirmed,
            enterpriseIdentification: input.enterpriseIdentification,
            leadEntrepreneur: input.leadEntrepreneur,
            financialOverview: input.financialOverview,
            budgetItems: input.budgetItems,
            declaration: input.declaration,
            fallbackRevenue,
        });
        if (submitError) return errorResponse(submitError);

        const parsedFinancial = parseFinancialOverview(input.financialOverview);
        const financialPayload = serializeFinancialOverview(
            parsedFinancial,
            track,
            fallbackRevenue
        );
        const resolvedRevenue = resolveAnnualRevenueForEligibility(parsedFinancial, fallbackRevenue);

        const values = {
            a2fId,
            track: pipeline.application.track,
            status: input.status ?? "draft",
            submittedById: session.user.id,
            totalProjectAmount: String(input.totalProjectAmount || 0),
            bireGrantAmount: String(input.bireGrantAmount || 0),
            enterpriseContributionAmount: String(input.enterpriseContributionAmount || 0),
            coInvestmentSource: input.coInvestmentSource ?? null,
            coInvestmentJustification: input.coInvestmentJustification ?? null,
            projectTitle: input.projectTitle ?? null,
            fundingNeed: input.fundingNeed ?? null,
            withoutGrantImpact: input.withoutGrantImpact ?? null,
            capexOnlyConfirmed: input.capexOnlyConfirmed,
            enterpriseIdentification: input.enterpriseIdentification ?? {},
            leadEntrepreneur: input.leadEntrepreneur ?? {},
            programmeEngagement: input.programmeEngagement ?? {},
            businessOverview: input.businessOverview ?? {},
            financialOverview: financialPayload,
            budgetItems: input.budgetItems ?? [],
            otherFunding: input.otherFunding ?? {},
            implementationMilestones: input.implementationMilestones ?? [],
            financialProjections: input.financialProjections ?? {},
            jobCreationPlan: input.jobCreationPlan ?? [],
            impact: input.impact ?? {},
            governanceCompliance: input.governanceCompliance ?? {},
            supportingDocuments: input.supportingDocuments ?? [],
            declaration: input.declaration ?? {},
            updatedAt: new Date(),
        };

        const existing = await db.query.a2fMatchingGrantApplications.findFirst({
            where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
        });

        if (isApplicant && existing?.status === "submitted") {
            return errorResponse(
                "This Matching Grant application has already been submitted and cannot be changed."
            );
        }

        let id: number;
        if (existing) {
            await db
                .update(a2fMatchingGrantApplications)
                .set(values)
                .where(eq(a2fMatchingGrantApplications.id, existing.id));
            id = existing.id;
        } else {
            const [inserted] = await db
                .insert(a2fMatchingGrantApplications)
                .values(values)
                .returning({ id: a2fMatchingGrantApplications.id });
            id = inserted.id;
        }

        if (resolvedRevenue > 0 && pipeline.application.business?.id) {
            await db
                .update(businesses)
                .set({
                    revenueLastYear: String(resolvedRevenue),
                    updatedAt: new Date(),
                })
                .where(eq(businesses.id, pipeline.application.business.id));
        }

        revalidatePath(`/a2f/${a2fId}`);
        revalidatePath(`/a2f/${a2fId}/scoring`);
        revalidatePath(`/a2f/${a2fId}/matching-grant`);
        revalidatePath(`/access-to-finance/application/${a2fId}`);
        revalidatePath("/profile");

        const isFirstSubmit =
            input.status === "submitted" && existing?.status !== "submitted";

        if (isFirstSubmit && isApplicant && pipeline.application?.business?.applicant) {
            const applicant = pipeline.application.business.applicant;
            const enterpriseName = pipeline.application.business.name;
            await sendMatchingGrantSubmissionEmail({
                userEmail: applicant.email,
                applicantName: `${applicant.firstName} ${applicant.lastName}`.trim(),
                businessName: enterpriseName,
                submissionDate: new Date().toISOString(),
            });
        }

        return successResponse(
            { id, validation },
            input.status === "submitted" ? "Matching Grant application submitted" : "Matching Grant application saved"
        );
    } catch (error) {
        console.error("Error saving Matching Grant application:", error);
        return errorResponse("Failed to save Matching Grant application");
    }
}

export async function saveMatchingGrantOfficialUse(
    a2fId: number,
    officialUse: MatchingGrantOfficialUse
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: { application: true },
        });

        if (!pipeline) return errorResponse("A2F pipeline entry not found");
        if (pipeline.instrumentType !== "matching_grant") {
            return errorResponse("Official-use fields apply only to Matching Grant pipeline entries.");
        }
        const submitted = await assertMatchingGrantApplicationSubmitted(a2fId);
        if (!submitted.ok) return errorResponse(submitted.error);
        if (!pipeline.application?.track) {
            return errorResponse("Application track is required before saving official-use fields.");
        }

        const officerName =
            session.user.name
            || [session.user.firstName, session.user.lastName].filter(Boolean).join(" ")
            || session.user.email
            || "";

        const signOffAt =
            officialUse.reviewerSignOff.trim() && !officialUse.reviewerSignOffAt.trim()
                ? new Date().toISOString().slice(0, 10)
                : officialUse.reviewerSignOffAt;

        const payload: MatchingGrantOfficialUse = {
            ...officialUse,
            receivedBy: officialUse.receivedBy.trim() || officerName,
            reviewerSignOffAt: signOffAt,
            referenceNumber: officialUse.referenceNumber.trim() || `MG-${a2fId}`,
        };

        const existing = await db.query.a2fMatchingGrantApplications.findFirst({
            where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
        });

        const governance = parseGovernanceCompliance(
            (existing?.governanceCompliance ?? {}) as Record<string, unknown>
        );
        const governancePayload = {
            ...governance,
            officialUse: payload,
        };

        let id: number;
        if (existing) {
            await db
                .update(a2fMatchingGrantApplications)
                .set({
                    governanceCompliance: governancePayload,
                    updatedAt: new Date(),
                })
                .where(eq(a2fMatchingGrantApplications.id, existing.id));
            id = existing.id;
        } else {
            const [inserted] = await db
                .insert(a2fMatchingGrantApplications)
                .values({
                    a2fId,
                    track: pipeline.application.track,
                    status: "draft",
                    submittedById: session.user.id,
                    totalProjectAmount: "0",
                    bireGrantAmount: "0",
                    enterpriseContributionAmount: "0",
                    capexOnlyConfirmed: false,
                    governanceCompliance: governancePayload,
                    updatedAt: new Date(),
                })
                .returning({ id: a2fMatchingGrantApplications.id });
            id = inserted.id;
        }

        revalidatePath(`/a2f/${a2fId}`);
        revalidatePath(`/a2f/${a2fId}/matching-grant`);

        return successResponse({ id }, "Official-use record saved");
    } catch (error) {
        console.error("Error saving Matching Grant official-use fields:", error);
        return errorResponse("Failed to save official-use fields");
    }
}

function validateMatchingGrantApplication(input: MatchingGrantApplicationInput): MatchingGrantValidation {
    const total = Number(input.totalProjectAmount || 0);
    const bire = Number(input.bireGrantAmount || 0);
    const enterprise = Number(input.enterpriseContributionAmount || 0);
    const bireSharePct = total > 0 ? Math.round((bire / total) * 1000) / 10 : 0;
    const enterpriseSharePct = total > 0 ? Math.round((enterprise / total) * 1000) / 10 : 0;
    const warnings: string[] = [];

    if (total <= 0) warnings.push("Total project amount must be greater than zero.");
    if (Math.abs(total - (bire + enterprise)) > 1) {
        warnings.push("BIRE grant and enterprise contribution should add up to the total project amount.");
    }
    if (bireSharePct > 70) {
        warnings.push("BIRE grant share is above the standard 70% guidance and needs investment-case justification.");
    }
    if (enterpriseSharePct < 30) {
        warnings.push("Enterprise contribution is below the standard 30% guidance and needs investment-case justification.");
    }
    if (!input.capexOnlyConfirmed) {
        warnings.push("CAPEX-only confirmation is still pending.");
    }

    return { bireSharePct, enterpriseSharePct, warnings };
}
