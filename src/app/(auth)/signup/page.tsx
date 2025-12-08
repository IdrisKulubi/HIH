import { AuthCard } from "@/components/auth/auth-card";
import { Suspense } from 'react'

function SignupPageContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <AuthCard defaultTab="signup" />
    </div>
  );
}

export default function SignupPage() {
    return (
        <Suspense>
            <SignupPageContent />
        </Suspense>
    )
} 