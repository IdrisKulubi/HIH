import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard | YouthAdapt Challenge",
  description: "Administration panel for the YouthAdapt Challenge program",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

    
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <Link href="/admin" className="font-bold text-xl">
            In-Country YouthAdapt Admin
          </Link>
          <nav>
            <ul className="flex space-x-8">
              <li>
                <Link href="/admin" className="hover:underline">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/applications" className="hover:underline">
                  Applications
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:underline">
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/admin/scoring" className="hover:underline">
                  Scoring
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:underline">
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
         In-Country YouthAdapt Challenge Admin Panel © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 