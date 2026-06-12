import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Oversight | BIRE Programme",
};

export default async function OversightLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || !["admin", "oversight", "redo"].includes(role ?? "")) {
    redirect("/");
  }

  const home =
    role === "admin" ? "/admin" : role === "redo" || role === "oversight" ? "/oversight" : "/";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/oversight" className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck weight="fill" className="size-5 text-violet-600" />
            BIRE Programme · Oversight
          </Link>
          <Link
            href={home}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
