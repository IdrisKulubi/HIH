"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Step {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  estimatedTime?: string;
  icon?: string;
}

interface FormStepIndicatorProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function FormStepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: FormStepIndicatorProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;
  
  if (isMobile) {
    return (
      <div className={cn("w-full py-4 bg-white/90 backdrop-blur-sm border-b border-gray-200", className)}>
        <div className="px-4">
          {/* Header with current step info */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {steps[currentStepIndex]?.shortLabel || steps[currentStepIndex]?.label}
              </h2>
              <p className="text-xs text-gray-500">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {steps[currentStepIndex]?.estimatedTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {steps[currentStepIndex].estimatedTime}
                </Badge>
              )}
              <div className="text-xs font-medium text-gray-600">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-2 mb-3" />
          
          {/* Horizontal step indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = completedSteps.includes(step.id);
              const isClickable = index === 0 || completedSteps.includes(steps[index - 1]?.id);
              
              return (
                <button
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
                    isClickable ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed",
                    isActive && "bg-blue-50"
                  )}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200",
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isActive 
                      ? "bg-blue-500 text-white"
                      : isClickable
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-100 text-gray-400"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : step.icon ? (
                      <span className="text-xs">{step.icon}</span>
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-xs font-medium max-w-16 text-center leading-tight",
                    isActive 
                      ? "text-blue-700" 
                      : isCompleted
                      ? "text-green-700"
                      : isClickable
                      ? "text-gray-600"
                      : "text-gray-400"
                  )}>
                    {step.shortLabel || step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop view with enhanced design
  return (
    <div className={cn("w-full py-6 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200", className)}>
      <div className="px-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Application Progress</h2>
        
        {/* Overall progress */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-semibold text-gray-900">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{completedSteps.length} of {steps.length} steps completed</span>
            <span>{steps[currentStepIndex]?.estimatedTime} remaining</span>
          </div>
        </div>
        
        {/* Step list */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.includes(step.id);
            const isClickable = index === 0 || completedSteps.includes(steps[index - 1]?.id);
            
            return (
              <button
                key={step.id}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all duration-200 group border-2",
                  isActive 
                    ? "bg-gradient-to-r from-blue-50 to-green-50 border-blue-300 shadow-sm" 
                    : isCompleted
                    ? "bg-green-50 hover:bg-green-100 border-green-200"
                    : isClickable
                    ? "bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300"
                    : "bg-gray-50/50 border-gray-100 cursor-not-allowed opacity-60"
                )}
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-md"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : isClickable
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-100 text-gray-400"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : step.icon ? (
                      <span>{step.icon}</span>
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "font-semibold",
                        isActive 
                          ? "text-gray-900" 
                          : isCompleted
                          ? "text-green-800"
                          : isClickable
                          ? "text-gray-700"
                          : "text-gray-400"
                      )}>
                        {step.label}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        {step.estimatedTime && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {step.estimatedTime}
                          </Badge>
                        )}
                        
                        {isActive && (
                          <Badge className="text-xs bg-blue-500">
                            Current
                          </Badge>
                        )}
                        
                        {isCompleted && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            ✓ Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {step.description && (
                      <p className={cn(
                        "text-sm leading-relaxed",
                        isActive 
                          ? "text-gray-600" 
                          : "text-gray-500"
                      )}>
                        {step.description}
                      </p>
                    )}
                  </div>
                  
                  {isClickable && !isActive && (
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
} 