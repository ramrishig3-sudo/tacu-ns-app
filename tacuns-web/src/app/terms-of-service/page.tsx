import { Shield } from "lucide-react";
import Link from "next/link";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-3xl mx-auto">
         <div className="mb-12">
            <Link href="/" className="text-teal-400 hover:text-teal-300 text-sm font-bold mb-8 inline-block">&larr; Back to Home</Link>
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-teal-400" />
               </div>
               <h1 className="text-4xl font-bold">Terms of Service</h1>
            </div>
            <p className="text-neutral-500 font-mono text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
         </div>

         <div className="prose prose-invert prose-teal max-w-none prose-p:text-neutral-400 prose-headings:text-neutral-200">
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using the TacU-NS platform, tools, and services, you accept and agree to be bound by the terms and provisions of this agreement.</p>

            <h3>2. Appropriate Use</h3>
            <p>The tools and resources provided on this platform (including the Network Observers, DNS lookups, and Hashes) are intended strictly for educational, administrative, and lawful security auditing purposes.</p>
            <ul>
               <li>You may only scan infrastructure or IPs for which you have explicit authorization.</li>
               <li>Malicious activity, volumetric scanning, or abuse of our endpoints will result in an immediate IP ban.</li>
            </ul>

            <h3>3. Disclaimer of Warranties</h3>
            <p>The service is provided "AS-IS", without warranty of any kind, express or implied. TacU-NS and its developers do not guarantee the absolute accuracy of DNS propagation results, IP geolocation, or any third-party sourced data.</p>

            <h3>4. Contact Us</h3>
            <p>Questions regarding our terms of service should be directed to:</p>
            <p className="font-mono text-teal-400">support@tacuns.net</p>
         </div>
      </div>
    </main>
  );
}
