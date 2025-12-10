import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard | BIRE Programme",
  description: "Administration panel for the BIRE Programme program",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground ">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <Link href="/admin" className="font-bold text-xl">
            BIRE Programme Admin
          </Link>
          <nav>
            <ul className="flex space-x-8">
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/applications" className="hover:text-primary transition-colors">
                  Applications
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-primary transition-colors">
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/admin/scoring" className="hover:text-primary transition-colors">
                  Scoring
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
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
          BIRE Programme Admin Panel © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}