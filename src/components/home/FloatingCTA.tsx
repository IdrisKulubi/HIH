"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function FloatingCTA() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show button after scrolling down 100px
            if (window.scrollY > 100) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className={cn(
                "fixed bottom-8 right-8 z-50 transition-all duration-500 transform",
                isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-20 opacity-0 pointer-events-none"
            )}
        >
            <Link
                href="/apply"
                className="group relative flex items-center gap-3 px-6 py-4 overflow-hidden rounded-full 
        bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] 
        hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.47)] transition-all duration-300"
            >
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <span className="font-semibold text-gray-900 dark:text-white text-lg tracking-wide">
                    Apply Now
                </span>
                <div className="bg-brand-blue rounded-full p-1.5 text-white shadow-lg group-hover:bg-brand-blue transition-colors">
                    <ArrowRightIcon className="w-5 h-5" />
                </div>
            </Link>
        </div>
    );
}
