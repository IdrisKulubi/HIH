import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/home/Footer";
import { ArrowLeft, Calendar, MapPin, Phone, EnvelopeSimple, CheckCircle, Warning, Info } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
    title: "Application Guidelines | BIRE Programme",
    description: "BIRE Call for Application Program Guidelines - Deadline for submission is 15th January 2026",
};

export default function GuidelinesPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Back Link */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-brand-blue hover:underline mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            BIRE Call for Application Program Guidelines
                        </h1>
                        <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold">
                            <Calendar className="w-5 h-5" />
                            Deadline for submission: 30th January 2026
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-slate max-w-none">

                        {/* Introduction */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">Introduction</h2>
                            <p>
                                The Building Inclusive and Resilient Enterprises (BIRE) Programme is an initiative implemented by Hand in Hand Eastern Africa (HiH EA) with support from the Embassy of Sweden and Hand in Hand Sweden. The programme aims to stimulate the growth of women-, youth-, and PLWD-led Micro and Small Enterprises (MSEs) across Kenya, enabling them to build profitable, resilient, and sustainable businesses that can create long-term employment and income opportunities.
                            </p>
                            <p>
                                The programme is expected to support <strong>700 enterprises nationwide</strong>, strengthening their business practices, enhancing market access, improving climate resilience, and expanding opportunities for financial inclusion. Through targeted capacity development and structured advisory support, BIRE seeks to unlock the potential of small enterprises and cooperatives across Kenya&apos;s diverse value chains—including agriculture, manufacturing, services, trade, blue economy, and emerging green sectors like circular economy.
                            </p>
                            <p>
                                The BIRE programme through targeted business development support, market access interventions, and improved enterprise competitiveness, is projected to create over <strong>4,000 direct jobs</strong> and an additional <strong>8,000 indirect jobs</strong>, positively impacting more than 12,000 individuals through income generation and employment.
                            </p>
                        </section>

                        {/* Regional Hubs */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">Regional Hubs</h2>
                            <p>
                                The BIRE Programme will be coordinated through three Regional Hubs based in <strong>Nairobi, Kisumu, and Mombasa</strong>, but will be open to eligible applicants from all forty-seven (47) counties.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-brand-blue text-white">
                                            <th className="p-3 text-left">Regional Hub</th>
                                            <th className="p-3 text-left">Target Counties</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="p-3 font-semibold">Nairobi Hub</td>
                                            <td className="p-3 text-sm">Nairobi, Kiambu, Murang&apos;a, Nyeri, Kirinyaga, Embu, Nyandarua, Nakuru, Kajiado, Machakos, Makueni, Kitui, Laikipia, Meru, Tharaka Nithi, Isiolo, Marsabit, Samburu</td>
                                        </tr>
                                        <tr className="border-b bg-slate-50">
                                            <td className="p-3 font-semibold">Kisumu Hub</td>
                                            <td className="p-3 text-sm">Kisumu, Homa Bay, Migori, Siaya, Busia, Bungoma, Kakamega, Vihiga, Kericho, Bomet, Nandi, Uasin Gishu, Trans Nzoia, Elgeyo Marakwet, Baringo, West Pokot, Turkana, Nyamira, Kisii, Narok</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-semibold">Mombasa Hub</td>
                                            <td className="p-3 text-sm">Mombasa, Kilifi, Kwale, Tana River, Lamu, Taita Taveta, Garissa, Wajir, Mandera</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Timeline */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">Timeline</h2>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span><strong>Application Window:</strong> 15th December 2025 to 15th January 2026</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span><strong>Evaluation:</strong> January - February 2026</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span><strong>Results Notification:</strong> March 2026</span>
                                </li>
                            </ul>
                        </section>

                        {/* Application Process */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">1. Application Process</h2>
                            <ul className="space-y-3">
                                <li>All applications must be submitted online through the Hand in Hand Eastern Africa (HiH EA) Application Portal. The application window will remain open from <strong>15th December 2025 to 15th January 2026 at 11:59 PM (23:59) EAT</strong>. No physical forms will be issued or accepted.</li>
                                <li>Applicants must complete the online application form by responding to all mandatory questions and providing accurate information required for assessment.</li>
                                <li>Personal information submitted in the application must be truthful and verifiable.</li>
                                <li>Upon successful submission, an automated confirmation will be sent to the applicant via email.</li>
                                <li className="text-red-700 font-medium">Once submitted, applications cannot be edited, altered, or resubmitted. Review all information carefully before final submission.</li>
                            </ul>
                        </section>

                        {/* Eligibility */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">2. Eligibility</h2>

                            <h3 className="text-xl font-semibold mt-6">Eligible Entrepreneurs</h3>
                            <ul>
                                <li>Open to women, men, youth (18–35 years), and Persons Living with Disabilities (PLWDs) leading or owning Micro and Small Enterprises.</li>
                                <li>Women-, youth-, and PLWD-led enterprises are strongly encouraged.</li>
                                <li>All applicants must demonstrate responsible, ethical, and environmentally sound business practices.</li>
                            </ul>

                            <h3 className="text-xl font-semibold mt-6">Nationality and Location</h3>
                            <ul>
                                <li>The applicant must be a Kenyan citizen.</li>
                                <li>The enterprise must be located and operating within any of Kenya&apos;s 47 counties.</li>
                            </ul>

                            <h3 className="text-xl font-semibold mt-6">Eligible Sectors</h3>
                            <p>Open to enterprises across diverse sectors including: agriculture, livestock, fisheries, manufacturing, retail, blue economy, circular economy, renewable energy, digital services, creative industries, and services.</p>

                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="font-bold text-blue-800 mb-3">Foundation Track Eligibility</h4>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Enterprise registered & operating in Kenya</li>
                                        <li>✓ Recognized as a legal entity</li>
                                        <li>✓ Basic financial records for at least 1 year</li>
                                        <li>✓ Operational for at least 1-2 years</li>
                                        <li>✓ Revenue: KES 500,000 - KES 3,000,000/year</li>
                                        <li>✓ Currently employs 1-4 employees</li>
                                    </ul>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="font-bold text-green-800 mb-3">Acceleration Track Eligibility</h4>
                                    <ul className="text-sm space-y-1">
                                        <li>✓ Enterprise registered & operating in Kenya</li>
                                        <li>✓ Recognized as a legal entity</li>
                                        <li>✓ Operational for at least 2 years</li>
                                        <li>✓ 1 year management books of accounts</li>
                                        <li>✓ Revenue: Above KES 3,000,000/year</li>
                                        <li>✓ Employs 5-20 employees</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Scoring Criteria */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">4. Scoring Criteria</h2>
                            <p>To proceed to the next stage of review, an application must score a <strong>minimum of 70 marks out of 100</strong>.</p>

                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <h4 className="font-bold mb-3">Foundation Track Criteria</h4>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="p-2 text-left">Criteria</th>
                                                <th className="p-2 text-right">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b"><td className="p-2">Commercial Viability</td><td className="p-2 text-right">30</td></tr>
                                            <tr className="border-b"><td className="p-2">Business Model Clarity</td><td className="p-2 text-right">10</td></tr>
                                            <tr className="border-b"><td className="p-2">Market Potential</td><td className="p-2 text-right">30</td></tr>
                                            <tr className="border-b"><td className="p-2">Social & Environmental Impact</td><td className="p-2 text-right">30</td></tr>
                                            <tr className="bg-slate-100 font-bold"><td className="p-2">TOTAL</td><td className="p-2 text-right">100</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-3">Acceleration Track Criteria</h4>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-green-100">
                                                <th className="p-2 text-left">Criteria</th>
                                                <th className="p-2 text-right">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b"><td className="p-2">Revenue & Traction</td><td className="p-2 text-right">20</td></tr>
                                            <tr className="border-b"><td className="p-2">Impact Potential</td><td className="p-2 text-right">20</td></tr>
                                            <tr className="border-b"><td className="p-2">Scalability</td><td className="p-2 text-right">20</td></tr>
                                            <tr className="border-b"><td className="p-2">Social & Environmental Impact</td><td className="p-2 text-right">20</td></tr>
                                            <tr className="border-b"><td className="p-2">Business Model Strength</td><td className="p-2 text-right">20</td></tr>
                                            <tr className="bg-slate-100 font-bold"><td className="p-2">TOTAL</td><td className="p-2 text-right">100</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        {/* Technical Support */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">5. Technical Support</h2>
                            <p>Successful applicants will receive:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Enterprise Development & Business Advisory</h4>
                                    <p className="text-sm text-slate-600">Business management training, financial literacy, and value chain advisory.</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Mentorship & Coaching</h4>
                                    <p className="text-sm text-slate-600">One-on-one coaching, sector-specific mentorship, and peer learning.</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Market Access & Linkages</h4>
                                    <p className="text-sm text-slate-600">Buyer-seller linkages, trade fair access, and digital marketing support.</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Investment Readiness</h4>
                                    <p className="text-sm text-slate-600">Financial modelling, pitch deck development, and investor linkages.</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Digitalization & Technology</h4>
                                    <p className="text-sm text-slate-600">Digital tools training, e-commerce platforms, and climate-smart technologies.</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-semibold">Climate Resilience & ESG</h4>
                                    <p className="text-sm text-slate-600">Climate risk assessments, sustainability advisory, and circular economy practices.</p>
                                </div>
                            </div>
                        </section>

                        {/* Financial Support */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">6. Financial Support</h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-brand-blue pl-4">
                                    <h4 className="font-semibold">Matching Grant Facility</h4>
                                    <p className="text-sm text-slate-600">Cost-sharing grant where BIRE matches enterprise investment at an agreed ratio.</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-4">
                                    <h4 className="font-semibold">Repayable Grant</h4>
                                    <p className="text-sm text-slate-600">Performance-linked grant with flexible repayment terms aligned to enterprise cashflows.</p>
                                </div>
                                <div className="border-l-4 border-amber-500 pl-4">
                                    <h4 className="font-semibold">External Financing Support</h4>
                                    <p className="text-sm text-slate-600">Linkages to banks, MFIs, SACCOs, impact investors, and climate funds.</p>
                                </div>
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h4 className="font-semibold">Loan Guarantee Facilitation</h4>
                                    <p className="text-sm text-slate-600">Risk-sharing support to help enterprises access loans for expansion.</p>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                                <p className="text-amber-800 font-medium">⚠️ Important: All enterprises must undergo a structured technical assistance period (first 3 months) before accessing financial support.</p>
                            </div>
                        </section>

                        {/* Important Notes */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                            <h2 className="text-2xl font-bold text-brand-blue mt-0">Important Notes</h2>
                            <div className="space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-red-800">No Fees Required</h4>
                                    <p className="text-sm text-red-700">Applicants are NOT required to pay any fee to apply. Anyone requesting payment is engaging in fraud.</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-800">One Application Only</h4>
                                    <p className="text-sm text-blue-700">Only one application per Applicant is permitted. Multiple submissions will result in disqualification.</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-amber-800">No Deadline Extensions</h4>
                                    <p className="text-sm text-amber-700">Ensure submissions are made well before the deadline. Technical issues do not entitle applicants to extensions.</p>
                                </div>
                            </div>
                        </section>

                        {/* Contact */}
                        <section className="bg-brand-blue text-white rounded-xl p-6 mb-8">
                            <h2 className="text-2xl font-bold mt-0 text-white">Need Help?</h2>
                            <p className="text-cyan-100">Contact us through any of the following channels:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <a href="mailto:bire@handinhandea.or.ke" className="flex items-center gap-3 bg-white/10 p-4 rounded-lg hover:bg-white/20 transition">
                                    <EnvelopeSimple className="w-6 h-6" />
                                    <span>bire@handinhandea.or.ke</span>
                                </a>
                                <a href="tel:+254116027118" className="flex items-center gap-3 bg-white/10 p-4 rounded-lg hover:bg-white/20 transition">
                                    <Phone className="w-6 h-6" />
                                    <span>+254 116 027118</span>
                                </a>
                            </div>
                            <div className="mt-4 bg-white/10 p-4 rounded-lg">
                                <p className="flex items-start gap-2">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <span>
                                        Hand in Hand Eastern Africa (HiH EA)<br />
                                        P.O. Box 8562-00100, Nairobi, Kenya<br />
                                        HiH EA Headquarters, Lower Hill Duplex Apartments, 2nd Floor
                                    </span>
                                </p>
                            </div>
                        </section>

                        {/* CTA */}
                        <div className="text-center">
                            <Link
                                href="/apply"
                                className="inline-flex items-center gap-2 bg-brand-blue text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-blue/90 transition shadow-lg"
                            >
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
