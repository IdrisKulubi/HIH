import { auth } from "@/auth";
import {
    getApplicantMatchingGrantApplication,
    getApplicantMatchingGrantDocumentSources,
    getApplicantPipelineEntry,
} from "@/lib/actions/a2f-applicant";
import {
    getMatchingGrantApplication,
    getMatchingGrantDocumentSources,
} from "@/lib/actions/a2f-matching-grant-applications";
import { getA2fPipelineEntry } from "@/lib/actions/a2f-pipeline";
import {
    buildMatchingGrantPdfModel,
    renderMatchingGrantApplicationPdf,
} from "@/lib/matching-grant-application-pdf";
import {
    hydrateMatchingGrantApplication,
    resolveMatchingGrantDocumentRows,
} from "@/lib/matching-grant-application-view";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function failureStatus(message: string): number {
    const lower = message.toLowerCase();
    if (lower.includes("unauthorized")) return 401;
    if (lower.includes("forbidden") || lower.includes("permission")) return 403;
    if (lower.includes("not found")) return 404;
    return 400;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const a2fId = Number(id);
        if (!Number.isInteger(a2fId) || a2fId <= 0) {
            return Response.json({ error: "Invalid application" }, { status: 400 });
        }

        const isApplicant = session.user.role === "applicant";
        const [entryRes, appRes, docSourcesRes] = await Promise.all(
            isApplicant
                ? [
                    getApplicantPipelineEntry(a2fId),
                    getApplicantMatchingGrantApplication(a2fId),
                    getApplicantMatchingGrantDocumentSources(a2fId),
                ]
                : [
                    getA2fPipelineEntry(a2fId),
                    getMatchingGrantApplication(a2fId),
                    getMatchingGrantDocumentSources(a2fId),
                ]
        );

        if (!entryRes.success || !entryRes.data) {
            const message = "message" in entryRes && entryRes.message
                ? entryRes.message
                : "Pipeline entry not found";
            return Response.json({ error: message }, { status: failureStatus(message) });
        }

        if (!appRes.success) {
            const message = appRes.error ?? "Unable to load this application";
            return Response.json({ error: message }, { status: failureStatus(message) });
        }

        const record = appRes.data ?? null;
        const documents = docSourcesRes.success && docSourcesRes.data
            ? resolveMatchingGrantDocumentRows(docSourcesRes.data)
            : null;
        const view = hydrateMatchingGrantApplication(entryRes.data, record, documents);
        const declaration = (record?.declaration ?? {}) as Record<string, unknown>;
        const model = buildMatchingGrantPdfModel(view, {
            pipelineRevenue: Number(entryRes.data.application?.business?.revenueLastYear ?? 0),
            track: entryRes.data.application?.track,
            returnReason: typeof record?.returnReason === "string" ? record.returnReason : null,
            updatedAt: record?.updatedAt,
            declarationAcceptedAt: declaration.acceptedAt,
        });
        const pdf = await renderMatchingGrantApplicationPdf(model);

        return new Response(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${model.fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Matching Grant application PDF failed", error);
        return Response.json({ error: "Could not create the application PDF" }, { status: 500 });
    }
}
