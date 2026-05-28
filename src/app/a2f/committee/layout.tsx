import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasA2fRole } from "@/lib/a2f-access";
import { CommitteeShellHeader } from "@/components/a2f/committee/CommitteeShellHeader";

export const metadata: Metadata = {
    title: "A2F Committee | Hand in Hand",
    description: "Access to Finance Committee review dashboard",
};

export default async function A2fCommitteeLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await auth();
    const userRole = session?.user?.role || "";

    if (!hasA2fRole(userRole, "committee")) {
        if (userRole === "a2f_officer") {
            redirect("/a2f");
        }
        redirect("/");
    }

    const isAdmin = userRole === "admin";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/80 text-foreground">
            <CommitteeShellHeader isAdmin={isAdmin} />

            <main className="flex-1">{children}</main>

            <footer className="border-t border-slate-200 bg-white py-4">
                <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500">
                    <span>Hand in Hand Eastern Africa</span>
                    <span className="hidden sm:inline text-slate-300">·</span>
                    <span>Access to Finance Committee © {new Date().getFullYear()}</span>
                </div>
            </footer>
        </div>
    );
}
