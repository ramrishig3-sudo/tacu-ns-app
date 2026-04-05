"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Network, Server } from "lucide-react";

export default function DNSLookup() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Placeholder API Simulation
    setTimeout(() => {
       setResults([
          { type: "A", name: domain || "example.com", content: "93.184.215.14", ttl: 300 },
          { type: "AAAA", name: domain || "example.com", content: "2606:2800:21f:cb07:68df:93aa", ttl: 300 },
          { type: "MX", name: domain || "example.com", content: "mail.example.com", ttl: 3600 },
          { type: "TXT", name: domain || "example.com", content: "v=spf1 include:_spf.example.com ~all", ttl: 3600 },
       ]);
       setLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-4xl mx-auto">
         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
               <Network className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">DNS Record Scanner</h1>
            <p className="text-neutral-400">Query A, AAAA, MX, TXT, and CNAME records to verify domain configurations globally.</p>
         </motion.div>

         <motion.form onSubmit={handleLookup} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-4 mb-12">
             <input
               type="text"
               value={domain}
               onChange={(e) => setDomain(e.target.value)}
               placeholder="Enter Domain (e.g. tacuns.net)"
               className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-4 outline-none focus:border-purple-500/50 transition-colors"
               required
             />
             <button type="submit" disabled={loading} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors disabled:opacity-50">
                {loading ? "Scanning..." : "Scan Records"}
             </button>
         </motion.form>

         {results && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
               <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <h3 className="text-xl font-bold flex items-center gap-2"><Server className="w-5 h-5 text-purple-400" /> Global Propagation Results</h3>
                   <span className="text-sm px-3 py-1 bg-green-500/10 text-green-400 rounded-full font-mono">Status: Success</span>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-neutral-900 text-sm focus-within:bg-neutral-800 text-neutral-400 uppercase tracking-widest border-b border-neutral-800">
                           <th className="px-6 py-4 font-semibold">Type</th>
                           <th className="px-6 py-4 font-semibold">Name</th>
                           <th className="px-6 py-4 font-semibold">Target / Content</th>
                           <th className="px-6 py-4 font-semibold">TTL</th>
                        </tr>
                     </thead>
                     <tbody>
                        {results.map((record: any, idx: number) => (
                           <tr key={idx} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors font-mono text-sm">
                              <td className="px-6 py-4 font-bold text-purple-300">{record.type}</td>
                              <td className="px-6 py-4 text-neutral-300">{record.name}</td>
                              <td className="px-6 py-4 break-all">{record.content}</td>
                              <td className="px-6 py-4 text-neutral-500">{record.ttl}s</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </motion.div>
         )}
      </div>
    </main>
  );
}
