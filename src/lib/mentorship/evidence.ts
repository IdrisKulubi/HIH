export type MentorshipEvidenceFile = {
  key?: string;
  url: string;
  name: string;
  type: string;
  uploadedById: string | null;
  uploadedAt: string;
};

export const MAX_MENTORSHIP_EVIDENCE_FILES = 8;

export function normalizeMentorshipEvidenceFiles(
  value: unknown
): MentorshipEvidenceFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof item.url === "string"
    )
    .map((item) => ({
      key: typeof item.key === "string" ? item.key : undefined,
      url: String(item.url).trim(),
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Evidence",
      type: typeof item.type === "string" ? item.type : "application/octet-stream",
      uploadedById:
        typeof item.uploadedById === "string"
          ? item.uploadedById
          : item.uploadedById === null
            ? null
            : null,
      uploadedAt:
        typeof item.uploadedAt === "string" ? item.uploadedAt : new Date().toISOString(),
    }))
    .filter((item) => item.url.length > 0);
}

export function mentorshipEvidenceFilesFromLegacyUrl(
  photographicEvidenceUrl: string | null | undefined,
  evidenceFiles: unknown
): MentorshipEvidenceFile[] {
  const normalized = normalizeMentorshipEvidenceFiles(evidenceFiles);
  if (normalized.length > 0) return normalized;

  const legacy = photographicEvidenceUrl?.trim();
  if (!legacy) return [];

  return [
    {
      url: legacy,
      name: "Evidence",
      type: "application/octet-stream",
      uploadedById: null,
      uploadedAt: new Date().toISOString(),
    },
  ];
}

export function primaryMentorshipEvidenceUrl(
  files: MentorshipEvidenceFile[]
): string | null {
  return files[0]?.url ?? null;
}

export function formatMentorshipEvidenceUrls(
  files: MentorshipEvidenceFile[]
): string | null {
  if (files.length === 0) return null;
  return files.map((file) => file.url).join("; ");
}

export function parseMentorshipEvidenceFilesInput(
  raw: string | null | undefined
): MentorshipEvidenceFile[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return normalizeMentorshipEvidenceFiles(parsed).slice(0, MAX_MENTORSHIP_EVIDENCE_FILES);
  } catch {
    return [];
  }
}
