import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply | In-Country YouthAdapt Challenge",
  description: "Application form for the In-country YouthAdapt Challenge program",
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