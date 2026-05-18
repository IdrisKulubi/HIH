import Link from "next/link";
import { AllRolesCnaWorkspace } from "@/components/cna/AllRolesCnaWorkspace";
import { getCnaRoleWorkspace } from "@/lib/actions/role-cna";
import { CNA_REVIEWER_ROLES } from "@/lib/cna/role-based-types";

export async function AllRolesCnaBusinessPage({
  businessId,
  backHref,
  backLabel,
}: {
  businessId: number;
  backHref: string;
  backLabel: string;
}) {
  const results = await Promise.all(
    CNA_REVIEWER_ROLES.map((role) => getCnaRoleWorkspace(businessId, role))
  );

  const failed = results.find((result) => !result.success || !result.data);
  const allRoleWorkspaces = results.flatMap((result) => (result.success && result.data ? [result.data] : []));
  const ownWorkspace = failed ? await getCnaRoleWorkspace(businessId) : null;
  const workspaces =
    failed && ownWorkspace?.success && ownWorkspace.data
      ? [ownWorkspace.data]
      : allRoleWorkspaces;
  const loadError =
    failed && (!ownWorkspace?.success || !ownWorkspace.data)
      ? ownWorkspace?.error ?? failed.error
      : null;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Link href={backHref} className="text-sm font-medium text-sky-700 hover:underline">
        {backLabel}
      </Link>
      {loadError || workspaces.length === 0 ? (
        <p className="text-sm text-destructive">
          {loadError ?? "Failed to load CNA workspace"}
        </p>
      ) : (
        <AllRolesCnaWorkspace workspaces={workspaces} />
      )}
    </div>
  );
}
