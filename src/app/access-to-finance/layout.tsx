import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Coins, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
    title: "Access to Finance | BIRE Programme",
    description: "Matching Grant application and agreement portal for enterprises",
};

export default async function AccessToFinanceLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await auth();
    const role = session?.user?.role ?? "";

    if (!session?.user) {
        redirect("/login");
    }

    if (role !== "applicant" && role !== "admin") {
        redirect("/");
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b bg-teal-800 text-white shadow-sm">
                <div className="container mx-auto py-3 px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Coins weight="fill" className="size-5 text-teal-300" />
                        <span className="font-semibold">Access to Finance</span>
                    </div>
                    <Link
                        href="/profile"
                        className="text-sm text-teal-200 hover:text-white flex items-center gap-1"
                    >
                        <ArrowLeft className="size-3.5" />
                        Profile
                    </Link>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
