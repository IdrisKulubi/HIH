export const MEL_VIEW_ROLES = ["admin", "mel", "oversight", "redo", "bds_edo"] as const;
export const MEL_MANAGE_ROLES = ["admin", "mel"] as const;

export type MelViewRole = (typeof MEL_VIEW_ROLES)[number];
export type MelManageRole = (typeof MEL_MANAGE_ROLES)[number];

export function canViewMel(role: string | null | undefined): role is MelViewRole {
  return MEL_VIEW_ROLES.includes(role as MelViewRole);
}

export function canManageMel(role: string | null | undefined): role is MelManageRole {
  return MEL_MANAGE_ROLES.includes(role as MelManageRole);
}
