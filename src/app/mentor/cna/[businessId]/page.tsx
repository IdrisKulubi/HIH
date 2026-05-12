import { notFound } from "next/navigation";
import { AllRolesCnaBusinessPage } from "@/components/cna/AllRolesCnaBusinessPage";

export default async function MentorCnaBusinessPage({
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
      backHref="/mentor/cna"
      backLabel="Back to mentor CNA list"
    />
  );
}
