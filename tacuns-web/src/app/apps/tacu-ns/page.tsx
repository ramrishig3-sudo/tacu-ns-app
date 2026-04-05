"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, Download, Server, Smartphone, Lock } from "lucide-react";
import Link from "next/link";

export default function TacuNsAppPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20">
      <nav className="p-6">
         <Link href="/" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Hub
         </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 mt-12">
        <div className="flex flex-col md:flex-row gap-12 items-center">
            <motion.div 
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex-1"
            >
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 text-teal-400 text-sm mb-6 border border-teal-500/20">
                  <Shield className="w-4 h-4" /> Official App
               </div>
               <h1 className="text-5xl md:text-6xl font-black mb-6">
                 TacU-NS <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Security Pro</span>
               </h1>
               <p className="text-xl text-neutral-400 mb-8 leading-relaxed">
                 The ultimate mobile network and security analysis tool. Available now for Android devices.
               </p>

               <div className="flex gap-4">
                  <button className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors">
                     <Download className="w-5 h-5" /> Get on Play Store
                  </button>
                  <Link href="/privacy-policy" className="flex items-center justify-center px-8 py-3 rounded-xl border border-neutral-800 hover:bg-neutral-900 transition-colors font-semibold">
                     Privacy Policy
                  </Link>
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex-1 relative"
            >
               <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full" />
               <div className="relative w-full aspect-square border border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl">
                    <Shield className="w-32 h-32 text-teal-500 mb-6 drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
                    <h3 className="text-2xl font-bold">Secure Your Network</h3>
               </div>
            </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24"
        >
             <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800">
                <Server className="w-8 h-8 text-blue-400 mb-4" />
                <h4 className="text-xl font-bold mb-2">Network Scans</h4>
                <p className="text-neutral-400 text-sm">Deeply analyze local networks and external IPs to identify potential vulnerabilities.</p>
             </div>
             <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800">
                <Lock className="w-8 h-8 text-teal-400 mb-4" />
                <h4 className="text-xl font-bold mb-2">Encrypted Tunneling</h4>
                <p className="text-neutral-400 text-sm">Create secure tunnels with customized algorithms to protect your private data on public WiFi.</p>
             </div>
             <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800">
                <Smartphone className="w-8 h-8 text-purple-400 mb-4" />
                <h4 className="text-xl font-bold mb-2">Mobile Optimized</h4>
                <p className="text-neutral-400 text-sm">Designed specifically for Android with fluid animations and zero-lag performance.</p>
             </div>
        </motion.div>
      </div>
    </main>
  );
}
