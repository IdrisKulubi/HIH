import { auth } from "@/auth";
import { getRoleHomePath } from "@/lib/users/role-home";
import { redirect } from "next/navigation";

export default async function PostLoginPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?tab=signin");
  }

  redirect(getRoleHomePath(session.user.role));
}
