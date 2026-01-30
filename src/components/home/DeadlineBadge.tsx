"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { APP_CONFIG, areApplicationsOpen, getTimeUntilDeadline } from "@/lib/config";

export function DeadlineBadge() {
  const [isOpen, setIsOpen] = useState(true);
  const [countdown, setCountdown] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const open = areApplicationsOpen();
      setIsOpen(open);

      if (open) {
        const time = getTimeUntilDeadline();
        
        // Check if less than 24 hours remaining
        setIsUrgent(time.days === 0);
        
        if (time.days > 0) {
          setCountdown(`${time.days}d ${time.hours}h ${time.minutes}m remaining`);
        } else if (time.hours > 0) {
          setCountdown(`${time.hours}h ${time.minutes}m ${time.seconds}s remaining`);
        } else if (time.minutes > 0) {
          setCountdown(`${time.minutes}m ${time.seconds}s remaining!`);
        } else {
          setCountdown(`${time.seconds}s remaining!`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 bg-gray-700/90 backdrop-blur-sm border border-gray-500 rounded-full px-4 py-2 mb-2"
      >
        <span className="text-sm font-bold text-gray-200">
          ⏰ Applications are now closed
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex flex-col sm:flex-row items-center gap-2 ${
        isUrgent 
          ? "bg-red-600/90 border-red-400 animate-pulse" 
          : "bg-red-500/90 border-red-400"
      } backdrop-blur-sm border rounded-full px-4 py-2 mb-2 hover:bg-red-600/90 transition cursor-pointer`}
    >
      <Link href="/guidelines" className="flex flex-col sm:flex-row items-center gap-2">
        <span className="text-sm font-bold text-white">
          📅 Deadline: {APP_CONFIG.applicationDeadlineDisplay}
        </span>
        <span className={`text-xs ${isUrgent ? "text-yellow-200 font-bold" : "text-red-100"}`}>
          ⏱️ {countdown}
        </span>
      </Link>
    </motion.div>
  );
}
