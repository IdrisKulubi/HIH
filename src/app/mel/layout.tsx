import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Target } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "MEL | BIRE Programme",
};

export default async function MelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || role !== "mel") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/mel/cna" className="flex items-center gap-2 font-semibold text-slate-900">
            <Target weight="fill" className="size-5 text-brand-blue" />
            BIRE Programme · MEL
          </Link>
          <Link
            href="/mel/cna"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Back to hub
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="container mx-auto px-4 text-center text-xs text-slate-500">
          BIRE Programme · MEL © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
