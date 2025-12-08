import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SignInIcon} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { EligibilityScreening } from "@/components/application/eligibility-screening";

export default async function ApplicationPreparationPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200/50 rotation-3">
            <SignInIcon className="w-8 h-8 text-white" weight="bold" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Login Required</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Please access your account to check your eligibility and start your application.
          </p>

          <Link href="/login" className="block pt-4">
            <Button className="h-12 px-8 rounded-full bg-brand-blue text-white font-medium hover:bg-brand-blue-dark transition-all shadow-lg hover:shadow-brand-blue/30">
              Sign In to Continue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Minimal Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-semibold tracking-wide uppercase">
            Start Your Journey
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Eligibility Check
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
            Let&apos;s determine your business stage and find the perfect support track for you. It only takes 1 minute.
          </p>
        </div>

        {/* Screening Wizard Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 via-purple-100/50 to-pink-100/50 blur-3xl -z-10 rounded-[3rem]" />
          <EligibilityScreening />
        </div>
      </div>
    </div>
  );
}