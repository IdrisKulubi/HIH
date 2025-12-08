"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { usePasscode } from "./passcode-provider";

export function PasscodeModal() {
  const { isAuthenticated, authenticate } = usePasscode();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (codeToValidate?: string) => {
    const codeToCheck = codeToValidate || passcode;
    
    if (codeToCheck.length !== 4) {
      setError("Please enter a 4-digit passcode");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const isValid = authenticate(codeToCheck);
    
    if (!isValid) {
      setError("Invalid passcode. Please try again.");
      setPasscode("");
    }
    
    setIsSubmitting(false);
  };

  const handlePasscodeChange = (value: string) => {
    setPasscode(value);
    setError("");
    
    // Auto-submit when 4 digits are entered
    if (value.length === 4) {
      setTimeout(() => handleSubmit(value), 100);
    }
  };

  return (
    <Dialog open={!isAuthenticated} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto bg-white border-0 shadow-2xl [&>button]:hidden">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Access Portal
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Enter the 4-digit passcode to access T4D App
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OTP Input */}
          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              maxLength={4}
              value={passcode}
              onChange={handlePasscodeChange}
              disabled={isSubmitting}
            >
              <InputOTPGroup>
                <InputOTPSlot 
                  index={0} 
                  className="w-12 h-12 text-lg text-black font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                />
                <InputOTPSlot 
                  index={1} 
                  className="w-12 h-12 text-lg text-black font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                />
                <InputOTPSlot 
                  index={2} 
                  className="w-12 h-12 text-lg text-black font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                />
                <InputOTPSlot 
                  index={3} 
                  className="w-12 h-12 text-lg text-black font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                />
              </InputOTPGroup>
            </InputOTP>

            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={() => handleSubmit()}
            disabled={passcode.length !== 4 || isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Verifying...
              </div>
            ) : (
              "Access Portal"
            )}
          </Button>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4" />
              <span className="font-medium">Need Access?</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Please contact the admin{" "}
           
              {" "}to be given access to the portal.
            </p>
           
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 