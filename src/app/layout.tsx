import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { Providers } from "@/components/providers";
import { SmoothScroll } from "@/components/ui/smooth-scroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BIRE Portal - Building Inclusive & Resilient Enterprises",
  description: "Empowering Kenyan MSEs with funding, mentorship, and market access. A partnership between Hand in Hand Eastern Africa and the Embassy of Sweden.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Providers>
          <SmoothScroll>
            <Header />
            <Toaster />
            <ThemeProvider
              attribute="class"
              defaultTheme="light" // Switched to light default to match the new bright gradient
              enableSystem={false}
              disableTransitionOnChange
            >
              <main className="pt-16 min-h-screen">{children}</main>
            </ThemeProvider>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
