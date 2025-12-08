"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeSlash, SpinnerGap, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { sendVerificationCodeAction, verifyCodeAndCreateAccount, resendVerificationCode } from "@/lib/actions/email-verification";
import Link from "next/link";

interface SignupFormProps {
  callbackUrl?: string;
}

type SignupStep = "details" | "verification" | "success";

export function SignupForm({ callbackUrl }: SignupFormProps) {
  const [step, setStep] = useState<SignupStep>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await sendVerificationCodeAction(email);
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message || "A verification code has been sent to your email.");
      setStep("verification");
      startResendTimer();
    } else {
      setError(result.error || "Failed to send verification code.");
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    setIsLoading(true);
    const result = await verifyCodeAndCreateAccount({ email, code: verificationCode.trim(), password, name });
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message || "Account created successfully! You will be redirected shortly.");
      setStep("success");
      setTimeout(() => {
        signIn("credentials", { email, password, callbackUrl: callbackUrl || "/apply" });
      }, 2000);
    } else {
      setError(result.error || "Invalid or expired verification code.");
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    const result = await resendVerificationCode(email);
    setIsLoading(false);
    if (result.success) {
      setSuccess("A new verification code has been sent.");
      startResendTimer();
    } else {
      setError(result.error || "Failed to resend code.");
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {step === "details" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium ml-1">Full Name</Label>
                <Input id="name" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium ml-1">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-gray-50  border-gray-200 focus:bg-white transition-all shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium ml-1">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm pr-10"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-gray-400 hover:text-brand-blue" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={isLoading}>
                {isLoading && <SpinnerGap className="mr-2 h-5 w-5 animate-spin" />}
                Create Account
              </Button>
            </form>
          )}

          {step === "verification" && (
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">Verify Your Email</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter the 6-digit code sent to {email}</p>
              </div>
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
              >
                <InputOTPGroup className="mx-auto">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
                className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isLoading ? <SpinnerGap className="mr-2 h-5 w-5 animate-spin" /> : "Verify & Create Account"}
              </Button>
              <Button variant="link" onClick={handleResendCode} disabled={resendTimer > 0 || isLoading} className="text-brand-blue">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
              </Button>
            </div>
          )}

          {step === "success" && (
            <Alert variant="default" className="dark:bg-green-900/50 dark:border-green-500/50 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                {success}
              </AlertDescription>
            </Alert>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Updated Terms and Privacy Section */}
      <div className="pt-4 border-t border-gray-100">
        <div className="bg-blue-50/50 rounded-xl p-4 mb-4 border border-blue-100">
          <h4 className="text-sm font-semibold text-brand-blue mb-2">Data Usage & Retention</h4>
          <p className="text-xs text-slate-600 mb-3">
            Your data will be used solely for the BIRE Programme {currentYear}. We retain application data for 5 years, account information for 2 years after inactivity, and then permanently delete it.
          </p>
          <p className="text-xs text-center text-slate-500">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms-and-privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-brand-blue-dark font-medium underline"
            >
              Terms and Privacy Policy
            </Link>
            {" "}for the BIRE Programme {currentYear}.
          </p>
        </div>
      </div>
    </div>
  );
} 