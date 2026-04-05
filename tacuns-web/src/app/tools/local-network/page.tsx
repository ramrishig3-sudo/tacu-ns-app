"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, MonitorSmartphone, Wifi } from "lucide-react";

export default function LocalNetwork() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Client-side extraction of environment properties
    setData({
      userAgent: window.navigator.userAgent,
      platform: window.navigator.platform,
      language: window.navigator.language,
      cookiesEnabled: window.navigator.cookieEnabled ? "Enabled" : "Disabled",
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: `${window.screen.colorDepth}-bit`,
      doNotTrack: navigator.doNotTrack === "1" ? "Enabled" : "Disabled",
      logicalProcessors: navigator.hardwareConcurrency || "Unknown",
    });
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="max-w-4xl mx-auto">
         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
               <Cpu className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Local Environment Analyzer</h1>
            <p className="text-neutral-400">Extract browser fingerprinting and local environment details directly from the client side.</p>
         </motion.div>

         {!data ? (
            <div className="text-center py-20 text-neutral-500">Extracting local variables...</div>
         ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                
                {/* Fingerprint Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                   <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                      <MonitorSmartphone className="w-6 h-6 text-orange-400" />
                      <h2 className="text-xl font-bold">Browser Fingerprint</h2>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                     <div>
                        <p className="text-sm text-neutral-500 mb-1">User Agent</p>
                        <p className="font-mono text-sm text-neutral-300 break-all bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">{data.userAgent}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-sm text-neutral-500 mb-1">Platform</p>
                            <p className="font-mono text-sm text-neutral-300">{data.platform}</p>
                         </div>
                         <div>
                            <p className="text-sm text-neutral-500 mb-1">Language</p>
                            <p className="font-mono text-sm text-neutral-300">{data.language}</p>
                         </div>
                         <div>
                            <p className="text-sm text-neutral-500 mb-1">Hardware Cores</p>
                            <p className="font-mono text-sm text-neutral-300">{data.logicalProcessors}</p>
                         </div>
                         <div>
                            <p className="text-sm text-neutral-500 mb-1">DNT Header</p>
                            <p className="font-mono text-sm text-neutral-300">{data.doNotTrack}</p>
                         </div>
                     </div>
                   </div>
                </div>

                {/* Network Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                   <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                      <Wifi className="w-6 h-6 text-orange-400" />
                      <h2 className="text-xl font-bold">Local Connection (Mock)</h2>
                   </div>
                   <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl text-sm font-mono mb-4">
                       Note: A real WebRTC local IP leak test requires explicit ICE candidate gathering which modern browsers block by default without STUN/TURN servers.
                   </div>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                         <p className="text-sm text-neutral-500 mb-1">Local IPv4</p>
                         <p className="font-mono text-neutral-300">192.168.1.104</p>
                      </div>
                      <div>
                         <p className="text-sm text-neutral-500 mb-1">VPN Detected</p>
                         <p className="font-mono text-red-400">No</p>
                      </div>
                   </div>
                </div>

            </motion.div>
         )}
      </div>
    </main>
  );
}
