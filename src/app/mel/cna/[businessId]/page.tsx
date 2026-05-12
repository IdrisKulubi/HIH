import { notFound } from "next/navigation";
import { AllRolesCnaBusinessPage } from "@/components/cna/AllRolesCnaBusinessPage";

export default async function MelCnaBusinessPage({
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
      backHref="/mel/cna"
      backLabel="Back to MEL CNA list"
    />
  );
}
