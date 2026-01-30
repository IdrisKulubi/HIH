import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowLeft, Clock, Bell, CheckCircle } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

export const metadata = {
  title: "Applications Closed | BIRE Portal",
  description: "Applications for the BIRE 2026 Programme have closed",
};

export default function ApplicationsClosed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        {/* Animated Clock Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/30">
            <Clock className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              Applications Are Now Closed
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
              Thank you for your interest in the <span className="font-semibold text-white">BIRE 2026 Programme</span>! 
              The application deadline of <span className="font-semibold text-yellow-400">{APP_CONFIG.applicationDeadlineDisplay}</span> has passed.
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-green-400 mb-2">✓</div>
                <p className="text-white font-semibold">Applications Received</p>
                <p className="text-blue-200 text-sm">We&apos;re reviewing all submissions</p>
              </div>
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-blue-400 mb-2">📊</div>
                <p className="text-white font-semibold">Review In Progress</p>
                <p className="text-blue-200 text-sm">Results will be announced soon</p>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center justify-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              What Happens Next?
            </h2>
            <div className="space-y-3 text-left max-w-xl mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-100">All applications will be reviewed by our evaluation team</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-100">Shortlisted applicants will be contacted via email</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-100">Results will be announced in the coming weeks</p>
              </div>
            </div>
          </div>

          {/* Already Applied? */}
          <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30">
            <h3 className="text-lg font-semibold text-white mb-2">Already Applied?</h3>
            <p className="text-blue-200 mb-4">
              You can still log in to track your application status and view any updates.
            </p>
            <Link href="/login">
              <Button className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-6">
                Login to Check Status
              </Button>
            </Link>
          </div>

          {/* Next Year Info */}
          <div className="pt-4">
            <div className="flex items-center justify-center space-x-2 text-blue-300">
              <CalendarDays className="w-5 h-5" />
              <span>Next application period: <strong className="text-white">{APP_CONFIG.nextApplicationPeriod}</strong></span>
            </div>
          </div>

          {/* Back to Home */}
          <div className="pt-4">
            <Button
              variant="ghost"
              asChild
              className="text-blue-300 hover:text-white hover:bg-white/10"
            >
              <Link href="/" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
