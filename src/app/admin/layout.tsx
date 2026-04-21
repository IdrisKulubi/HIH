import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminRoleGuard } from "@/components/admin/AdminRoleGuard";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

export const metadata: Metadata = {
  title: "Admin Dashboard | BIRE Programme",
  description: "Administration panel for the BIRE Programme program",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userRole = session?.user?.role || "";

  // Block non-admin users from accessing admin pages (except oversight)
  if (userRole !== "admin" && userRole !== "oversight") {
    // Redirect reviewers to their dashboard, others to home
    const isReviewer = ["reviewer_1", "reviewer_2", "technical_reviewer"].includes(userRole);
    redirect(isReviewer ? "/reviewer" : "/");
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Periodic role check runs every hour */}
      <AdminRoleGuard />
      <AdminNavbar />

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-6 bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          BIRE Programme Admin Panel © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
