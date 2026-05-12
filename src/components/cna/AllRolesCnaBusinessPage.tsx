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
  const workspaces = results.flatMap((result) => (result.success && result.data ? [result.data] : []));

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Link href={backHref} className="text-sm font-medium text-sky-700 hover:underline">
        {backLabel}
      </Link>
      {failed || workspaces.length === 0 ? (
        <p className="text-sm text-destructive">
          {failed?.error ?? "Failed to load CNA workspace"}
        </p>
      ) : (
        <AllRolesCnaWorkspace workspaces={workspaces} />
      )}
    </div>
  );
}
