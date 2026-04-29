import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleCnaWorkspace } from "@/components/cna/RoleCnaWorkspace";
import { getCnaRoleWorkspace } from "@/lib/actions/role-cna";

export default async function BdsCnaBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: idStr } = await params;
  const businessId = Number(idStr);
  if (!Number.isFinite(businessId)) notFound();

  const workspace = await getCnaRoleWorkspace(businessId, "bds_edo");

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Link href="/bds/cna" className="text-sm font-medium text-sky-700 hover:underline">
        Back to BDS / EDO CNA list
      </Link>
      {!workspace.success || !workspace.data ? (
        <p className="text-sm text-destructive">{workspace.error ?? "Failed to load CNA workspace"}</p>
      ) : (
        <RoleCnaWorkspace workspace={workspace.data} />
      )}
    </div>
  );
}
