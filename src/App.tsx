import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  Shield,
  Network,
  Wifi,
  Mail,
  Terminal,
  Cpu,
  Settings,
  Menu,
  Search,
  MessageSquare,
  Clock,
  Sun,
  Moon,
  LockKeyhole,
  LayoutDashboard,
  Info,
  FileText,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { App as CapApp } from "@capacitor/app";

// ─── Lazy-load heavy components so the first tab loads instantly ───────────────
const Dashboard      = lazy(() => import("./components/dashboard/Dashboard"));
const ThreatIntel    = lazy(() => import("./components/threat/ThreatIntel"));
const NetworkAnalyzer = lazy(() => import("./components/network/NetworkAnalyzer"));
const Toolkit        = lazy(() => import("./components/toolkit/Toolkit"));
const AIAssistant    = lazy(() => import("./components/ai/AIAssistant"));
const EmailAnalyzer  = lazy(() => import("./components/email/EmailAnalyzer"));
const ScheduledScans = lazy(() => import("./components/toolkit/ScheduledScans"));
const VPNModule      = lazy(() => import("./components/vpn/VPNModule"));
const WifiAnalyzer   = lazy(() => import("./components/wifi/WifiAnalyzer"));

type Tab = "dashboard" | "threat" | "network" | "wifi" | "vpn" | "email" | "toolkit" | "ai" | "scheduled" | "settings";

const TAB_HISTORY_KEY = "tacu_tab_history";

// A simple loading spinner shown while lazy component loads
function TabLoader() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // ─── Navigation History Stack (for Android back button) ────────────────────
  // Keeps a stack of tabs visited so back button goes to previous tab,
  // and only exits the app when back is pressed on the first/root screen.
  const [tabHistory, setTabHistory] = useState<Tab[]>(["dashboard"]);

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

  // ─── Persist preferences ──────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // ─── Responsive detection ─────────────────────────────────────────────────
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

  // ─── Android Hardware Back Button Handler ─────────────────────────────────
  // Uses Capacitor's App plugin to intercept the Android back button.
  // If there's history → go back to previous tab.
  // If on root (dashboard with no history) → exit app.
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const setupBackHandler = async () => {
      const listenerHandle = await CapApp.addListener("backButton", () => {
        // Close mobile menu first if open
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          return;
        }

        // Go back in tab history if available
        setTabHistory((prev) => {
          if (prev.length > 1) {
            const newHistory = prev.slice(0, -1);
            const previousTab = newHistory[newHistory.length - 1];
            setActiveTab(previousTab);
            return newHistory;
          } else {
            // No more history → exit app
            CapApp.exitApp();
            return prev;
          }
        });
      });

      removeListener = () => listenerHandle.remove();
    };

    setupBackHandler();
    return () => {
      removeListener?.();
    };
  }, [isMobileMenuOpen]);

  // ─── Navigate to a tab (pushes to history stack) ─────────────────────────
  const navigateTo = useCallback((tab: Tab) => {
    setActiveTab((current) => {
      if (current === tab) return current; // same tab, no change
      setTabHistory((prev) => {
        // Avoid duplicate consecutive entries
        if (prev[prev.length - 1] === tab) return prev;
        return [...prev, tab];
      });
      return tab;
    });
    if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
  }, []);

  const navItems = [
    { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
    { id: "threat",     label: "Threat Intel",   icon: Shield },
    { id: "network",    label: "Network",         icon: Network },
    { id: "wifi",       label: "WiFi Analyzer",  icon: Wifi },
    { id: "vpn",        label: "Privacy Shield", icon: LockKeyhole },
    { id: "email",      label: "Email Header",   icon: Mail },
    { id: "toolkit",    label: "Toolkit",        icon: Terminal },
    { id: "ai",         label: "AI Assistant",   icon: MessageSquare },
    { id: "scheduled",  label: "Scheduled Scans",icon: Clock },
    { id: "settings",   label: "Settings",       icon: Settings },
  ];

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen((v) => !v);
    } else {
      setIsSidebarOpen((v) => !v);
    }
  };

  return (
    <div
      className={cn(
        "h-screen flex transition-colors duration-300 relative overflow-hidden cyber-grid",
        isDarkMode ? "bg-[#050505] text-white" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* ── Atmospheric Background (reduced animation cost) ─────────────── */}
      {/* Using CSS animation instead of Framer Motion infinite loops to save CPU */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={cn(
            "absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse-slow",
            isDarkMode ? "bg-blue-600/20" : "bg-blue-400/15"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse-slower",
            isDarkMode ? "bg-purple-600/15" : "bg-purple-400/10"
          )}
        />
        {isDarkMode && (
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-noise" />
        )}
      </div>

      {/* ── Mobile Backdrop ───────────────────────────────────────────────── */}
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

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 280 : isSidebarOpen ? 260 : 80,
          x: isMobile && !isMobileMenuOpen ? -280 : 0,
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
                onClick={() => navigateTo(item.id as Tab)}
                className={cn(
                  "w-full flex items-center gap-2.5 md:gap-3 p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 group",
                  activeTab === item.id
                    ? isDarkMode
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                      : "bg-blue-50 text-blue-600"
                    : isDarkMode
                    ? "text-slate-400 hover:bg-white/5 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-transform group-hover:scale-110 shrink-0",
                    activeTab === item.id && "text-blue-500"
                  )}
                />
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
            onClick={() => setIsSidebarOpen((v) => !v)}
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

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-full flex flex-col">
        <header
          className={cn(
            "h-14 md:h-16 border-b flex items-center justify-between px-4 lg:px-6 backdrop-blur-3xl shrink-0 z-40",
            isDarkMode ? "bg-black/40 border-white/5" : "bg-white/80 border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all lg:hidden",
                isDarkMode
                  ? "bg-white/5 border-white/10 hover:bg-white/10"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200"
              )}
            >
              <Menu size={18} />
            </button>
            <h1 className="text-base md:text-lg font-bold capitalize hidden sm:block tracking-tight">
              {navItems.find((i) => i.id === activeTab)?.label || activeTab.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div
              className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
              )}
            >
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search tools..."
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  if (val.length > 1) {
                    const match = navItems.find(
                      (item) => item.label.toLowerCase().includes(val) || item.id.includes(val)
                    );
                    if (match) navigateTo(match.id as Tab);
                  }
                }}
                className="bg-transparent border-none outline-none text-xs w-24 lg:w-40"
              />
            </div>

            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className={cn(
                "p-2 rounded-xl border transition-all",
                isDarkMode
                  ? "bg-white/5 border-white/10 hover:bg-white/10"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200"
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

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        {/*
          PERFORMANCE NOTE:
          - VPN is always mounted (display:none when hidden) so its connection
            state & timer persist across tab switches.
          - All other tabs use React.lazy + Suspense so they only load
            their JS chunk the first time you visit them.
          - AnimatePresence duration reduced to 150ms for snappier feel.
        */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">

            {/* VPN — always mounted, hidden with CSS */}
            <Suspense fallback={<TabLoader />}>
              <div style={{ display: activeTab === "vpn" ? "block" : "none" }}>
                <VPNModule />
              </div>
            </Suspense>

            {/* All other tabs — rendered only when active */}
            <AnimatePresence mode="wait">
              {activeTab !== "vpn" && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.15 }}   // faster than old 0.2s
                >
                  <Suspense fallback={<TabLoader />}>
                    {activeTab === "dashboard"  && <Dashboard />}
                    {activeTab === "threat"     && <ThreatIntel />}
                    {activeTab === "network"    && <NetworkAnalyzer />}
                    {activeTab === "toolkit"    && <Toolkit />}
                    {activeTab === "ai"         && <AIAssistant />}
                    {activeTab === "email"      && <EmailAnalyzer />}
                    {activeTab === "wifi"       && <WifiAnalyzer />}
                    {activeTab === "scheduled"  && <ScheduledScans />}
                    {activeTab === "settings"   && (
                      <div className="cyber-card">
                        <h2 className="cyber-title mb-4 md:mb-6">Settings &amp; Configuration</h2>
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
                                onClick={() => setIsDarkMode((v) => !v)}
                                className={cn(
                                  "w-10 h-5 md:w-12 md:h-6 rounded-full transition-all relative",
                                  isDarkMode ? "bg-blue-600" : "bg-slate-700"
                                )}
                              >
                                <div
                                  className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                                    isDarkMode ? "right-0.5" : "left-0.5"
                                  )}
                                />
                              </button>
                            </div>
                          </section>

                          <section>
                            <h3 className="cyber-subtitle mb-3 md:mb-4 flex items-center gap-2">
                              <Info size={18} className="text-blue-500" />
                              App Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <button
                                onClick={() => setIsAboutModalOpen(true)}
                                className={cn(
                                  "flex flex-col items-start p-4 rounded-xl md:rounded-2xl border transition-all text-left group",
                                  isDarkMode
                                    ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                )}
                              >
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                  <Info className="text-blue-500" size={20} />
                                </div>
                                <span className="font-bold text-sm md:text-base mb-1">About TacU- NS</span>
                                <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Version, Developer info & details</span>
                              </button>

                              <button
                                onClick={() => setIsPrivacyModalOpen(true)}
                                className={cn(
                                  "flex flex-col items-start p-4 rounded-xl md:rounded-2xl border transition-all text-left group",
                                  isDarkMode
                                    ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                )}
                              >
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                  <ShieldCheck className="text-purple-500" size={20} />
                                </div>
                                <span className="font-bold text-sm md:text-base mb-1">Privacy Policy</span>
                                <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Data usage & compliance terms</span>
                              </button>
                            </div>
                          </section>
                        </div>
                      </div>
                    )}
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-md p-6 border rounded-2xl shadow-2xl overflow-hidden glass-card",
                isDarkMode ? "bg-[#0a0a0a]/90 border-white/10" : "bg-white/90 border-slate-200"
              )}
            >
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
              >
                <X size={20} className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2 relative">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-20 h-20 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] overflow-hidden border border-blue-500/30 bg-blue-900 mb-5 flex items-center justify-center relative z-10">
                  <img src="/tacu-logo.png" alt="TacU- NS Logo" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-1 relative z-10">TacU- <span className="text-blue-500">NS</span></h2>
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20">v1.0.0</span>
                </div>
                
                <p className={cn("text-sm mb-8 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Network Security Toolkit with Threat Intelligence, AI Analysis, and VPN features.
                </p>
                
                <div className={cn("w-full p-4 rounded-xl border text-left", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                  <p className="text-xs uppercase tracking-wider font-bold mb-1 opacity-60">Developer</p>
                  <p className="font-medium flex items-center gap-2">
                    <Terminal size={16} className="text-blue-500" />
                    [Your Name / Company]
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isPrivacyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border",
                isDarkMode ? "bg-[#0a0a0a] border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <div className={cn("flex items-center justify-between p-4 sm:p-6 border-b shrink-0", isDarkMode ? "border-white/10 backdrop-blur-md bg-white/5" : "border-slate-200 bg-slate-50/80")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <h2 className={cn("text-lg sm:text-xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Privacy Policy</h2>
                    <p className="text-xs opacity-70">Last Updated: April 2026</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar text-sm sm:text-base leading-relaxed space-y-8">
                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>1. Introduction</h3>
                  <p>TacU- NS respects your privacy and is committed to protecting it.</p>
                </section>
                
                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>2. Data Collection and Usage</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Most processing is done locally on device</li>
                    <li>No personal identifiable information (PII) is collected or stored</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>3. Threat Intelligence & AI</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>URLs, IPs, headers, and queries may be sent to secure backend or third-party APIs for analysis</li>
                    <li>Data is not linked to user identity</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>4. VPN / Privacy Shield</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>No logs of browsing history</li>
                    <li>No DNS logging</li>
                    <li>No traffic monitoring</li>
                    <li>Used only for security and privacy</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>5. Data Sharing</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>No selling or sharing of user data</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>6. Permissions</h3>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-sm bg-black/10 dark:bg-white/5 p-3 rounded-lg mt-2 opacity-80 inline-block text-left w-full">
                    <li>INTERNET</li>
                    <li>ACCESS_NETWORK_STATE</li>
                    <li>ACCESS_WIFI_STATE</li>
                    <li>CHANGE_WIFI_STATE</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>7. Security</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use encryption for all transmissions</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>8. Children's Privacy</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Not intended for users under 13</li>
                  </ul>
                </section>

                <section>
                  <h3 className={cn("text-lg font-bold mb-2", isDarkMode ? "text-blue-400" : "text-blue-600")}>9. Contact</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Email: <a href="mailto:support@tacuns.net" className="text-blue-500 hover:text-blue-400 hover:underline transition-colors">support@tacuns.net</a></li>
                  </ul>
                </section>
              </div>

              <div className={cn("p-4 border-t flex justify-center shrink-0", isDarkMode ? "border-white/10 bg-[#0a0a0a]" : "border-slate-200 bg-white")}>
                <a href="https://tacuns.net/privacy-policy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white font-medium text-sm transition-all group">
                  <span>View Full Policy Online</span>
                  <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
