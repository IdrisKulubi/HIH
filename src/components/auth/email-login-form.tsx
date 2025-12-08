"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeSlash, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";

interface EmailLoginFormProps {
  callbackUrl?: string;
}

export function EmailLoginForm({ callbackUrl }: EmailLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else if (result?.url) {
      window.location.href = callbackUrl || result.url;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email-login" className="text-gray-700 font-medium ml-1">Email</Label>
        <Input
          id="email-login"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-login" className="text-gray-700 font-medium ml-1">Password</Label>
        <div className="relative">
          <Input
            id="password-login"
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
        <div className="text-right">
          <Link href="/forgot-password" passHref>
            <Button variant="link" className="px-0 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark">
              Forgot Password?
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50 text-red-800 rounded-xl">
          <WarningCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 font-bold">Sign In Failed</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full h-12 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={isLoading}>
        {isLoading && <SpinnerGap className="mr-2 h-5 w-5 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
} 