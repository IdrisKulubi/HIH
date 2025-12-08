import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserProfile } from "@/lib/actions/user.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserCircle2,
  CheckCircle2,
  ArrowRight,
  Building,
  FileText,
  TrendingUp,
  Globe,
  Briefcase,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  const checklistItems = [
    {
      icon: <Building className="w-5 h-5 text-blue-500" />,
      title: "Business Details",
      description: "Name, Registration Status, Sector, & Description"
    },
    {
      icon: <Globe className="w-5 h-5 text-teal-500" />,
      title: "Location & Impact",
      description: "County, City, & Climate Adaptation Impact"
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-500" />,
      title: "Key Documents",
      description: "Registration Certificate, Financial Records, & Audited Accounts"
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      title: "Financials",
      description: "Revenue, Years Operational, & Funding History"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left Column: Welcome & Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Welcome to the BIRE Challenge</h1>
            <p className="text-lg text-slate-600">
              You're one step away from joining a community of climate innovators.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Account Verified
            </h3>
            <p className="text-slate-600 mb-2">
              You are currently logged in as:
            </p>
            <div className="bg-slate-50 px-4 py-2 rounded-lg text-slate-800 font-medium border border-slate-200 inline-block">
              {session.user.email}
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 font-semibold">Automatic Profile Creation</AlertTitle>
            <AlertDescription className="text-blue-700/90 mt-1">
              Your profile will be automatically generated as you complete the application form. No separate setup is required.
            </AlertDescription>
          </Alert>

          <Button asChild size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 shadow-lg shadow-blue-200 text-base font-semibold">
            <Link href="/apply">
              Start Application
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Right Column: Preparation Checklist */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>

          <CardHeader className="relative z-10 pb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">What You'll Need</CardTitle>
            <CardDescription className="text-slate-500">
              Have these details ready to ensure a smooth application process.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 pt-4">
            <div className="grid gap-4">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="bg-slate-100 p-2.5 rounded-lg shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Need assistance? <Link href="/support" className="text-blue-600 font-medium hover:underline">Contact Support</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
