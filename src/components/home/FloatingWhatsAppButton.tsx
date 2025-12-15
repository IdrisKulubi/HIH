"use client";

import { motion } from "framer-motion";
import { WhatsappLogo } from "@phosphor-icons/react";

export function FloatingWhatsAppButton() {
    const phoneNumber = "+254116027118";
    const message = encodeURIComponent("Hi, I need help with the BIRE Programme");
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\s+/g, "")}?text=${message}`;

    return (
        <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <WhatsappLogo className="w-6 h-6" weight="fill" />
            <span className="hidden md:inline font-medium">Need Help?</span>

            {/* Pulse animation */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        </motion.a>
    );
}
