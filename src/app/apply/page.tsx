import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { areApplicationsOpen } from "@/lib/config";
import { getUserApplication } from "@/lib/actions";

export default async function ApplyPage() {
  // Check if applications are open (automatic deadline check)
  if (!areApplicationsOpen()) {
    redirect('/apply/closed');
  }

  // Check if user is authenticated
  const session = await auth();

  if (!session?.user) {
    // User is not logged in - show login prompt
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Login Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                You must be logged in to submit an application for the BIRE Program
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Why do I need to login?</strong><br />
                We require authentication to:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Secure your application data</li>
                <li>Track your application status</li>
                <li>Send you important updates</li>
                <li>Prevent duplicate submissions</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login to Continue
                </Button>
              </Link>

              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account? The login page will help you create one with Google.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user already has an application
  const existingApplication = await getUserApplication();

  if (existingApplication.success && existingApplication.data) {
    redirect('/profile');
  }

  // User is authenticated and has no application - redirect to preparation page
  redirect('/apply/prepare');
} 