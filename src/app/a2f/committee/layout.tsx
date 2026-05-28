import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Scales, Kanban, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { hasA2fRole } from "@/lib/a2f-access";

export const metadata: Metadata = {
    title: "A2F Committee | BIRE Programme",
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
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b bg-violet-900 text-white shadow-md">
                <div className="container mx-auto py-3 px-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Scales weight="fill" className="size-5 text-violet-300" />
                        <span className="font-bold text-lg tracking-tight">
                            Access to Finance Committee
                        </span>
                    </div>

                    <nav>
                        <ul className="flex items-center gap-6 text-sm">
                            <li>
                                <Link
                                    href="/a2f/committee"
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                                >
                                    <Kanban weight="duotone" className="size-4" />
                                    Cases
                                </Link>
                            </li>
                            <li className="border-l border-violet-700 pl-6">
                                <Link
                                    href={isAdmin ? "/admin" : "/"}
                                    className="flex items-center gap-1.5 text-violet-300 hover:text-emerald-200 transition-colors"
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
        </div>
    );
}
