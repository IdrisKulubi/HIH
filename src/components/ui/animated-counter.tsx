"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedCounterProps {
    value: string;
    duration?: number;
    className?: string;
}

export function AnimatedCounter({ value, duration = 2, className = "" }: AnimatedCounterProps) {
    const counterRef = useRef<HTMLSpanElement>(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    // Parse the value to extract numeric part and suffix
    const parseValue = (val: string) => {
        // Match patterns like "700", "12,000+", "$1M+", "47"
        const match = val.match(/^([^\d]*)([0-9,]+)(.*)$/);
        if (match) {
            return {
                prefix: match[1] || "",
                number: parseInt(match[2].replace(/,/g, ""), 10),
                suffix: match[3] || "",
                hasCommas: match[2].includes(","),
            };
        }
        return { prefix: "", number: 0, suffix: val, hasCommas: false };
    };

    const { prefix, number, suffix, hasCommas } = parseValue(value);

    useEffect(() => {
        const element = counterRef.current;
        if (!element || hasAnimated) return;

        const trigger = ScrollTrigger.create({
            trigger: element,
            start: "top 85%",
            onEnter: () => {
                if (hasAnimated) return;
                setHasAnimated(true);

                const counter = { val: 0 };
                gsap.to(counter, {
                    val: number,
                    duration: duration,
                    ease: "power2.out",
                    onUpdate: () => {
                        const currentVal = Math.floor(counter.val);
                        const formattedVal = hasCommas
                            ? currentVal.toLocaleString()
                            : currentVal.toString();
                        element.textContent = `${prefix}${formattedVal}${suffix}`;
                    },
                });
            },
        });

        return () => trigger.kill();
    }, [number, prefix, suffix, hasCommas, duration, hasAnimated]);

    return (
        <span ref={counterRef} className={className}>
            {prefix}0{suffix}
        </span>
    );
}
