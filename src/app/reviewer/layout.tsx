import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";

export const metadata: Metadata = {
    title: "Reviewer Dashboard | BIRE Programme",
    description: "Review panel for the BIRE Programme",
};

export default async function ReviewerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Check if user is a reviewer
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Only allow reviewer_1, reviewer_2, admin, and technical_reviewer
    const allowedRoles = ["reviewer_1", "reviewer_2", "admin", "technical_reviewer"];
    if (!allowedRoles.includes(user.role || "")) {
        redirect("/");
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <header className="sticky top-16 z-40 border-b bg-slate-800 text-white shadow-md">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <Link href="/reviewer" className="font-bold text-xl">
                        BIRE Programme Reviewer
                    </Link>
                    <nav>
                        <ul className="flex space-x-8">
                            <li>
                                <Link href="/reviewer" className="text-white/80 hover:text-white transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/reviewer/applications" className="text-white/80 hover:text-white transition-colors">
                                    Applications
                                </Link>
                            </li>
                            <li>
                                <Link href="/" className="text-white/80 hover:text-white transition-colors">
                                    Back to Site
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t py-6 bg-background">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    BIRE Programme Reviewer Panel © {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
}
