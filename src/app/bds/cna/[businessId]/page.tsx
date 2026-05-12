import { notFound } from "next/navigation";
import { AllRolesCnaBusinessPage } from "@/components/cna/AllRolesCnaBusinessPage";

export default async function BdsCnaBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: idStr } = await params;
  const businessId = Number(idStr);
  if (!Number.isFinite(businessId)) notFound();

  return (
    <AllRolesCnaBusinessPage
      businessId={businessId}
      backHref="/bds/cna"
      backLabel="Back to BDS / EDO CNA list"
    />
  );
}
