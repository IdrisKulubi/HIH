"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

const APPLICANT_TABS = new Set([
    "overview",
    "application",
    "progress",
    "support",
    "contracts",
]);

const REVIEWER_TABS = new Set(["overview", "support", "security"]);

function resolveTab(
    tabParam: string | null,
    isReviewer: boolean
): string {
    const allowed = isReviewer ? REVIEWER_TABS : APPLICANT_TABS;
    if (tabParam && allowed.has(tabParam)) return tabParam;
    return "overview";
}

export function ProfileTabs({
    children,
    isReviewer,
}: {
    children: React.ReactNode;
    isReviewer: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState(() =>
        resolveTab(tabParam, isReviewer)
    );

    useEffect(() => {
        setActiveTab(resolveTab(searchParams.get("tab"), isReviewer));
    }, [searchParams, isReviewer]);

    function handleTabChange(value: string) {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value === "overview") {
            params.delete("tab");
        } else {
            params.set("tab", value);
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    return (
        <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full space-y-8"
        >
            {children}
        </Tabs>
    );
}
