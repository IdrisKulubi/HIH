"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidePublicChrome = pathname.startsWith("/admin");

  return (
    <main className={cn("min-h-screen", !hidePublicChrome && "pt-16")}>
      {children}
    </main>
  );
}
