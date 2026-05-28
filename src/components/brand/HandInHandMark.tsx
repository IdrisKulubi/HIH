import { cn } from "@/lib/utils";

/** Vector Hand in Hand icon: brand-blue circle, white reaching hands. */
export function HandInHandMark({
    className,
    size = 40,
}: {
    className?: string;
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("shrink-0", className)}
            aria-hidden
        >
            <circle cx="24" cy="24" r="24" fill="#1da1db" />
            <path
                fill="#ffffff"
                d="M11.5 20.2c0-2.5 2-4.5 4.5-4.5.9 0 1.7.3 2.4.7.5-1.4 1.8-2.4 3.3-2.4 2 0 3.6 1.6 3.6 3.6v.9c.7-.4 1.5-.6 2.3-.6 2.5 0 4.5 2 4.5 4.5v7.2c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-4.6h-2.4v6.4c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-6.1h-2.2v5.4c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-8.8z"
            />
            <path
                fill="#ffffff"
                d="M17.8 33.5c0-2.5 2-4.5 4.5-4.5.9 0 1.7.3 2.4.7.5-1.4 1.8-2.4 3.3-2.4 2 0 3.6 1.6 3.6 3.6v.9c.7-.4 1.5-.6 2.3-.6 2.5 0 4.5 2 4.5 4.5v3.2c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-2.4h-2.4v4c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-4.1h-2.2v3c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3v-5.5z"
            />
        </svg>
    );
}
