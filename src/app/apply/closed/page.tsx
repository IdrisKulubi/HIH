import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

export default function ApplicationsClosed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Main Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Applications Are Closed
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              Thank you for your interest in our program! Unfortunately,
              applications for this year have closed.
            </p>
          </div>

          {/* Next Year Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                See You Next Year!
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We&apos;ll be opening applications for{" "}
              {APP_CONFIG.nextApplicationPeriod}&apos;s program soon. Stay tuned for
              updates and be the first to know when applications open.
            </p>
          </div>

          {/* Back to Home */}
          <div className="pt-4">
            <Button
              variant="ghost"
              asChild
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
