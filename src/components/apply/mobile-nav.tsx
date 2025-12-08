"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Clock, Save } from "lucide-react";

interface MobileNavProps {
  currentStepLabel: string;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  estimatedTime?: string;
  onSaveDraft: () => void;
  isAutoSaving: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function MobileNav({
  currentStepLabel,
  currentStepIndex,
  totalSteps,
  progress,
  estimatedTime,
  onSaveDraft,
  isAutoSaving,
  sidebarOpen,
  onToggleSidebar,
}: MobileNavProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm md:hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">
                {currentStepLabel}
              </h1>
              <p className="text-xs text-gray-500">
                Step {currentStepIndex + 1} of {totalSteps}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {estimatedTime && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {estimatedTime}
              </Badge>
            )}
            <Button
              onClick={onSaveDraft}
              variant="ghost"
              size="sm"
              disabled={isAutoSaving}
              className="p-2"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
} 