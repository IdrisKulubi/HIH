"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export function AdminRoleGuard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        // Check immediately on mount
        const checkRole = () => {
            if (status === "loading") return;

            const role = session?.user?.role;
            if (role !== "admin") {
                console.warn("[AdminRoleGuard] Non-admin detected, redirecting...");
                const isReviewer = ["reviewer_1", "reviewer_2", "technical_reviewer"].includes(role || "");
                router.replace(isReviewer ? "/reviewer" : "/");
            }
        };

        checkRole();

        // Set up hourly check
        const intervalId = setInterval(checkRole, ONE_HOUR_MS);

        return () => clearInterval(intervalId);
    }, [session, status, router]);

    // This component renders nothing, it's purely for the side effect
    return null;
}
