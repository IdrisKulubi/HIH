import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 text-slate-300 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-bold text-lg mb-4">BIRE Portal</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Building Inclusive & Resilient Enterprises (BIRE) is a strategic partnership programme designed to transform Kenya's MSE sector through funding, mentorship, and market access.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-brand-blue transition-colors">Home</Link></li>
             
              <li><Link href="/#faq" className="hover:text-brand-blue transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>Nairobi, Kenya</li>
              <li>
                <Link href="mailto:support@bire.org" className="hover:text-brand-blue transition-colors">bire@handinhandea.or.ke </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} Hand in Hand Eastern Africa. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/terms-and-privacy" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
