/**
 * Matching Grant supporting document checklist, resolution from programme sources, and serialization.
 * Client-safe — no server imports.
 */

import {
    buildApplicationDocumentsFromBusiness,
    type ApplicationPhaseDocument,
} from "@/lib/kyc-application-documents";
import { getKycDocumentLabel } from "@/lib/kyc/constants";

export type MgMandatoryLevel = "Yes" | "If applicable" | "If available";

export type MgDocumentSource = "mg" | "application" | "kyc" | "cdp";

export type MgSupportingDocumentRow = {
    document: string;
    mandatory: MgMandatoryLevel;
    url: string;
    fileName?: string;
    confirmed: boolean;
    source?: MgDocumentSource | null;
    sourceLabel?: string;
};

export type MgBusinessDocFields = {
    registrationCertificateUrl?: string | null;
    taxComplianceUrl?: string | null;
    auditedAccountsUrl?: string | null;
    financialRecordsUrl?: string | null;
    complianceDocumentsUrl?: string | null;
    salesEvidenceUrl?: string | null;
    photosUrl?: string | null;
};

export type MgKycDocumentRef = {
    documentType: string;
    fileUrl: string;
    fileName?: string | null;
};

export type MgCdpEvidenceRef = {
    url: string;
    name: string;
};

export const MG_SUPPORTING_DOCUMENT_CHECKLIST: Array<{
    document: string;
    mandatory: MgMandatoryLevel;
}> = [
    { document: "National ID / Passport of Lead Entrepreneur", mandatory: "Yes" },
    { document: "Certificate of Business Registration / Incorporation", mandatory: "Yes" },
    { document: "KRA PIN Certificate", mandatory: "Yes" },
    { document: "Business Permit / Trade Licence", mandatory: "Yes" },
    { document: "Bank / M-Pesa statements (last 6-12 months)", mandatory: "Yes" },
    { document: "Financial statements / management accounts", mandatory: "If applicable" },
    { document: "Business plan or executive summary", mandatory: "If applicable" },
    { document: "Market contracts, purchase orders, or LPOs", mandatory: "If available" },
];

const KYC_TYPES_BY_DOCUMENT: Record<string, string[]> = {
    "National ID / Passport of Lead Entrepreneur": ["national_id_document", "director_id_document"],
    "Certificate of Business Registration / Incorporation": ["cr12"],
    "KRA PIN Certificate": ["tax_compliance_certificate"],
    "Business Permit / Trade Licence": [],
    "Bank / M-Pesa statements (last 6-12 months)": ["bank_account_proof"],
    "Financial statements / management accounts": [],
    "Business plan or executive summary": ["additional_supporting_document"],
    "Market contracts, purchase orders, or LPOs": [],
};

const APPLICATION_IDS_BY_DOCUMENT: Record<string, string[]> = {
    "National ID / Passport of Lead Entrepreneur": [],
    "Certificate of Business Registration / Incorporation": ["registration_certificate"],
    "KRA PIN Certificate": ["tax_compliance_application"],
    "Business Permit / Trade Licence": ["compliance_documents"],
    "Bank / M-Pesa statements (last 6-12 months)": ["financial_records"],
    "Financial statements / management accounts": ["audited_accounts", "financial_records"],
    "Business plan or executive summary": [],
    "Market contracts, purchase orders, or LPOs": ["sales_evidence"],
};

function fileNameFromUrl(url: string): string | undefined {
    try {
        const base = new URL(url).pathname.split("/").filter(Boolean).pop();
        return base && base.length > 0 ? decodeURIComponent(base) : undefined;
    } catch {
        return undefined;
    }
}

function emptyRow(def: { document: string; mandatory: MgMandatoryLevel }): MgSupportingDocumentRow {
    return {
        document: def.document,
        mandatory: def.mandatory,
        url: "",
        fileName: undefined,
        confirmed: false,
        source: null,
        sourceLabel: undefined,
    };
}

function str(value: unknown): string {
    return value != null ? String(value).trim() : "";
}

function pickKyc(
    kycDocuments: MgKycDocumentRef[],
    types: string[]
): { url: string; fileName?: string; sourceLabel: string } | null {
    for (const type of types) {
        const doc = kycDocuments.find(
            (d) => d.documentType === type && str(d.fileUrl) !== ""
        );
        if (doc) {
            return {
                url: doc.fileUrl.trim(),
                fileName: doc.fileName?.trim() || fileNameFromUrl(doc.fileUrl),
                sourceLabel: `KYC — ${getKycDocumentLabel(type)}`,
            };
        }
    }
    return null;
}

function pickApplication(
    appDocs: ApplicationPhaseDocument[],
    ids: string[]
): { url: string; fileName?: string; sourceLabel: string } | null {
    for (const id of ids) {
        const doc = appDocs.find((d) => d.id === id);
        if (doc?.fileUrl) {
            return {
                url: doc.fileUrl,
                fileName: doc.fileName ?? fileNameFromUrl(doc.fileUrl),
                sourceLabel: `Application — ${doc.label}`,
            };
        }
    }
    return null;
}

function pickCdpUnused(
    cdpEvidence: MgCdpEvidenceRef[],
    usedUrls: Set<string>
): { url: string; fileName?: string; sourceLabel: string } | null {
    for (const file of cdpEvidence) {
        const url = str(file.url);
        if (!url || usedUrls.has(url)) continue;
        return {
            url,
            fileName: str(file.name) || fileNameFromUrl(url),
            sourceLabel: "CDP session evidence",
        };
    }
    return null;
}

export function defaultMgSupportingDocuments(): MgSupportingDocumentRow[] {
    return MG_SUPPORTING_DOCUMENT_CHECKLIST.map(emptyRow);
}

export function parseMgSupportingDocuments(raw: unknown): MgSupportingDocumentRow[] {
    const savedByDoc = new Map<string, MgSupportingDocumentRow>();
    if (Array.isArray(raw)) {
        for (const entry of raw) {
            const row = (entry ?? {}) as Record<string, unknown>;
            const document = str(row.document);
            if (!document) continue;
            const mandatoryRaw = str(row.mandatory);
            const mandatory = (MG_SUPPORTING_DOCUMENT_CHECKLIST.find((d) => d.document === document)?.mandatory
                ?? (mandatoryRaw === "Yes" || mandatoryRaw === "If applicable" || mandatoryRaw === "If available"
                    ? mandatoryRaw
                    : "If applicable")) as MgMandatoryLevel;
            const sourceRaw = str(row.source);
            const source = sourceRaw === "mg" || sourceRaw === "application" || sourceRaw === "kyc" || sourceRaw === "cdp"
                ? sourceRaw
                : null;
            savedByDoc.set(document, {
                document,
                mandatory,
                url: str(row.url),
                fileName: str(row.fileName) || undefined,
                confirmed: Boolean(row.confirmed),
                source,
                sourceLabel: str(row.sourceLabel) || undefined,
            });
        }
    }

    return MG_SUPPORTING_DOCUMENT_CHECKLIST.map((def) => {
        const saved = savedByDoc.get(def.document);
        if (!saved) return emptyRow(def);
        return {
            ...emptyRow(def),
            ...saved,
            mandatory: def.mandatory,
            document: def.document,
        };
    });
}

export function serializeMgSupportingDocuments(
    rows: MgSupportingDocumentRow[]
): Array<Record<string, unknown>> {
    return rows.map((row) => ({
        document: row.document,
        mandatory: row.mandatory,
        url: row.url,
        fileName: row.fileName ?? "",
        confirmed: row.confirmed,
        source: row.source ?? null,
        sourceLabel: row.sourceLabel ?? "",
    }));
}

export function resolveMgDocumentSources(input: {
    business: MgBusinessDocFields;
    kycDocuments: MgKycDocumentRef[];
    cdpEvidence: MgCdpEvidenceRef[];
    savedRows?: MgSupportingDocumentRow[];
}): MgSupportingDocumentRow[] {
    const appDocs = buildApplicationDocumentsFromBusiness(input.business);
    const savedByDoc = new Map(
        (input.savedRows ?? []).map((row) => [row.document, row])
    );
    const usedUrls = new Set<string>();

    const rows: MgSupportingDocumentRow[] = [];

    for (const def of MG_SUPPORTING_DOCUMENT_CHECKLIST) {
        const saved = savedByDoc.get(def.document);
        if (saved?.url.trim()) {
            const row: MgSupportingDocumentRow = {
                ...emptyRow(def),
                ...saved,
                mandatory: def.mandatory,
                document: def.document,
            };
            rows.push(row);
            usedUrls.add(row.url.trim());
            continue;
        }

        const row = emptyRow(def);
        const kycTypes = KYC_TYPES_BY_DOCUMENT[def.document] ?? [];
        const appIds = APPLICATION_IDS_BY_DOCUMENT[def.document] ?? [];

        const kyc = pickKyc(input.kycDocuments, kycTypes);
        const app = kyc ? null : pickApplication(appDocs, appIds);
        const match = kyc ?? app;

        if (match) {
            row.url = match.url;
            row.fileName = match.fileName;
            row.source = kyc ? "kyc" : "application";
            row.sourceLabel = match.sourceLabel;
            row.confirmed = true;
            usedUrls.add(match.url);
        } else {
            const cdp = pickCdpUnused(input.cdpEvidence, usedUrls);
            if (cdp) {
                row.url = cdp.url;
                row.fileName = cdp.fileName;
                row.source = "cdp";
                row.sourceLabel = cdp.sourceLabel;
                row.confirmed = true;
                usedUrls.add(cdp.url);
            }
        }

        rows.push(row);
    }

    return rows;
}

export function countMandatoryMgDocumentsEnclosed(rows: MgSupportingDocumentRow[]): {
    enclosed: number;
    total: number;
} {
    const mandatory = rows.filter((r) => r.mandatory === "Yes");
    const enclosed = mandatory.filter((r) => r.url.trim() && r.confirmed).length;
    return { enclosed, total: mandatory.length };
}

export function validateMandatoryMgDocuments(rows: MgSupportingDocumentRow[]): string[] {
    const errors: string[] = [];
    for (const row of rows) {
        if (row.mandatory !== "Yes") continue;
        if (!row.url.trim()) {
            errors.push(`${row.document}: upload or link a file before submitting.`);
        } else if (!row.confirmed) {
            errors.push(`${row.document}: mark as enclosed before submitting.`);
        }
    }
    return errors;
}
