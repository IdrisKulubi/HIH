/** Documents uploaded during the original application (business row URLs), for KYC read-only + admin cross-check. */

export type ApplicationPhaseDocument = {
  id: string;
  label: string;
  fileUrl: string;
  fileName?: string;
  /** Aligns with KYC document types for admin pairing hints */
  compareHint?: "tax_compliance" | "registration" | "financial" | "other";
};

function fileNameFromUrl(url: string): string | undefined {
  try {
    const base = new URL(url).pathname.split("/").filter(Boolean).pop();
    return base && base.length > 0 ? decodeURIComponent(base) : undefined;
  } catch {
    return undefined;
  }
}

type BusinessDocFields = {
  registrationCertificateUrl?: string | null;
  taxComplianceUrl?: string | null;
  auditedAccountsUrl?: string | null;
  financialRecordsUrl?: string | null;
  complianceDocumentsUrl?: string | null;
  salesEvidenceUrl?: string | null;
  photosUrl?: string | null;
};

const DOC_DEFS: Array<{
  id: string;
  label: string;
  pick: (b: BusinessDocFields) => string | null | undefined;
  compareHint?: ApplicationPhaseDocument["compareHint"];
}> = [
  {
    id: "registration_certificate",
    label: "Registration certificate (application)",
    pick: (b) => b.registrationCertificateUrl,
    compareHint: "registration",
  },
  {
    id: "tax_compliance_application",
    label: "Tax compliance (application)",
    pick: (b) => b.taxComplianceUrl,
    compareHint: "tax_compliance",
  },
  {
    id: "audited_accounts",
    label: "Audited accounts (application)",
    pick: (b) => b.auditedAccountsUrl,
    compareHint: "financial",
  },
  {
    id: "financial_records",
    label: "Financial records (application)",
    pick: (b) => b.financialRecordsUrl,
    compareHint: "financial",
  },
  {
    id: "compliance_documents",
    label: "Compliance documents (application)",
    pick: (b) => b.complianceDocumentsUrl,
    compareHint: "other",
  },
  {
    id: "sales_evidence",
    label: "Sales evidence (application)",
    pick: (b) => b.salesEvidenceUrl,
    compareHint: "other",
  },
  {
    id: "photos",
    label: "Photos (application)",
    pick: (b) => b.photosUrl,
    compareHint: "other",
  },
];

/** For admin hints when comparing KYC uploads to application-phase files. */
export function kycDocumentTypeCompareHint(
  documentType: string
): ApplicationPhaseDocument["compareHint"] | undefined {
  switch (documentType) {
    case "tax_compliance_certificate":
      return "tax_compliance";
    case "cr12":
      return "registration";
    case "letter_of_agreement":
      return "other";
    case "national_id_document":
      return "other";
    default:
      return "other";
  }
}

export function buildApplicationDocumentsFromBusiness(business: BusinessDocFields): ApplicationPhaseDocument[] {
  const out: ApplicationPhaseDocument[] = [];
  for (const def of DOC_DEFS) {
    const raw = def.pick(business);
    const fileUrl = typeof raw === "string" ? raw.trim() : "";
    if (!fileUrl) continue;
    out.push({
      id: def.id,
      label: def.label,
      fileUrl,
      fileName: fileNameFromUrl(fileUrl),
      compareHint: def.compareHint,
    });
  }
  return out;
}
