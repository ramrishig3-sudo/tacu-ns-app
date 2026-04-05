"use client";

import { motion } from "framer-motion";
import { BookOpen, Shield, Flame, Activity, ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";

const courses = [
  {
    id: "network-security",
    title: "Network Security Fundamentals",
    description: "Learn the core concepts of IP routing, switching, TCP/IP, and firewalling basics.",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    level: "Beginner",
    modules: 5,
    href: "/learn/network-security/module-1"
  },
  {
    id: "pan-os",
    title: "Firewall Mastery (PAN-OS)",
    description: "Deep dive into Palo Alto Networks next-generation firewalls, NAT, and URL filtering.",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    level: "Intermediate",
    modules: 8,
    href: "#"
  },
  {
    id: "threat-intel",
    title: "Threat Intelligence",
    description: "Understand IoCs, malware analysis, and real-time threat prevention strategies.",
    icon: Activity,
    color: "text-red-400",
    bg: "bg-red-500/10",
    level: "Advanced",
    modules: 4,
    href: "#"
  },
  {
    id: "soc-basics",
    title: "SOC Operations Basics",
    description: "Learn how Security Operations Centers run, SIEM monitoring, and incident response.",
    icon: BookOpen,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    level: "Beginner",
    modules: 3,
    href: "#"
  }
];

export default function LearnDashboard() {
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
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 pt-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 text-center">
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
               Cybersecurity <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Academy</span>
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
               Master the art of network defense, from basic packet-level analysis to advanced next-generation firewall configurations.
            </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {courses.map((course) => (
               <motion.div key={course.id} variants={itemVariants}>
                  <Link href={course.href} className="group block h-full">
                     <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                        <div className={`w-16 h-16 rounded-2xl ${course.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                           <course.icon className={`w-8 h-8 ${course.color}`} />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                           <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">{course.level}</span>
                           <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">{course.modules} Modules</span>
                        </div>

                        <h2 className="text-3xl font-bold mb-4">{course.title}</h2>
                        <p className="text-neutral-400 leading-relaxed mb-8 flex-1">{course.description}</p>

                        <div className="flex items-center text-sm font-bold text-white mt-auto">
                           Start Course <PlayCircle className="w-5 h-5 ml-2 text-teal-400 group-hover:translate-x-1 transition-transform" />
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
