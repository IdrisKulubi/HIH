"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CommitteeNav({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname();
    const onCases =
        pathname === "/a2f/committee" || pathname.startsWith("/a2f/committee/");

    return (
        <ul className="flex items-center gap-5 text-sm">
            <li>
                <Link
                    href="/a2f/committee"
                    className={cn(
                        "flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
                        onCases
                            ? "text-brand-blue font-semibold bg-brand-blue/10"
                            : "text-slate-600 hover:text-brand-blue hover:bg-slate-50"
                    )}
                >
                    <Kanban weight="duotone" className="size-4" />
                    Cases
                </Link>
            </li>
            <li className="border-l border-slate-200 pl-5">
                <Link
                    href={isAdmin ? "/admin" : "/"}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-brand-blue transition-colors"
                >
                    <ArrowLeft weight="bold" className="size-3.5" />
                    {isAdmin ? "Admin" : "Home"}
                </Link>
            </li>
        </ul>
    );
}
