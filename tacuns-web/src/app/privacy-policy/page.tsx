import { Shield } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-3xl mx-auto">
         <div className="mb-12">
            <Link href="/" className="text-teal-400 hover:text-teal-300 text-sm font-bold mb-8 inline-block">&larr; Back to Home</Link>
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-teal-400" />
               </div>
               <h1 className="text-4xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-neutral-500 font-mono text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
         </div>

         <div className="prose prose-invert prose-teal max-w-none prose-p:text-neutral-400 prose-headings:text-neutral-200">
            <h3>1. Introduction</h3>
            <p>Welcome to TacU-NS (Tactical Utility &ndash; Network Security). We respect your privacy and are committed to protecting it through our compliance with this policy. This policy describes the types of information we may collect from you or that you may provide when you visit the website.</p>

            <h3>2. Information We Collect</h3>
            <p>Our tools are designed to operate locally on your device wherever possible. However, certain operations require API calls:</p>
            <ul>
               <li><strong>Direct Inputs:</strong> Data you provide directly into our Lookup tools (e.g., Domains, IP addresses).</li>
               <li><strong>Browser Diagnostics:</strong> Local Analyzer tools extract environment configurations solely for your on-screen viewing. We do not store this data.</li>
            </ul>

            <h3>3. Third-Party APIs</h3>
            <p>We may utilize trusted third-party intelligence services for DNS and IP lookup results. When you execute a lookup, the queried indicator may be transmitted securely to these endpoints to retrieve the report. At no point is personal identifying information attached to these intelligence queries.</p>

            <h3>4. Contact Us</h3>
            <p>If you have any questions or concerns regarding this Privacy Policy or our data practices, please contact us at:</p>
            <p className="font-mono text-teal-400">support@tacuns.net</p>
         </div>
      </div>
    </main>
  );
}
