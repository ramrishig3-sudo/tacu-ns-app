"use client";

import { motion } from "framer-motion";
import { Wrench, Hash, Network, Search, Cpu } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    id: "ip-lookup",
    title: "IP Lookup Tool",
    description: "Instantly retrieve geolocation, ASN, and reputation data for any IPv4 or IPv6 address.",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    href: "/tools/ip-lookup"
  },
  {
    id: "dns-lookup",
    title: "DNS Record Scanner",
    description: "Scan A, MX, TXT, and CNAME records to verify domain configurations and email security.",
    icon: Network,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    href: "/tools/dns-lookup"
  },
  {
    id: "hash-generator",
    title: "Hash Generator",
    description: "Generate secure MD5, SHA-1, and SHA-256 cryptographic hashes for file strings instantly.",
    icon: Hash,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    href: "/tools/hash-generator"
  },
  {
    id: "local-network",
    title: "Local IP Analyzer",
    description: "Extract client-side network details including your local IPv4 address and WebRTC leaks.",
    icon: Cpu,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    href: "/tools/local-network"
  }
];

export default function ToolsDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20">
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 pt-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm mb-6 border border-purple-500/20">
                <Wrench className="w-4 h-4" /> Utilities
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
               Web <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Tools</span>
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
               A suite of zero-logging, client-side, and API-powered network security utilities for everyday analysis.
            </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool) => (
               <motion.div key={tool.id} variants={itemVariants}>
                  <Link href={tool.href} className="group block h-full">
                     <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 hover:bg-neutral-800/80 hover:border-neutral-600 transition-all duration-300 h-full flex items-start gap-6">
                        <div className={`shrink-0 w-14 h-14 rounded-xl ${tool.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                           <tool.icon className={`w-7 h-7 ${tool.color}`} />
                        </div>
                        <div>
                           <h2 className="text-xl font-bold mb-2 group-hover:text-white transition-colors text-neutral-200">{tool.title}</h2>
                           <p className="text-neutral-400 text-sm leading-relaxed">{tool.description}</p>
                        </div>
                     </div>
                  </Link>
               </motion.div>
            ))}
        </motion.div>
      </div>
    </main>
  );
}
