import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Network, 
  Wifi, 
  Mail, 
  Terminal, 
  Cpu, 
  Settings, 
  Menu, 
  X,
  LayoutDashboard,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquare,
  Clock,
  Sun,
  Moon,
  LockKeyhole
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import Dashboard from "./components/dashboard/Dashboard";
import ThreatIntel from "./components/threat/ThreatIntel";
import NetworkAnalyzer from "./components/network/NetworkAnalyzer";
import Toolkit from "./components/toolkit/Toolkit";
import AIAssistant from "./components/ai/AIAssistant";
import EmailAnalyzer from "./components/email/EmailAnalyzer";
import ScheduledScans from "./components/toolkit/ScheduledScans";
import VPNModule from "./components/vpn/VPNModule";
import WifiAnalyzer from "./components/wifi/WifiAnalyzer";

type Tab = "dashboard" | "threat" | "network" | "wifi" | "vpn" | "email" | "toolkit" | "ai" | "scheduled" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "threat", label: "Threat Intel", icon: Shield },
    { id: "network", label: "Network", icon: Network },
    { id: "wifi", label: "WiFi Analyzer", icon: Wifi },
    { id: "vpn", label: "Privacy Shield", icon: LockKeyhole },
    { id: "email", label: "Email Header", icon: Mail },
    { id: "toolkit", label: "Toolkit", icon: Terminal },
    { id: "ai", label: "AI Assistant", icon: MessageSquare },
    { id: "scheduled", label: "Scheduled Scans", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  return (
    <div className={cn(
      "h-screen flex transition-colors duration-300 relative overflow-hidden cyber-grid",
      isDarkMode ? "bg-[#050505] text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]",
            isDarkMode ? "bg-blue-600/30" : "bg-blue-400/20"
          )} 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]",
            isDarkMode ? "bg-purple-600/20" : "bg-purple-400/10"
          )} 
        />
        {isDarkMode && (
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        )}
      </div>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? 280 : (isSidebarOpen ? 260 : 80),
          x: (isMobile && !isMobileMenuOpen) ? -280 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-0 top-0 h-screen z-[70] border-r flex flex-col",
          isDarkMode ? "glass-dark border-white/10" : "bg-white/90 border-slate-200",
          "backdrop-blur-3xl lg:relative lg:h-full",
          !isMobile && !isSidebarOpen && "lg:w-20"
        )}
      >
        <div className="p-3 md:p-4 flex items-center gap-2 md:gap-3 shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0 overflow-hidden border border-blue-500/30 bg-blue-900 flex items-center justify-center">
            <img src="/tacu-logo.png" alt="TacU- NS Logo" className="w-full h-full object-cover" />
          </div>
          <AnimatePresence>
            {(isMobile || isSidebarOpen) && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-black text-base md:text-lg tracking-tighter whitespace-nowrap bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent"
              >
                TACU-<span className="text-blue-500">NS</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-3 py-2 min-h-0">
          <nav className="space-y-0.5 md:space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 md:gap-3 p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? (isDarkMode ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "bg-blue-50 text-blue-600")
                    : (isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
                )}
              >
                <item.icon size={20} className={cn(
                  "transition-transform group-hover:scale-110 shrink-0",
                  activeTab === item.id && "text-blue-500"
                )} />
                <AnimatePresence>
                  {(isMobile || isSidebarOpen) && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-medium text-[11px] md:text-sm whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {activeTab === item.id && (isMobile || isSidebarOpen) && (
                  <motion.div 
                    layoutId="active-pill"
                    className="ml-auto w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 mt-auto hidden lg:block shrink-0 border-t border-white/5">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
              isDarkMode ? "text-slate-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <div className={cn("transition-transform duration-300", !isSidebarOpen && "rotate-180")}>
              <Menu size={20} />
            </div>
            {isSidebarOpen && <span className="font-medium text-sm">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-full flex flex-col">
        <header className={cn(
          "h-14 md:h-16 border-b flex items-center justify-between px-4 lg:px-6 backdrop-blur-3xl shrink-0 z-40",
          isDarkMode ? "bg-black/40 border-white/5" : "bg-white/80 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all lg:hidden",
                isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-slate-100 border-slate-200 hover:bg-slate-200"
              )}
            >
              <Menu size={18} />
            </button>
            <h1 className="text-base md:text-lg font-bold capitalize hidden sm:block tracking-tight">
              {navItems.find(i => i.id === activeTab)?.label || activeTab.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className={cn(
              "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border",
              isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
            )}>
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tools..." 
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  if (val.length > 1) {
                    const match = navItems.find(item => item.label.toLowerCase().includes(val) || item.id.includes(val));
                    if (match) setActiveTab(match.id as Tab);
                  }
                }}
                className="bg-transparent border-none outline-none text-xs w-24 lg:w-40"
              />
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "p-2 rounded-xl border transition-all",
                isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-slate-100 border-slate-200 hover:bg-slate-200"
              )}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs">
                RG
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* VPN stays always mounted so connection state/timer persists across tab switches */}
          <div style={{ display: activeTab === "vpn" ? "block" : "none" }}>
            <VPNModule />
          </div>

          <AnimatePresence mode="wait">
            {activeTab !== "vpn" && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "threat" && <ThreatIntel />}
              {activeTab === "network" && <NetworkAnalyzer />}
              {activeTab === "toolkit" && <Toolkit />}
              {activeTab === "ai" && <AIAssistant />}
              {activeTab === "email" && <EmailAnalyzer />}
              {activeTab === "wifi" && <WifiAnalyzer />}
              {activeTab === "scheduled" && <ScheduledScans />}
              {activeTab === "settings" && (
                <div className="cyber-card">
                  <h2 className="cyber-title mb-4 md:mb-6">Settings & Configuration</h2>
                  <div className="space-y-6 md:space-y-8">
                    <section>
                      <h3 className="cyber-subtitle mb-3 md:mb-4 flex items-center gap-2">
                        <Cpu size={18} className="text-blue-500" />
                        System Preferences
                      </h3>
                      <div className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <p className="font-bold text-sm md:text-base">Dark Mode</p>
                          <p className="cyber-text-s">Toggle between light and dark themes</p>
                        </div>
                        <button 
                          onClick={() => setIsDarkMode(!isDarkMode)}
                          className={cn(
                            "w-10 h-5 md:w-12 md:h-6 rounded-full transition-all relative",
                            isDarkMode ? "bg-blue-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                            isDarkMode ? "right-0.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  </div>
  );
}
