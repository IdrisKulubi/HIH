export const ENTERPRISE_EXPORT_SECTIONS = [
  { key: "profile", label: "Enterprise profile", description: "Enterprise, owner, location, track and KYC summary" },
  { key: "submissions", label: "Report history", description: "Periods, workflow status, collector and save dates" },
  { key: "responses", label: "Quarterly responses", description: "All questionnaire answers and financial results" },
  { key: "finance", label: "Finance accessed", description: "Funding types and individual amounts" },
  { key: "jobs", label: "Jobs", description: "Direct and indirect job disaggregation" },
  { key: "waste", label: "Waste", description: "Waste-management quantities by stream" },
  { key: "evidence", label: "Evidence index", description: "Uploaded and reused evidence with review status" },
  { key: "review", label: "Review and data quality", description: "Review decisions and DQA findings" },
  { key: "learning", label: "Learning actions", description: "Follow-up actions, ownership and status" },
] as const;

export type EnterpriseExportSection = (typeof ENTERPRISE_EXPORT_SECTIONS)[number]["key"];

export const ENTERPRISE_EXPORT_SECTION_KEYS = ENTERPRISE_EXPORT_SECTIONS.map((section) => section.key);

export function isEnterpriseExportSection(value: string): value is EnterpriseExportSection {
  return ENTERPRISE_EXPORT_SECTION_KEYS.some((key) => key === value);
}
