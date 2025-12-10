"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WarningCircle, House } from "@phosphor-icons/react/dist/ssr";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    let errorMessage = "An unknown error occurred during authentication.";
    let errorTitle = "Authentication Error";

    if (error === "Configuration") {
        errorTitle = "Configuration Error";
        errorMessage = "There is a problem with the server configuration. Please check if the authentication providers and secrets are correctly configured.";
    } else if (error === "AccessDenied") {
        errorTitle = "Access Denied";
        errorMessage = "You do not have permission to sign in.";
    } else if (error === "Verification") {
        errorTitle = "Verification Failed";
        errorMessage = "The verification link was invalid or has expired.";
    } else if (error) {
        errorMessage = `Error code: ${error}`;
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <WarningCircle className="w-8 h-8" weight="duotone" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorTitle}</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
                {errorMessage}
            </p>

            <div className="space-y-3">
                <Link
                    href="/login"
                    className="block w-full py-3 px-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-medium transition-colors"
                >
                    Try Again
                </Link>
                <Link
                    href="/"
                    className="block w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <House className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
                <ErrorContent />
            </Suspense>
        </div>
    );
}
