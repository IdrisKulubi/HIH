"use client";

import { AuthCard } from "@/components/auth/auth-card";

import { Suspense } from 'react'

import { useSearchParams } from "next/navigation";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-brand-red/5 rounded-full blur-[120px]"></div>

      <div className="relative z-10 w-full flex justify-center p-4">
        <AuthCard defaultTab={defaultTab} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
