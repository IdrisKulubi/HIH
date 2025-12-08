"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PasscodeContextType {
  isAuthenticated: boolean;
  authenticate: (passcode: string) => boolean;
  logout: () => void;
}

const PasscodeContext = createContext<PasscodeContextType | undefined>(undefined);

interface PasscodeProviderProps {
  children: ReactNode;
}

export function PasscodeProvider({ children }: PasscodeProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const stored = localStorage.getItem("t4dapp_authenticated");
    if (stored === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const authenticate = (passcode: string): boolean => {
    const correctPasscode = process.env.NEXT_PUBLIC_APP_PASSCODE || "1309";
    
    if (passcode === correctPasscode) {
      setIsAuthenticated(true);
      localStorage.setItem("t4dapp_authenticated", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("t4dapp_authenticated");
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PasscodeContext.Provider value={{ isAuthenticated, authenticate, logout }}>
      {children}
    </PasscodeContext.Provider>
  );
}

export function usePasscode() {
  const context = useContext(PasscodeContext);
  if (context === undefined) {
    throw new Error("usePasscode must be used within a PasscodeProvider");
  }
  return context;
} 