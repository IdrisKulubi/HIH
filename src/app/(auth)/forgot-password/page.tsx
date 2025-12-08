"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { requestPasswordReset, resetPassword, verifyPasswordResetCode } from "@/lib/actions/password-reset";

type Step = "email" | "verify" | "reset" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await requestPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setStep("verify");
    } else {
      setError(result.message);
    }
  };

  const handleVerifySubmit = async () => {
    setError("");
    setIsLoading(true);
    const result = await verifyPasswordResetCode(email, code);
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setStep("reset");
    } else {
      setError(result.message);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await resetPassword(email, code, password);
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setStep("success");
    } else {
      setError(result.message);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <motion.div key="email" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold">Forgot Password</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-2">Enter the email address associated with your account to receive a reset code.</p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base" 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Code
              </Button>
            </form>
          </motion.div>
        );
      case "verify":
        return (
          <motion.div key="verify" className="space-y-4 sm:space-y-6 text-center">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold">Check Your Email</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-2">We&apos;ve sent a 6-digit code to {email}.</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup className="gap-2 sm:gap-3">
                  <InputOTPSlot index={0} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                  <InputOTPSlot index={1} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                  <InputOTPSlot index={2} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                  <InputOTPSlot index={3} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                  <InputOTPSlot index={4} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                  <InputOTPSlot index={5} className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifySubmit} className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading || code.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
          </motion.div>
        );
      case "reset":
        return (
          <motion.div key="reset" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold">Set a New Password</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-2">Create a new, strong password for your account.</p>
            </div>
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base" 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>
          </motion.div>
        );
      case "success":
        return (
          <motion.div key="success" className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
            <h1 className="text-xl sm:text-2xl font-bold">Password Reset!</h1>
            <p className="text-sm sm:text-base text-gray-500">{success}</p>
            <Button asChild className="w-full h-11 sm:h-12 text-sm sm:text-base">
              <a href="/login">Return to Sign In</a>
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900/90 rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-800">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (step === 'email' || step === 'verify') && (
            <Alert variant="default" className="mt-6 dark:bg-green-900/50 dark:border-green-500/50 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                {success}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
} 