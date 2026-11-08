import Link from "next/link";
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

  return (
    <div>
      <div className="border-b bg-white">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/profile"
            className="text-sm font-medium text-slate-600 hover:text-[#005EB8]"
          >
            Profile
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/dashboard/learning"
            className="text-sm font-semibold text-[#005EB8]"
          >
            Learning (LMS)
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
