"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ProfileSubmissionNotice() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const shown = useRef(false);

    useEffect(() => {
        if (shown.current) return;
        if (searchParams.get("mg_submitted") !== "1") return;

        shown.current = true;
        toast.success("Matching Grant application submitted", {
            description:
                "Check your email for confirmation. Your grant agreement will appear here once the programme sends it.",
            duration: 8000,
        });

        const params = new URLSearchParams(searchParams.toString());
        params.delete("mg_submitted");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchParams, router, pathname]);

    return null;
}
