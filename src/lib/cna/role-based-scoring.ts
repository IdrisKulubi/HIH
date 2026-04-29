import { CDP_FOCUS_CODES, priorityFromScore0to10 } from "@/lib/cdp/focus-areas";
import {
  CNA_REVIEWER_ROLES,
  type CnaAssessmentResult,
  type CnaQuestionForScoring,
  type CnaRating,
  type CnaResponseForScoring,
  type CnaRoleCompletion,
  type CnaSectionResult,
  type CnaWeightedResponse,
} from "./role-based-types";

const SCORE_DECIMALS = 4;

function roundScore(value: number) {
  const m = 10 ** SCORE_DECIMALS;
  return Math.round((value + Number.EPSILON) * m) / m;
}

export function ratingMultiplier(rating: CnaRating): number {
  switch (rating) {
    case "poor":
      return 0;
    case "fair":
      return 0.5;
    case "great":
      return 1;
  }
}

export function scoreQuestionResponse(rating: CnaRating, questionWeight: number): number {
  return roundScore(questionWeight * ratingMultiplier(rating));
}

export function computeQuestionWeights(
  questions: CnaQuestionForScoring[]
): Map<number, number> {
  const bySection = new Map<string, CnaQuestionForScoring[]>();
  for (const q of questions) {
    const rows = bySection.get(q.sectionCode) ?? [];
    rows.push(q);
    bySection.set(q.sectionCode, rows);
  }

  const weights = new Map<number, number>();
  for (const rows of bySection.values()) {
    const weight = rows.length > 0 ? roundScore(100 / rows.length) : 0;
    for (const q of rows) weights.set(q.id, weight);
  }
  return weights;
}

export function computeRoleBasedCnaResult(
  questions: CnaQuestionForScoring[],
  responses: CnaResponseForScoring[]
): CnaAssessmentResult {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const responseByQuestion = new Map(responses.map((r) => [r.questionId, r]));
  const weights = computeQuestionWeights(questions);

  const weightedResponses: CnaWeightedResponse[] = [];
  for (const response of responses) {
    const question = questionById.get(response.questionId);
    if (!question) continue;

    const questionWeight = weights.get(question.id) ?? 0;
    const scoreValue =
      response.scoreValue == null
        ? scoreQuestionResponse(response.ratingLabel, questionWeight)
        : roundScore(Number(response.scoreValue));

    weightedResponses.push({
      ...response,
      sectionCode: question.sectionCode,
      sectionName: question.sectionName,
      questionWeight,
      scoreValue,
    });
  }

  const sections: CnaSectionResult[] = [];
  for (const code of CDP_FOCUS_CODES) {
    const sectionQuestions = questions.filter((q) => q.sectionCode === code);
    if (sectionQuestions.length === 0) continue;

    const answered = sectionQuestions.filter((q) => responseByQuestion.has(q.id));
    const sectionName = sectionQuestions[0].sectionName;
    const sectionScore = roundScore(
      answered.reduce((sum, q) => {
        const response = responseByQuestion.get(q.id);
        if (!response) return sum;
        const questionWeight = weights.get(q.id) ?? 0;
        return sum + scoreQuestionResponse(response.ratingLabel, questionWeight);
      }, 0)
    );

    sections.push({
      sectionCode: code,
      sectionName,
      totalQuestions: sectionQuestions.length,
      answeredQuestions: answered.length,
      sectionScore,
      priorityLevel: priorityFromScore0to10(sectionScore / 10),
      isComplete: answered.length === sectionQuestions.length,
    });
  }

  const roleCompletions: CnaRoleCompletion[] = CNA_REVIEWER_ROLES.map((role) => {
    const roleQuestions = questions.filter((q) => q.assignedRole === role);
    const answeredQuestions = roleQuestions.filter((q) => responseByQuestion.has(q.id)).length;
    return {
      role,
      totalQuestions: roleQuestions.length,
      answeredQuestions,
      isComplete: answeredQuestions === roleQuestions.length,
    };
  }).filter((r) => r.totalQuestions > 0);

  const completedSections = sections.filter((s) => s.isComplete);
  const overallScore =
    completedSections.length === 0
      ? 0
      : roundScore(
          completedSections.reduce((sum, s) => sum + s.sectionScore, 0) /
            completedSections.length
        );

  const lowestScore = Math.min(...sections.map((s) => s.sectionScore));
  const topRiskAreas = Number.isFinite(lowestScore)
    ? sections.filter((s) => s.sectionScore === lowestScore)
    : [];

  return {
    sections,
    roleCompletions,
    overallScore,
    isComplete: sections.every((s) => s.isComplete),
    topRiskAreas,
    weightedResponses,
  };
}
