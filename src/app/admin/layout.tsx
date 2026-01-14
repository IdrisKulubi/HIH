import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";

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
  const isReviewer = ["reviewer_1", "reviewer_2", "technical_reviewer"].includes(userRole);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground ">
      {/* Only show admin navbar for non-reviewers */}
      {!isReviewer && (
        <header className="sticky top-16 z-40 border-b bg-slate-800 text-white shadow-md">
          <div className="container mx-auto py-4 px-4 flex justify-between items-center">
            <Link href="/admin" className="font-bold text-xl">
              BIRE Programme Admin
            </Link>
            <nav>
              <ul className="flex space-x-8">
                <li>
                  <Link href="/admin" className="text-white/80 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/admin/applications" className="text-white/80 hover:text-white transition-colors">
                    Applications
                  </Link>
                </li>
                <li>
                  <Link href="/admin/observation" className="text-amber-400 hover:text-amber-300 transition-colors">
                    Observation
                  </Link>
                </li>
                <li>
                  <Link href="/admin/analytics" className="text-white/80 hover:text-white transition-colors">
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/admin/scoring" className="text-white/80 hover:text-white transition-colors">
                    Scoring
                  </Link>
                </li>
                <li>
                  <Link href="/admin/review" className="text-white/80 hover:text-white transition-colors">
                    Review
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
      )}

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
