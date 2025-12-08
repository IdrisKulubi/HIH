"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight } from "lucide-react";

interface AppNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  isLastStep: boolean;
  isAnimating: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
}

export function AppNavigation({
  onPrevious,
  onNext,
  canGoPrevious,
  isLastStep,
  isAnimating,
  currentStepIndex,
  totalSteps,
  progress,
}: AppNavigationProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious || isAnimating}
            className="flex-1 lg:flex-none lg:px-8 h-12"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>•</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          
          {!isLastStep && (
            <Button 
              onClick={onNext}
              disabled={isAnimating}
              className="flex-1 lg:flex-none lg:px-8 h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}