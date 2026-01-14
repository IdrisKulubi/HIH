"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Settings } from "lucide-react";
import { initializeDefaultScoringConfig } from "@/lib/actions/scoring";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InitializeDefaultConfigButton() {
  const [isInitializing, setIsInitializing] = useState(false);
  const router = useRouter();

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      // Pass true to force-reinitialize with updated scoring weights
      const result = await initializeDefaultScoringConfig(true);

      if (result.success) {
        toast.success("BIRE Programme scoring configuration updated successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to initialize default configuration");
      }
    } catch (error) {
      console.error("Error initializing default configuration:", error);
      toast.error("An error occurred while initializing configuration");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleInitialize}
      disabled={isInitializing}
      className="border-orange-200 text-orange-700 hover:bg-orange-50"
    >
      {isInitializing ? (
        <>
          <Settings className="h-4 w-4 mr-2 animate-spin" />
          Initializing...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 mr-2" />
          Initialize Default Config
        </>
      )}
    </Button>
  );
} 