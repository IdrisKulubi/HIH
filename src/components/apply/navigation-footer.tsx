"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationFooterProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isAnimating: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
}

export function NavigationFooter({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  isLastStep,
  isAnimating,
  currentStepIndex,
  totalSteps,
  progress,
}: NavigationFooterProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 lg:p-6 sticky bottom-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious || isAnimating}
            className="flex-1 lg:flex-none lg:px-8 h-12 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {/* Progress indicator for desktop */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>•</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          
          {/* Mobile progress dots */}
          <div className="flex lg:hidden items-center gap-1">
            {Array.from({ length: totalSteps }, (_, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    isCurrent 
                      ? "bg-blue-500 w-6" 
                      : isCompleted 
                      ? "bg-green-500" 
                      : "bg-gray-200"
                  )}
                />
              );
            })}
          </div>
          
          {!isLastStep ? (
            <Button 
              onClick={onNext}
              disabled={!canGoNext || isAnimating}
              className="flex-1 lg:flex-none lg:px-8 h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg transition-all duration-200"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="flex-1 lg:flex-none" />
          )}
        </div>
      </div>
    </div>
  );
} 