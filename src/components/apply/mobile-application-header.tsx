"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  Clock, 
  Save, 
  Home,
 
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Step {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  estimatedTime?: string;
  icon?: string;
}

interface MobileApplicationHeaderProps {
  currentStep: Step;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  completedSteps: string[];
  onSaveDraft: () => void;
  isAutoSaving: boolean;
  lastSaved?: Date | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function MobileApplicationHeader({
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  completedSteps,
  onSaveDraft,
  isAutoSaving,
  lastSaved,
  sidebarOpen,
  onToggleSidebar,
}: MobileApplicationHeaderProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="px-4 py-3">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-sm">{currentStep.icon}</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 text-sm leading-tight">
                  {currentStep.shortLabel || currentStep.label}
                </h1>
                <p className="text-xs text-gray-500">
                  Step {currentStepIndex + 1} of {totalSteps}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs hidden sm:flex">
              <Clock className="h-3 w-3 mr-1" />
              {currentStep.estimatedTime}
            </Badge>
            
            <Button
              onClick={onSaveDraft}
              variant="ghost"
              size="sm"
              disabled={isAutoSaving}
              className="p-2 hover:bg-gray-100"
            >
              <Save className={cn(
                "h-4 w-4",
                isAutoSaving && "animate-spin"
              )} />
            </Button>
          </div>
        </div>
        
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-semibold">{Math.round(progress)}%</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{completedSteps.length}/{totalSteps} complete</span>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Auto-save status */}
          {lastSaved && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-gray-500">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isAutoSaving ? "bg-yellow-400 animate-pulse" : "bg-green-400"
                )} />
                <span>
                  {isAutoSaving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
                </span>
              </div>
              
              <Badge variant="outline" className="text-xs sm:hidden">
                <Clock className="h-3 w-3 mr-1" />
                {currentStep.estimatedTime}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Navigation Bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {Array.from({ length: totalSteps }, (_, index) => {
            const isCompleted = completedSteps.length > index;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex-shrink-0 w-8 h-1.5 rounded-full transition-all duration-200",
                  isCurrent 
                    ? "bg-blue-500" 
                    : isCompleted 
                    ? "bg-green-500" 
                    : "bg-gray-200"
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Quick action buttons for mobile
interface MobileQuickActionsProps {
  onGoHome: () => void;
  onSaveDraft: () => void;
  isAutoSaving: boolean;
}

export function MobileQuickActions({
  onSaveDraft,
  isAutoSaving,
}: MobileQuickActionsProps) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-40 md:hidden">
      <Button
        onClick={onSaveDraft}
        disabled={isAutoSaving}
        size="sm"
        className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
      >
        <Save className={cn(
          "h-5 w-5",
          isAutoSaving && "animate-spin"
        )} />
      </Button>
      
      <Link href="/">
        <Button
          size="sm"
          variant="outline"
          className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 shadow-lg border-2"
        >
          <Home className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
} 