export type MelWorkflowStatus =
  | "draft"
  | "submitted"
  | "returned"
  | "resubmitted"
  | "redo_review"
  | "returned_by_redo"
  | "mel_review"
  | "returned_by_mel"
  | "approved"
  | "reopened"
  | "voided";

export type MelReviewDecision = "approve" | "return" | "reopen" | "void";
export type MelReviewActorRole = "redo" | "mel" | "admin";

export type ReviewTransitionInput = {
  status: MelWorkflowStatus;
  collectorRole: string;
  actorRole: MelReviewActorRole;
  actorId: string;
  collectorId: string;
  decision: MelReviewDecision;
};

export type ReviewTransition = {
  stage: "redo" | "mel" | "administrative";
  action: "advanced" | "returned" | "approved" | "reopened" | "voided";
  nextStatus: MelWorkflowStatus;
};

export function expectedReviewStage(
  status: MelWorkflowStatus,
  collectorRole: string
): "redo" | "mel" | null {
  if (status === "redo_review") return "redo";
  if (status === "mel_review") return "mel";
  if (status === "submitted" || status === "resubmitted") {
    return collectorRole === "bds_edo" ? "redo" : "mel";
  }
  return null;
}

export function resolveReviewTransition(input: ReviewTransitionInput): ReviewTransition {
  if (input.decision === "reopen") {
    if (!["mel", "admin"].includes(input.actorRole) || input.status !== "approved") {
      throw new Error("Only MEL or admin can reopen an approved report");
    }
    return { stage: "administrative", action: "reopened", nextStatus: "reopened" };
  }
  if (input.decision === "void") {
    if (!["mel", "admin"].includes(input.actorRole) || input.status === "voided") {
      throw new Error("Only MEL or admin can void an active report");
    }
    return { stage: "administrative", action: "voided", nextStatus: "voided" };
  }

  const stage = expectedReviewStage(input.status, input.collectorRole);
  if (!stage) throw new Error("This report is not waiting for review");
  if (stage === "redo" && !["redo", "admin"].includes(input.actorRole)) {
    throw new Error("REDO review access required");
  }
  if (stage === "mel" && !["mel", "admin"].includes(input.actorRole)) {
    throw new Error("MEL review access required");
  }
  if (input.actorId === input.collectorId) {
    throw new Error("A reviewer cannot approve or return their own report");
  }

  if (input.decision === "return") {
    return {
      stage,
      action: "returned",
      nextStatus: stage === "redo" ? "returned_by_redo" : "returned_by_mel",
    };
  }

  if (stage === "redo") {
    return { stage, action: "advanced", nextStatus: "mel_review" };
  }
  return { stage, action: "approved", nextStatus: "approved" };
}

export function isCollectorEditableStatus(status: MelWorkflowStatus): boolean {
  return ["draft", "returned", "returned_by_redo", "returned_by_mel", "reopened"].includes(status);
}
