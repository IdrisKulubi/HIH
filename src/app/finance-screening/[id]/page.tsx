import { notFound } from "next/navigation";
import { getPreScreeningWorkspace } from "@/lib/actions/a2f-pre-screening";
import { ScreeningForm } from "./screening-form";

export default async function ScreeningWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPreScreeningWorkspace(Number(id));
  if (!result.success || !result.data) notFound();
  return <ScreeningForm workspace={result.data} />;
}

