export type WordCloudTerm = {
  text: string;
  value: number;
};

export type BuildWordCloudTermsOptions = {
  limit?: number;
  dropNoneOnly?: boolean;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "etc",
  "na",
  "n/a",
  "no",
  "not",
  "none",
  "observed",
  "any",
  "has",
  "had",
  "was",
  "were",
  "this",
  "that",
  "their",
  "they",
  "we",
  "our",
  "been",
  "being",
  "have",
  "having",
]);

const NONE_ONLY_PATTERN = /^(none(\s+observed)?|no(\s+negative\s+impacts?)?|n\/a|na|not\s+applicable)$/i;

function normalizeSegment(segment: string): string {
  return segment.replace(/\s+/g, " ").trim().toLowerCase();
}

function isUsefulSegment(segment: string, dropNoneOnly: boolean): boolean {
  const normalized = normalizeSegment(segment);
  if (normalized.length < 3) return false;
  if (dropNoneOnly && NONE_ONLY_PATTERN.test(normalized)) return false;
  if (STOP_WORDS.has(normalized)) return false;
  return true;
}

function extractSegments(text: string, dropNoneOnly: boolean): string[] {
  return text
    .split(/[,;\n.]+/)
    .map((segment) => normalizeSegment(segment))
    .filter((segment) => isUsefulSegment(segment, dropNoneOnly));
}

export function buildWordCloudTerms(
  texts: string[],
  options: BuildWordCloudTermsOptions = {}
): WordCloudTerm[] {
  const limit = options.limit ?? 30;
  const dropNoneOnly = options.dropNoneOnly ?? false;
  const counts = new Map<string, number>();

  for (const raw of texts) {
    const text = raw?.trim();
    if (!text) continue;
    for (const segment of extractSegments(text, dropNoneOnly)) {
      counts.set(segment, (counts.get(segment) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

export function buildFeedbackWordClouds(input: {
  mainChallenges: string[];
  additionalSupportNeeded: string[];
  negativeProgrammeImpacts: string[];
  limit?: number;
}): {
  enterpriseChallenges: WordCloudTerm[];
  supportNeeded: WordCloudTerm[];
  negativeEffects: WordCloudTerm[];
} {
  const limit = input.limit ?? 30;
  return {
    enterpriseChallenges: buildWordCloudTerms(input.mainChallenges, { limit }),
    supportNeeded: buildWordCloudTerms(input.additionalSupportNeeded, { limit }),
    negativeEffects: buildWordCloudTerms(input.negativeProgrammeImpacts, { limit, dropNoneOnly: true }),
  };
}
