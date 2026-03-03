import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
    ChartLine,
    Kanban,
    FileText,
    ArrowLeft,
    Coins,
    TreeStructure,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
    title: "A2F Investment Portal | BIRE Programme",
    description: "Access to Finance & Investment Management Portal",
};

const A2F_ALLOWED_ROLES = ["admin", "a2f_officer", "oversight"];

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
                            <span className="font-bold text-lg tracking-tight">A2F Portal</span>
                        </div>
                        <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-800 rounded-full">
                            Investment Management
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
                            <li>
                                <Link
                                    href="/a2f?tab=scoring"
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                                >
                                    <ChartLine weight="duotone" className="size-4" />
                                    Scoring
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/a2f?tab=contracts"
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                                >
                                    <FileText weight="duotone" className="size-4" />
                                    Contracts
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/a2f?tab=disbursements"
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                                >
                                    <TreeStructure weight="duotone" className="size-4" />
                                    Disbursements
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
                    BIRE Programme — A2F & Investment Management Portal © {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
}
