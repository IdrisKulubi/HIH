import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFieldworkReportView } from "@/lib/actions/fieldwork-execution";
import { FieldworkReportForm } from "@/components/fieldwork/FieldworkReportForm";

export default async function FieldworkReportPage({ params }: { params: Promise<{ visitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const visitId = Number((await params).visitId);
  if (!Number.isInteger(visitId) || visitId <= 0) notFound();
  const result = await getFieldworkReportView(visitId);
  if (!result.success) return <main className="container mx-auto px-4 py-8 text-sm text-destructive" role="alert">{result.error}</main>;
  return <FieldworkReportForm {...result.data} />;
}
