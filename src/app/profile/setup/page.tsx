import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserProfile } from "@/lib/actions/user.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle2, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function ProfileSetupPage() {
  // Check if user is authenticated
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  // Check if user already has a profile
  const userProfile = await getCurrentUserProfile();
  
  if (userProfile) {
    // User already has a profile, redirect to apply page
    redirect('/apply');
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center">
            <UserCircle2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome to In-Country YouthADAPT!</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Let&apos;s set up your profile to get you ready for the application process
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Authentication Successful
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You&apos;re logged in as {session.user.email}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Next Steps:</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">1</span>
                </div>
                <span>Complete your basic profile information</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">2</span>
                </div>
                <span>Access the In-Country YouthADAPT Challenge application</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">3</span>
                </div>
                <span>Submit your climate innovation proposal</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Your profile will be automatically created when you start the application process. 
              The application form will collect all necessary information.
            </p>
          </div>
          
          <div className="pt-4">
            <Link href="/apply" className="w-full">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg">
                Continue to Application
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="text-center text-xs text-gray-500">
            Need help? Contact our support team for assistance.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 