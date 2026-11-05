import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFieldworkWorkspace } from "@/lib/actions/fieldwork";
import { FieldworkWorkspace } from "@/components/fieldwork/FieldworkWorkspace";

export default async function FieldworkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const result = await getFieldworkWorkspace();
  if (!result.success) return <main className="container mx-auto px-4 py-8 text-sm text-destructive">{result.error}</main>;
  return <FieldworkWorkspace {...result.data} />;
}
