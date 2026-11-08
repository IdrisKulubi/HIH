export type WordCloudTerm = {
  text: string;
  value: number;
};

export type BuildWordCloudTermsOptions = {
  limit?: number;
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

const NONE_ONLY_PATTERN =
  /^(none(\s+observed)?|no(\s+(negative\s+)?(impacts?|effects?|challenges?|support)(\s+observed)?)?|n\/a|na|not\s+applicable|nil)$/i;

const FILLER_PHRASES = new Set([
  "in addition",
  "additionally",
  "also",
  "as well",
  "other",
  "others",
  "etc",
  "observed",
]);

const LEADING_FILLER = /^(and|or|plus|also|in addition|additionally)\s+/i;

function normalizeSegment(segment: string): string {
  return segment.replace(/\s+/g, " ").trim().toLowerCase();
}

function isNoneAnswer(text: string): boolean {
  return NONE_ONLY_PATTERN.test(normalizeSegment(text));
}

function cleanSegment(segment: string): string | null {
  let normalized = normalizeSegment(segment);
  if (!normalized) return null;
  if (isNoneAnswer(normalized)) return "none";

  while (LEADING_FILLER.test(normalized)) {
    normalized = normalized.replace(LEADING_FILLER, "").trim();
  }
  if (!normalized || normalized.length < 3) return null;
  if (isNoneAnswer(normalized)) return "none";
  if (FILLER_PHRASES.has(normalized) || STOP_WORDS.has(normalized)) return null;
  return normalized;
}

function extractSegments(text: string): string[] {
  const normalized = normalizeSegment(text);
  if (isNoneAnswer(normalized)) return ["none"];

  const segments: string[] = [];
  for (const part of text.split(/[,;\n.]+/)) {
    const cleaned = cleanSegment(part);
    if (cleaned) segments.push(cleaned);
  }
  return segments;
}

export function buildWordCloudTerms(
  texts: string[],
  options: BuildWordCloudTermsOptions = {}
): WordCloudTerm[] {
  const limit = options.limit ?? 24;
  const counts = new Map<string, number>();

  for (const raw of texts) {
    const text = raw?.trim();
    if (!text) continue;
    for (const segment of extractSegments(text)) {
      counts.set(segment, (counts.get(segment) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

export function buildFeedbackWordClouds(input: {
  positiveProgrammeImpacts: string[];
  mainChallenges: string[];
  additionalSupportNeeded: string[];
  negativeProgrammeImpacts: string[];
  limit?: number;
}): {
  positiveEffects: WordCloudTerm[];
  enterpriseChallenges: WordCloudTerm[];
  supportNeeded: WordCloudTerm[];
  negativeEffects: WordCloudTerm[];
} {
  const limit = input.limit ?? 30;
  return {
    positiveEffects: buildWordCloudTerms(input.positiveProgrammeImpacts, { limit }),
    enterpriseChallenges: buildWordCloudTerms(input.mainChallenges, { limit }),
    supportNeeded: buildWordCloudTerms(input.additionalSupportNeeded, { limit }),
    negativeEffects: buildWordCloudTerms(input.negativeProgrammeImpacts, { limit }),
  };
}
