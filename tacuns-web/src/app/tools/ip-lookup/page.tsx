"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function IPLookup() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Placeholder API Simulation
    setTimeout(() => {
       setResult({
          ip: ip || "8.8.8.8",
          city: "Mountain View",
          region: "California",
          country: "US",
          loc: "37.3860,-122.0838",
          org: "AS15169 Google LLC",
          timezone: "America/Los_Angeles"
       });
       setLoading(false);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-4xl mx-auto">
         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
               <Search className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">IP Lookup Tool</h1>
            <p className="text-neutral-400">Query detailed geographical and ASN intelligence for any IP address instantly.</p>
         </motion.div>

         <motion.form onSubmit={handleLookup} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-4 mb-12">
             <input
               type="text"
               value={ip}
               onChange={(e) => setIp(e.target.value)}
               placeholder="Enter IP Address (e.g. 1.1.1.1)"
               className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-4 outline-none focus:border-blue-500/50 transition-colors"
               required
             />
             <button type="submit" disabled={loading} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors disabled:opacity-50">
                {loading ? "Scanning..." : "Lookup IP"}
             </button>
         </motion.form>

         {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
               <h3 className="text-xl font-bold mb-6 border-b border-neutral-800 pb-4">Intelligence Report for {result.ip}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <p className="text-sm text-neutral-500 mb-1">Organization (ASN)</p>
                     <p className="font-mono text-blue-300">{result.org}</p>
                  </div>
                  <div>
                     <p className="text-sm text-neutral-500 mb-1">Location</p>
                     <p className="font-mono">{result.city}, {result.region}, {result.country}</p>
                  </div>
                  <div>
                     <p className="text-sm text-neutral-500 mb-1">Coordinates</p>
                     <p className="font-mono">{result.loc}</p>
                  </div>
                  <div>
                     <p className="text-sm text-neutral-500 mb-1">Timezone</p>
                     <p className="font-mono">{result.timezone}</p>
                  </div>
               </div>
            </motion.div>
         )}
      </div>
    </main>
  );
}
