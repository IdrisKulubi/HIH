"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield, AlertCircle } from "lucide-react";
import { verifyReviewPasscode } from "@/lib/actions/review.actions";
import { toast } from "sonner";

export default function PasscodeEntry() {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyReviewPasscode(passcode);
      
      if (result.success) {
        toast.success("Access granted! Redirecting...");
        router.refresh();
      } else {
        setError(result.error || "Invalid passcode");
        toast.error(result.error || "Invalid passcode");
      }
    } catch (error) {
      console.error("Error verifying passcode:", error);
      setError("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold bg-[#0B5FBA] bg-clip-text text-transparent">
            Review Section Access
          </CardTitle>
          <CardDescription className="text-gray-600">
            This section is restricted to authorized reviewers only. 
            Please enter the passcode to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="passcode" className="text-gray-700">
                Review Passcode
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="passcode"
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[#0B5FBA] text-white font-medium"
              disabled={loading || !passcode}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Verifying...
                </div>
              ) : (
                "Access Review Section"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">Access Levels:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Analysts:</strong> Initial application evaluation</li>
                <li>• <strong>Associates:</strong> Josephine & Anita - First level review</li>
                <li>• <strong>Managers:</strong> Paul, Martin, Felix & Vanam - Final approval</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
