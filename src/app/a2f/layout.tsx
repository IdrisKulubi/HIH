import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Coins, Kanban, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
    title: "Matching Grant Portal | BIRE Programme",
    description: "Matching Grant investment management portal",
};

const A2F_ALLOWED_ROLES = ["admin", "a2f_officer", "oversight", "redo", "bds_edo"];

export default async function A2fLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await auth();
    const userRole = session?.user?.role || "";

    if (!A2F_ALLOWED_ROLES.includes(userRole)) {
        if (["reviewer_1", "reviewer_2", "technical_reviewer"].includes(userRole)) {
            redirect("/reviewer");
        }
        redirect("/");
    }

    const isAdmin = userRole === "admin";

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b bg-emerald-900 text-white shadow-md">
                <div className="container mx-auto py-3 px-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Coins weight="fill" className="size-5 text-emerald-300" />
                            <span className="font-bold text-lg tracking-tight">Matching Grant Portal</span>
                        </div>
                        <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-800 rounded-full hidden sm:inline">
                            BIRE Innovation Fund
                        </span>
                    </div>

                    <nav>
                        <ul className="flex items-center gap-6 text-sm">
                            <li>
                                <Link
                                    href="/a2f"
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                                >
                                    <Kanban weight="duotone" className="size-4" />
                                    Pipeline
                                </Link>
                            </li>
                            <li className="border-l border-emerald-700 pl-6">
                                <Link
                                    href={isAdmin ? "/admin" : "/"}
                                    className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition-colors"
                                >
                                    <ArrowLeft weight="bold" className="size-3.5" />
                                    {isAdmin ? "Admin" : "Home"}
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t py-4 bg-background">
                <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
                    BIRE Programme — Matching Grant Portal © {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
}
