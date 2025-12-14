import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply | BIRE Programme",
  description: "Application form for the BIRE Programme program",
};

export default function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 