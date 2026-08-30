import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/learning");
  }

  return children;
}
