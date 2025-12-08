"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { SupportModal } from "@/components/support/support-modal";

interface ContactSupportButtonProps {
  defaultCategory?: string;
  defaultSubject?: string;
  context?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ContactSupportButton({ 
  defaultCategory = "application_help",
  defaultSubject,
  context,
  variant = "outline",
  size = "default",
  className = ""
}: ContactSupportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={`w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${className}`}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Contact Support
      </Button>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultCategory={defaultCategory}
        defaultSubject={defaultSubject}
        context={context}
      />
    </>
  );
} 