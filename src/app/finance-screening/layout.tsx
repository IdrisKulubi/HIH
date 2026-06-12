import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ClipboardText, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "A2F Pre-Screening | BIRE Programme",
};

export default async function FinanceScreeningLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !["admin", "bds_edo", "redo"].includes(role ?? "")) {
    redirect("/");
  }

  const home = role === "admin" ? "/admin" : role === "redo" ? "/oversight" : "/bds/cna";
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-emerald-900 text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/finance-screening" className="flex items-center gap-2 font-semibold">
            <ClipboardText weight="fill" className="size-5 text-emerald-300" />
            A2F Pre-Screening
          </Link>
          <Link
            href={home}
            className="flex items-center gap-1 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="container mx-auto px-4 text-center text-xs text-slate-500">
          Hand in Hand Eastern Africa · A2F Pre-Screening © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
