export const legacyKycDocumentTypes = [
  "tax_compliance_certificate",
  "bank_account_proof",
  "programme_consent_form",
  "director_id_document",
  "additional_supporting_document",
] as const;

export const reviewerKycDocumentTypes = [
  "letter_of_agreement",
  "national_id_document",
  "cr12",
] as const;

export const allKycDocumentTypes = [
  ...legacyKycDocumentTypes,
  ...reviewerKycDocumentTypes,
] as const;

export type LegacyKycDocumentType = (typeof legacyKycDocumentTypes)[number];
export type ReviewerKycDocumentType = (typeof reviewerKycDocumentTypes)[number];
export type KycDocumentType = (typeof allKycDocumentTypes)[number];

export interface ReviewerKycDocumentDefinition {
  type: ReviewerKycDocumentType;
  label: string;
  required: boolean;
  description: string;
}

export const reviewerKycDocumentDefinitions: ReviewerKycDocumentDefinition[] = [
  {
    type: "letter_of_agreement",
    label: "Letter of Agreement",
    required: true,
    description: "Required before the reviewer can save this KYC record.",
  },
  {
    type: "national_id_document",
    label: "National ID",
    required: false,
    description: "Optional supporting identity document.",
  },
  {
    type: "cr12",
    label: "CR12",
    required: false,
    description: "Optional registration support document.",
  },
];

export const kycDocumentLabels: Record<KycDocumentType, string> = {
  tax_compliance_certificate: "Tax Compliance Certificate",
  bank_account_proof: "Bank Account Proof",
  programme_consent_form: "Programme Consent Form",
  director_id_document: "Director ID Document",
  additional_supporting_document: "Additional Supporting Document",
  letter_of_agreement: "Letter of Agreement",
  national_id_document: "National ID",
  cr12: "CR12",
};

export function getKycDocumentLabel(documentType: string): string {
  return kycDocumentLabels[documentType as KycDocumentType] ?? documentType.replace(/_/g, " ");
}

export function isReviewerKycDocumentType(documentType: string): documentType is ReviewerKycDocumentType {
  return reviewerKycDocumentTypes.includes(documentType as ReviewerKycDocumentType);
}
