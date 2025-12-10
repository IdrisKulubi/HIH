import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  LockKey,
  Gavel,
  EnvelopeSimple,
  FileText,
  ArrowRight
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Terms and Privacy Policy - BIRE program",
  description: "Terms of service and privacy policy for the BIRE program application platform.",
};

export default function TermsAndPrivacyPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#F5F5F7] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-8 pl-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0B5FBA] transition-colors font-medium group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Header */}
          <div className="text-center pt-16 pb-12 px-8 md:px-12 bg-gradient-to-b from-white to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-[#0B5FBA] mb-6 shadow-sm">
              <ShieldCheck className="w-8 h-8" weight="duotone" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Terms and Privacy Policy
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              BIRE program {currentYear}
            </p>
          </div>

          <div className="px-8 md:px-16 pb-16 space-y-12">

            {/* Data Usage Section */}
            <section className="relative">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-green-50 text-[#00D0AB]">
                  <ShieldCheck className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">How We Use Your Data</h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    We collect and use your personal information solely for the purpose of administering the BIRE program. This includes:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Processing your application and evaluating your eligibility",
                      "Communicating with you about your application status",
                      "Providing support throughout the application process",
                      "Analyzing program effectiveness and generating anonymized reports",
                      "Compliance with legal and regulatory requirements"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-slate-600 text-sm md:text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00D0AB] mt-2.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Data Retention Section */}
            <section>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-blue-50 text-[#0B5FBA]">
                  <Clock className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Data Retention Period</h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    We retain your personal data for the following periods:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-200/50">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#0B5FBA] mb-1">Application Data</span>
                      <span className="text-slate-700 font-medium">5 years from challenge end</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-200/50">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#0B5FBA] mb-1">Account Info</span>
                      <span className="text-slate-700 font-medium">2 years after inactivity</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-200/50">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#0B5FBA] mb-1">Communications</span>
                      <span className="text-slate-700 font-medium">3 years from last interaction</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-200/50">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#0B5FBA] mb-1">Legal Data</span>
                      <span className="text-slate-700 font-medium">As required by law</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm bg-slate-50 p-3 rounded-lg inline-block">
                    After these periods, data is permanently deleted unless legally required otherwise.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Data Protection Section */}
            <section>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-green-50 text-[#00D0AB]">
                  <LockKey className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Data Protection</h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    We implement appropriate technical and organizational measures to protect your personal data:
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {[
                      "Encryption in transit & at rest",
                      "Regular security audits",
                      "Strict access controls",
                      "Staff data training",
                      "Incident response procedures"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 bg-white/50 text-slate-700 text-sm font-medium">
                        <ShieldCheck className="w-4 h-4 text-[#00D0AB]" weight="duotone" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Your Rights Section */}
            <section>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-blue-50 text-[#0B5FBA]">
                  <Gavel className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Your Rights</h2>
                  <div className="bg-slate-50 rounded-2xl p-6">
                    <ul className="grid sm:grid-cols-2 gap-y-3 gap-x-8">
                      {[
                        "Right to access data",
                        "Right to rectification",
                        "Right to erasure",
                        "Right to restrict processing",
                        "Right to data portability",
                        "Right to object"
                      ].map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0B5FBA]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-4 text-slate-600 text-sm">
                    To exercise these rights, please contact our support team through the platform.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Terms of Use Section */}
            <section>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-xl bg-orange-50 text-orange-500">
                  <FileText className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Terms of Use</h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    By participating in the BIRE program, you agree to:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Provide accurate and truthful information",
                      "Use the platform for legitimate purposes only",
                      "Respect intellectual property rights",
                      "Comply with all applicable laws",
                      "Maintain account confidentiality"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 border border-[#0B5FBA]/10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-3 rounded-full bg-white text-[#0B5FBA] shadow-sm">
                      <EnvelopeSimple className="w-6 h-6" weight="duotone" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Questions?</h3>
                      <p className="text-slate-600 text-sm">
                        Contact us through our support system.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Last Updated</p>
                    <p className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <div className="bg-slate-50 border-t border-slate-100 p-8 text-center sticky bottom-0 backdrop-blur-md bg-opacity-90">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#0B5FBA] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#094d96] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
            >
              Continue to Sign Up
              <ArrowRight className="w-4 h-4" weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}