"use client";

import { motion } from "framer-motion";
import { User, Briefcase, Mail, Server, Shield, Wrench, Download, Terminal, ExternalLink, Code2 } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-20 pt-32 px-6">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-20 text-center md:text-left">
           <div className="w-40 h-40 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 p-1">
              <div className="w-full h-full rounded-full bg-neutral-900 border-4 border-neutral-900 flex items-center justify-center overflow-hidden">
                 <User className="w-20 h-20 text-neutral-500" />
              </div>
           </div>
           
           <div className="flex-1">
              <h1 className="text-5xl font-black mb-2">Ramki</h1>
              <h2 className="text-xl text-teal-400 font-bold mb-4">Network Security Engineer (TAC) &amp; Developer of TacU-NS</h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-6 max-w-2xl">
                 I am a dedicated Network Security Engineer specializing in Next-Generation Firewalls and tactical network troubleshooting. I bridge the gap between complex network infrastructure and practical software development to build powerful cybersecurity utilities.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                 <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors">
                    <Download className="w-4 h-4" /> Download Resume
                 </button>
                 <a href="mailto:support@tacuns.net" className="flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-neutral-700 font-bold rounded-xl hover:bg-neutral-800 transition-colors">
                    <Mail className="w-4 h-4" /> Contact Me
                 </a>
              </div>
           </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Professional Experience */}
           <motion.div variants={itemVariants} className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-blue-500/10 rounded-xl"><Briefcase className="w-6 h-6 text-blue-400" /></div>
                 <h3 className="text-2xl font-bold">Experience</h3>
              </div>
              <ul className="space-y-6 text-neutral-300">
                 <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full">
                    <strong className="text-white block mb-1">TAC Operations &amp; Issue Handling</strong>
                    Resolving critical, high-severity network anomalies and providing root-cause analysis for enterprise environments.
                 </li>
                 <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full">
                    <strong className="text-white block mb-1">Palo Alto Networks Edge Defense</strong>
                    Deploying, administering, and debugging PAN-OS Firewalls, App-ID, GlobalProtect VPNs, and URL filtering.
                 </li>
                 <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full">
                    <strong className="text-white block mb-1">Protocol Analysis</strong>
                    Deep packet inspection using Wireshark for debugging TCP/IP, DNS, routing, and asymmetric tunneling issues.
                 </li>
              </ul>
           </motion.div>

           {/* Skills Section */}
           <motion.div variants={itemVariants} className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-teal-500/10 rounded-xl"><Wrench className="w-6 h-6 text-teal-400" /></div>
                 <h3 className="text-2xl font-bold">Technical Arsenal</h3>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Server className="w-4 h-4"/> Networking</h4>
                    <div className="flex flex-wrap gap-2">
                       {['TCP/IP', 'Routing (OSPF/BGP)', 'Switching', 'DNS'].map(skill => (
                          <span key={skill} className="px-3 py-1 bg-neutral-800 text-neutral-300 text-sm rounded-lg">{skill}</span>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield className="w-4 h-4"/> Security</h4>
                    <div className="flex flex-wrap gap-2">
                       {['PAN-OS Next-Gen Firewalls', 'NAT Policies', 'IPSec/SSL VPN', 'Threat Prevention'].map(skill => (
                          <span key={skill} className="px-3 py-1 bg-neutral-800 text-neutral-300 text-sm rounded-lg">{skill}</span>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Terminal className="w-4 h-4"/> Tools &amp; Dev</h4>
                    <div className="flex flex-wrap gap-2">
                       {['Wireshark', 'GNS3 / EVE-NG', 'React & Next.js', 'TypeScript', 'Linux Shell'].map(skill => (
                          <span key={skill} className="px-3 py-1 bg-neutral-800 text-neutral-300 text-sm rounded-lg">{skill}</span>
                       ))}
                    </div>
                 </div>
              </div>
           </motion.div>

           {/* Mission Statement */}
           <motion.div variants={itemVariants} className="md:col-span-2 bg-gradient-to-r from-neutral-900 to-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12 text-center backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-teal-500/5 mix-blend-overlay" />
              <div className="relative z-10 max-w-3xl mx-auto">
                 <Shield className="w-12 h-12 text-teal-500 mx-auto mb-6" />
                 <h3 className="text-3xl font-black mb-4">The Vision Behind TacU-NS</h3>
                 <p className="text-neutral-300 text-lg leading-relaxed mb-8">
                    My mission is to democratize cybersecurity by building practical, real-world utilities that both seasoned engineers and enthusiastic learners can leverage. TacU-NS was born out of a desire to simplify network diagnostics and provide an interactive platform for mastering enterprise-level security concepts.
                 </p>
                 <div className="flex justify-center gap-4">
                     <Link href="https://linkedin.com" target="_blank" className="p-3 bg-neutral-800 hover:bg-teal-600 transition-colors rounded-full text-white" aria-label="LinkedIn">
                        <ExternalLink className="w-5 h-5" />
                     </Link>
                     <Link href="https://github.com" target="_blank" className="p-3 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-full text-white" aria-label="GitHub">
                        <Code2 className="w-5 h-5" />
                     </Link>
                 </div>
              </div>
           </motion.div>

        </motion.div>
      </div>
    </main>
  );
}
