import { auth } from "@/auth";

export const MEL_REVIEW_ROLES = ["redo", "mel", "admin"] as const;
export type MelReviewRole = (typeof MEL_REVIEW_ROLES)[number];

export type MelReviewer = {
  id: string;
  role: MelReviewRole;
  canReviewRedo: boolean;
  canReviewMel: boolean;
  canAdminister: boolean;
};

export function canReviewMelReports(role: string | null | undefined): role is MelReviewRole {
  return MEL_REVIEW_ROLES.includes(role as MelReviewRole);
}

export async function requireMelReviewer(): Promise<MelReviewer> {
  const session = await auth();
  const id = session?.user?.id;
  const role = session?.user?.role;
  if (!id || !canReviewMelReports(role)) throw new Error("MEL review access required");

  return {
    id,
    role,
    canReviewRedo: role === "redo" || role === "admin",
    canReviewMel: role === "mel" || role === "admin",
    canAdminister: role === "mel" || role === "admin",
  };
}
