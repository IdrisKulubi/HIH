"use client";

import { ReactNode } from "react";
import { usePasscode } from "./passcode-provider";
import { PasscodeModal } from "./passcode-modal";

interface PasscodeGuardProps {
  children: ReactNode;
}

export function PasscodeGuard({ children }: PasscodeGuardProps) {
  const { isAuthenticated } = usePasscode();

  return (
    <>
      {/* Always render the modal - it will handle its own visibility */}
      <PasscodeModal />
      
      {/* Content with blur overlay when not authenticated */}
      <div className={`transition-all duration-300 ${!isAuthenticated ? "blur-sm pointer-events-none" : ""}`}>
        {children}
      </div>
      
      {/* Overlay to prevent interaction when not authenticated */}
      {!isAuthenticated && (
        <div className="fixed inset-0 bg-black/10 z-40 pointer-events-auto" />
      )}
    </>
  );
} 