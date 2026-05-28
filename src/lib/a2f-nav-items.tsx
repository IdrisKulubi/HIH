"use client";

import type { Icon } from "@phosphor-icons/react";
import {
    ChartLine,
    ClipboardText,
    CurrencyDollar,
    FileText,
    Handshake,
    House,
    Package,
    PenNib,
} from "@phosphor-icons/react";
import { getAllowedA2fNavSegments, type A2fNavSegment } from "@/lib/a2f-nav";

export type A2fNavItemDef = {
    segment: A2fNavSegment;
    label: string;
    href: string;
    icon: Icon;
    exact?: boolean;
};

export const A2F_NAV_ITEMS: readonly A2fNavItemDef[] = [
    { segment: "overview", label: "Overview", href: "", icon: House, exact: true },
    { segment: "matching-grant", label: "Application", href: "/matching-grant", icon: PenNib },
    { segment: "due-diligence", label: "Due diligence", href: "/due-diligence", icon: ClipboardText },
    { segment: "scoring", label: "Scoring", href: "/scoring", icon: ChartLine },
    { segment: "appraisal", label: "GAIR / IC", href: "/appraisal", icon: FileText },
    { segment: "contracts", label: "Agreement", href: "/contracts", icon: Handshake },
    { segment: "grant-management", label: "Grant management", href: "/grant-management", icon: Package },
    { segment: "disbursements", label: "Disbursements", href: "/disbursements", icon: CurrencyDollar },
] as const;

export function getA2fNavItemsForRole(role?: string | null): A2fNavItemDef[] {
    const segments = new Set(getAllowedA2fNavSegments(role));
    return A2F_NAV_ITEMS.filter((item) => segments.has(item.segment)).map((item) => {
        if (item.segment === "matching-grant" && role === "a2f_officer") {
            return { ...item, label: "Application (read-only)" };
        }
        if (item.segment === "matching-grant" && role === "oversight") {
            return { ...item, label: "Application (view)" };
        }
        return { ...item };
    });
}
