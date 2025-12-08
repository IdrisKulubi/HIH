import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Privacy Policy - In-Country YouthADAPT Challenge",
  description: "Terms of service and privacy policy for the In-Country YouthADAPT Challenge application platform.",
};

export default function TermsAndPrivacyPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[#0B5FBA] hover:text-[#00D0AB] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Terms and Privacy Policy
            </h1>
            <p className="text-lg text-gray-600">
              In-Country YouthADAPT Challenge {currentYear}
            </p>
          </div>

          <div className="space-y-8">
            {/* Data Usage Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00D0AB] rounded-full"></div>
                How We Use Your Data
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We collect and use your personal information solely for the purpose of administering the In-Country YouthADAPT Challenge. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Processing your application and evaluating your eligibility</li>
                  <li>Communicating with you about your application status</li>
                  <li>Providing support throughout the application process</li>
                  <li>Analyzing program effectiveness and generating anonymized reports</li>
                  <li>Compliance with legal and regulatory requirements</li>
                </ul>
              </div>
            </section>

            {/* Data Retention Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#0B5FBA] rounded-full"></div>
                Data Retention Period
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We retain your personal data for the following periods:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Application Data:</strong> 5 years from the end of the challenge period</li>
                  <li><strong>Account Information:</strong> 2 years after account inactivity</li>
                  <li><strong>Communication Records:</strong> 3 years from the last interaction</li>
                  <li><strong>Legal Compliance Data:</strong> As required by applicable laws</li>
                </ul>
                <p>
                  After these retention periods, your data will be permanently deleted from our systems unless legally required to be retained longer.
                </p>
              </div>
            </section>

            {/* Data Protection Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00D0AB] rounded-full"></div>
                Data Protection
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and assessments</li>
                  <li>Access controls and user authentication</li>
                  <li>Staff training on data protection principles</li>
                  <li>Incident response procedures</li>
                </ul>
              </div>
            </section>

            {/* Your Rights Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#0B5FBA] rounded-full"></div>
                Your Rights
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  You have the following rights regarding your personal data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure (subject to legal requirements)</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                </ul>
                <p>
                  To exercise these rights, please contact our support team through the platform.
                </p>
              </div>
            </section>

            {/* Terms of Use Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00D0AB] rounded-full"></div>
                Terms of Use
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  By creating an account and participating in the In-Country YouthADAPT Challenge, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information in your application</li>
                  <li>Use the platform solely for legitimate application purposes</li>
                  <li>Respect the intellectual property rights of others</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                </ul>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#0B5FBA] rounded-full"></div>
                Contact Us
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us through our support system within the platform.
                </p>
                <p className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] text-white px-6 py-3 rounded-lg font-semibold hover:from-[#0B5FBA]/90 hover:to-[#00D0AB]/90 transition-all duration-300"
              >
                Continue to Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 