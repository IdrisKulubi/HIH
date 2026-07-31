import { auth } from "@/auth";
import { canManageMel, canViewMel } from "./roles";

export { canManageMel, canViewMel, MEL_MANAGE_ROLES, MEL_VIEW_ROLES } from "./roles";

export type MelActor = {
  id: string;
  role: string;
  canManage: boolean;
};

export async function requireMelViewer(): Promise<MelActor> {
  const session = await auth();
  const id = session?.user?.id;
  const role = session?.user?.role;

  if (!id || !canViewMel(role)) {
    throw new Error("MEL access required");
  }

  return { id, role, canManage: canManageMel(role) };
}

export async function requireMelManager(): Promise<MelActor> {
  const actor = await requireMelViewer();
  if (!actor.canManage) {
    throw new Error("MEL manager access required");
  }
  return actor;
}
