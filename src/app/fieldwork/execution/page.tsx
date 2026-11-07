import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getFieldworkExecutionWorkspace } from "@/lib/actions/fieldwork-execution";
import { FieldworkExecutionWorkspace } from "@/components/fieldwork/FieldworkExecutionWorkspace";
export default async function FieldworkExecutionPage(){const user=await getCurrentUser();if(!user)redirect("/auth/login");const result=await getFieldworkExecutionWorkspace();if(!result.success)return <main className="container mx-auto px-4 py-8 text-destructive">{result.error}</main>;return <FieldworkExecutionWorkspace {...result.data} />}
