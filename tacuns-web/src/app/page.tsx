"use client";

import { motion } from "framer-motion";
import { Shield, BookOpen, Wrench, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-neutral-950 flex flex-col items-center justify-center pt-20 pb-20">
      {/* Background ambient glow */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[0%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 max-w-6xl w-full px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm text-sm text-neutral-300 mb-8"
        >
          <Shield className="w-4 h-4 text-teal-400" />
          <span>TacU- NS Ecosystem Online</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6"
        >
           Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Security</span> & <br className="hidden md:block"/> Learning Hub
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed"
        >
          Explore powerful cybersecurity tools, master deep concepts through our highly interactive courses, and stay secure.
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {/* Apps Card */}
          <motion.div variants={itemVariants}>
            <Link href="/apps/tacu-ns" className="block group h-full">
              <div className="h-full p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-xl hover:bg-neutral-800/50 hover:border-teal-500/30 transition-all duration-300 text-left">
                 <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7 text-teal-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-3 flex items-center justify-between">
                   Apps <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                 </h2>
                 <p className="text-neutral-400 leading-relaxed">
                   Discover our suite of robust security applications like TacU-NS Network Security Pro.
                 </p>
              </div>
            </Link>
          </motion.div>

          {/* Learn Card */}
          <motion.div variants={itemVariants}>
            <Link href="/learn" className="block group h-full">
              <div className="h-full p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-xl hover:bg-neutral-800/50 hover:border-blue-500/30 transition-all duration-300 text-left">
                 <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-blue-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-3 flex items-center justify-between">
                   Learn <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                 </h2>
                 <p className="text-neutral-400 leading-relaxed">
                   Master cybersecurity concepts with our guided, interactive markdown modules and tutorials.
                 </p>
              </div>
            </Link>
          </motion.div>

          {/* Tools Card */}
          <motion.div variants={itemVariants}>
            <Link href="/tools" className="block group h-full">
              <div className="h-full p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-xl hover:bg-neutral-800/50 hover:border-purple-500/30 transition-all duration-300 text-left">
                 <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Wrench className="w-7 h-7 text-purple-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-3 flex items-center justify-between">
                   Tools <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                 </h2>
                 <p className="text-neutral-400 leading-relaxed">
                   Access quick web-based utilities for everyday security analysis and network diagnostics.
                 </p>
              </div>
            </Link>
          </motion.div>

        </motion.div>
      </div>
    </main>
  );
}
