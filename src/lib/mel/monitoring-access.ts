import { auth } from "@/auth";

export const MEL_COLLECTOR_ROLES = ["bds_edo", "redo", "admin"] as const;
export type MelCollectorRole = (typeof MEL_COLLECTOR_ROLES)[number];

export type MelMonitoringActor = {
  id: string;
  role: MelCollectorRole;
  canAccessAllEnterprises: boolean;
};

export function canCollectMel(role: string | null | undefined): role is MelCollectorRole {
  return MEL_COLLECTOR_ROLES.includes(role as MelCollectorRole);
}

export async function requireMelCollector(): Promise<MelMonitoringActor> {
  const session = await auth();
  const id = session?.user?.id;
  const role = session?.user?.role;
  if (!id || !canCollectMel(role)) throw new Error("Enterprise monitoring access required");

  return {
    id,
    role,
    canAccessAllEnterprises: role === "admin" || role === "redo",
  };
}
