import React, { useState, useEffect } from "react";
import {
  Shield, Network, Wifi, Terminal, Settings, Menu, MessageSquare,
  Sun, Moon, LockKeyhole, LayoutDashboard, X, ExternalLink,
  ShieldCheck, Lock, ArrowRight, QrCode, Sparkles, Gauge,
  Bluetooth, ScanLine, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// ─── Eager imports (unchanged — prevents lazy-load blank screens in Capacitor) ──
import Dashboard       from "./components/dashboard/Dashboard";
import ThreatIntel     from "./components/threat/ThreatIntel";
import NetworkAnalyzer from "./components/network/NetworkAnalyzer";
import Toolkit         from "./components/toolkit/Toolkit";
import AIAssistant     from "./components/ai/AIAssistant";
import WifiAnalyzer    from "./components/wifi/WifiAnalyzer";
import VPNModule       from "./components/vpn/VPNModule";
import QRScanner       from "./components/qr/QRScanner";
import QRGenerator     from "./components/qr/QRGenerator";
import SpeedTest       from "./components/speedtest/SpeedTest";
import BluetoothScanner from "./components/bluetooth/BluetoothScanner";
import LANScanner      from "./components/lan/LANScanner";
import ErrorBoundary   from "./components/common/ErrorBoundary";
import { App as CapacitorApp } from "@capacitor/app";

type Tab = "dashboard" | "threat" | "network" | "wifi" | "qr" | "qrgen" | "vpn" | "toolkit" | "ai" | "settings" | "speedtest" | "bluetooth" | "lan";

// ─── Per-feature accent colors for the "All Features" sheet ───────────────────
const FEATURE_COLORS: Record<string, string> = {
  dashboard:  "#38BDF8",
  threat:     "#F87171",
  network:    "#60A5FA",
  speedtest:  "#34D399",
  wifi:       "#A78BFA",
  qr:         "#FCD34D",
  qrgen:      "#06B6D4",
  vpn:        "#8B5CF6",
  toolkit:    "#F97316",
  bluetooth:  "#38BDF8",
  lan:        "#34D399",
  ai:         "#C084FC",
};

// ─── Feature groups for section headers ───────────────────────────────────────
const FEATURE_GROUPS = [
  { label: "Core Modules",  ids: ["dashboard", "threat", "network"] },
  { label: "Utilities",     ids: ["speedtest", "wifi", "qr", "qrgen", "vpn", "toolkit"] },
  { label: "Intelligence",  ids: ["bluetooth", "lan", "ai"] },
];

export default function App() {

  // ── State (all unchanged) ──────────────────────────────────────────────
  const [activeTab,         setActiveTab]         = useState<Tab>("dashboard");
  const [isSidebarOpen,     setIsSidebarOpen]     = useState(true);
  const [isDarkMode,        setIsDarkMode]        = useState(true);
  const [isMobileMenuOpen,  setIsMobileMenuOpen]  = useState(false);
  const [isAboutModalOpen,  setIsAboutModalOpen]  = useState(false);
  const [isPrivacyModalOpen,setIsPrivacyModalOpen]= useState(false);
  const [history,           setHistory]           = useState<Tab[]>([]);
  const [toast,             setToast]             = useState<string | null>(null);
  const [lastBackPress,     setLastBackPress]     = useState(0);

  // ── Back-button handler (logic completely unchanged) ───────────────────
  useEffect(() => {
    const handleBackButton = async () => {
      if (isAboutModalOpen)   { setIsAboutModalOpen(false);   return; }
      if (isPrivacyModalOpen) { setIsPrivacyModalOpen(false); return; }
      if (isMobileMenuOpen)   { setIsMobileMenuOpen(false);   return; }
      if (history.length > 0) {
        const prevTab = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setActiveTab(prevTab);
        return;
      }
      if (activeTab === "dashboard") {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          CapacitorApp.exitApp();
        } else {
          setLastBackPress(now);
          showToast("Press back again to exit");
        }
      } else {
        navigateTo("dashboard");
      }
    };
    const listener = CapacitorApp.addListener("backButton", handleBackButton);
    return () => { listener.then(l => l.remove()); };
  }, [activeTab, history, isAboutModalOpen, isPrivacyModalOpen, isMobileMenuOpen, lastBackPress]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // ── Nav items (completely unchanged) ──────────────────────────────────
  const navItems = [
    { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
    { id: "threat",     label: "Threat Intel",   icon: Shield },
    { id: "network",    label: "Network",        icon: Network },
    { id: "speedtest",  label: "Speed Test",     icon: Gauge },
    { id: "wifi",       label: "WiFi Analyzer",  icon: Wifi },
    { id: "qr",         label: "QR Scanner",     icon: QrCode },
    { id: "qrgen",      label: "QR Generate",    icon: Sparkles },
    { id: "vpn",        label: "Privacy Shield", icon: LockKeyhole },
    { id: "toolkit",    label: "Toolkit",        icon: Terminal },
    { id: "bluetooth",  label: "BLE Scanner",    icon: Bluetooth },
    { id: "lan",        label: "LAN Scanner",    icon: ScanLine },
    { id: "ai",         label: "AI Assistant",   icon: MessageSquare },
  ];

  const navigateTo = (tab: Tab) => {
    if (tab !== activeTab) setHistory(prev => [...prev, activeTab].slice(-10));
    setActiveTab(tab);
    if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const el = document.getElementById("main-content-area");
    if (el) el.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  const activeLabel = navItems.find(i => i.id === activeTab)?.label ?? "Settings";

  // ── Bottom nav — 4 primary items pinned; rest via "Menu" sheet ─────────
  const primaryNav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "threat",    label: "Threats",   icon: Shield },
    { id: "network",   label: "Network",   icon: Network },
    { id: "toolkit",   label: "Tools",     icon: Terminal },
  ];
  const isInPrimary = primaryNav.some(n => n.id === activeTab);

  // ── All features including Settings for the "More" sheet ──────────────
  const allFeatures = [
    ...navItems,
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen flex overflow-hidden font-sans transition-colors duration-300"
         style={{ background: "var(--bg-main)", color: "var(--text-primary)" }}>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile (lg: only). Unchanged logic.
      ══════════════════════════════════════════════════════════════════ */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r transition-all duration-300",
        isSidebarOpen ? "w-60" : "w-[60px]",
      )} style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-color)" }}>

        {/* Logo */}
        <div className="h-16 flex items-center px-3.5 gap-3 shrink-0 border-b"
             style={{ borderColor: "var(--border-color)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
               style={{ background: "linear-gradient(135deg,#38BDF8,#2563EB)", boxShadow: "0 4px 14px rgba(56,189,248,0.30)" }}>
            <Shield size={18} className="text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-base tracking-tighter uppercase select-none"
                  style={{ color: "var(--text-primary)" }}>
              TacU<span style={{ color: "var(--primary)" }}>-NS</span>
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => navigateTo(item.id as Tab)}
                className={cn("nav-pill w-full", isActive ? "nav-pill-active" : "nav-pill-inactive")}>
                <item.icon size={16} className="shrink-0" />
                {isSidebarOpen && <span className="truncate text-[11px]">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2.5 border-t space-y-0.5" style={{ borderColor: "var(--border-color)" }}>
          <button onClick={() => navigateTo("settings")}
            className={cn("nav-pill w-full", activeTab === "settings" ? "nav-pill-active" : "nav-pill-inactive")}>
            <Settings size={16} />
            {isSidebarOpen && <span className="text-[11px]">Settings</span>}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-2 rounded-xl w-full justify-center mt-1 transition-all"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(148,163,184,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}>
            <Menu size={16} className={cn("transition-transform duration-400", !isSidebarOpen && "rotate-180")} />
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="shrink-0 sticky top-0 z-30 backdrop-blur-xl"
                style={{ background: "var(--bg-header)", borderBottom: "1px solid var(--border-color)" }}>
          <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6">

            {/* Left: logo (mobile tap → opens sheet) + breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{ background: "linear-gradient(135deg,#38BDF8,#2563EB)", boxShadow: "0 2px 10px rgba(56,189,248,0.25)" }}
              >
                <Shield size={14} className="text-white" />
              </button>
              <div className="flex flex-col gap-0">
                <span className="text-[7.5px] font-black uppercase tracking-[0.24em] leading-none"
                      style={{ color: "var(--primary)" }}>Intelligence Core</span>
                <h1 className="text-[17px] lg:text-xl font-black tracking-tight leading-tight"
                    style={{ color: "var(--text-primary)" }}>{activeLabel}</h1>
              </div>
            </div>

            {/* Right: status + actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center">
                <span className="secure-badge"><span className="live-badge-dot" />TLS Active</span>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl border transition-all active:scale-90"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "var(--bg-card)" }}>
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button onClick={() => setIsAboutModalOpen(true)}
                className="p-2 rounded-xl border transition-all active:scale-90"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}>
                <ShieldCheck size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable Content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative" id="main-content-area">
          {/* pb-24 on mobile keeps content above the fixed bottom nav */}
          <div className="max-w-[1400px] mx-auto p-4 md:p-5 lg:p-6 pb-24 lg:pb-6 min-h-full">
            <AnimatePresence mode="wait">

              {activeTab === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><Dashboard onNavigate={navigateTo} /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "threat" && (
                <motion.div key="threat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><ThreatIntel /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "network" && (
                <motion.div key="network" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><NetworkAnalyzer /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "speedtest" && (
                <motion.div key="speedtest" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><SpeedTest /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "wifi" && (
                <motion.div key="wifi" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><WifiAnalyzer /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "qr" && (
                <motion.div key="qr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><QRScanner /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "qrgen" && (
                <motion.div key="qrgen" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><QRGenerator /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "vpn" && (
                <motion.div key="vpn" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><VPNModule /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "toolkit" && (
                <motion.div key="toolkit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><Toolkit /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "bluetooth" && (
                <motion.div key="bluetooth" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><BluetoothScanner /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "lan" && (
                <motion.div key="lan" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><LANScanner /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "ai" && (
                <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary><AIAssistant /></ErrorBoundary>
                </motion.div>
              )}
              {activeTab === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="w-full h-full">
                  <ErrorBoundary>
                    <div className="space-y-4 pb-20">
                      <section style={{
                        background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                        border: "1px solid rgba(148,163,184,0.1)",
                        borderRadius: 20,
                        padding: 20,
                      }}>
                        <h2 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 20 }}>Preferences</h2>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 rounded-xl border transition-all"
                               style={{ background: "rgba(148,163,184,0.05)", borderColor: "var(--border-color)" }}>
                            <div>
                              <p className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>Dark Mode</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-secondary)" }}>Toggle dark / light display</p>
                            </div>
                            <button onClick={() => setIsDarkMode(!isDarkMode)}
                              className={cn("w-10 h-5 rounded-full relative transition-all p-0.5", isDarkMode ? "bg-blue-500" : "bg-slate-300")}>
                              <motion.div animate={{ x: isDarkMode ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                          </div>
                          <button onClick={() => setIsPrivacyModalOpen(true)}
                            className="w-full text-left p-4 rounded-xl border transition-all group flex items-center justify-between"
                            style={{ borderColor: "var(--border-color)" }}>
                            <div>
                              <p className="font-bold text-xs uppercase" style={{ color: "var(--text-primary)" }}>Privacy Protocol</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-secondary)" }}>Review locality and audit trails</p>
                            </div>
                            <ExternalLink size={15} style={{ color: "var(--text-secondary)" }} />
                          </button>
                        </div>
                      </section>
                    </div>
                  </ErrorBoundary>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BOTTOM NAVIGATION BAR — mobile only (hidden on lg+)
        ══════════════════════════════════════════════════════════════ */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
             style={{ background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-color)" }}>
          <div className="flex items-stretch" style={{ height: 60 }}>

            {primaryNav.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id as Tab)}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-all active:scale-90"
                >
                  {/* Top accent line for active */}
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                      style={{ width: 28, height: 2, background: "var(--primary)" }}
                    />
                  )}
                  <item.icon
                    size={19}
                    style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}
                  />
                  <span className="text-[7.5px] font-black uppercase tracking-wider"
                        style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* "Menu" — opens the full feature sheet */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-all active:scale-90"
            >
              {!isInPrimary && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                  style={{ width: 28, height: 2, background: "var(--primary)" }}
                />
              )}
              <Menu size={19}
                style={{ color: !isInPrimary ? "var(--primary)" : "var(--text-muted)" }} />
              <span className="text-[7.5px] font-black uppercase tracking-wider"
                    style={{ color: !isInPrimary ? "var(--primary)" : "var(--text-muted)" }}>
                Menu
              </span>
            </button>

          </div>
        </nav>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE FULL-FEATURE SHEET
          Slide-up bottom sheet showing all 13 features in a 3-col grid.
          Triggered by tapping the "Menu" bottom nav item or the header logo.
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/82 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-3xl flex flex-col"
              style={{
                background: "linear-gradient(180deg, #0D1628 0%, #080E1C 100%)",
                borderTop:   "1px solid rgba(56,189,248,0.22)",
                borderLeft:  "1px solid rgba(56,189,248,0.10)",
                borderRight: "1px solid rgba(56,189,248,0.10)",
                maxHeight: "90vh",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.70), 0 -1px 0 rgba(56,189,248,0.06)",
              }}
            >
              {/* Pull handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-[3px] rounded-full"
                     style={{ background: "rgba(56,189,248,0.35)" }} />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em]"
                     style={{ color: "#38BDF8" }}>TacU-NS</p>
                  <p className="text-[19px] font-black uppercase tracking-tight leading-tight mt-0.5"
                     style={{ color: "#E2E8F0" }}>All Features</p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: "rgba(56,189,248,0.08)",
                    border: "1px solid rgba(56,189,248,0.18)",
                    color: "#94A3B8",
                  }}>
                  <X size={15} />
                </button>
              </div>

              {/* Gradient divider */}
              <div className="mx-5 mb-4 shrink-0" style={{ height: 1,
                background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.22) 50%, transparent 100%)" }} />

              {/* ── Scrollable feature list ── */}
              <div
                className="flex-1 overflow-y-auto no-scrollbar px-4"
                style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 20px))" }}
              >

                {/* ── Grouped feature cards ────────────────────────────── */}
                {FEATURE_GROUPS.map(group => {
                  const groupItems = group.ids
                    .map(id => allFeatures.find(f => f.id === id))
                    .filter(Boolean) as typeof allFeatures;
                  return (
                    <div key={group.label} className="mb-5">
                      {/* Section header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-black uppercase tracking-[0.18em]"
                              style={{ fontSize: 9, color: "rgba(148,163,184,0.45)" }}>
                          {group.label}
                        </span>
                        <div className="flex-1 h-px"
                             style={{ background: "rgba(56,189,248,0.08)" }} />
                      </div>

                      {/* Feature card grid */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {groupItems.map(item => {
                          const active  = activeTab === item.id;
                          const color   = FEATURE_COLORS[item.id] ?? "#38BDF8";
                          const colorHex = (opacity: number) =>
                            `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => navigateTo(item.id as Tab)}
                              whileTap={{ scale: 0.87 }}
                              className="flex flex-col items-center rounded-2xl"
                              style={{
                                padding: "14px 6px 11px",
                                gap: 9,
                                border: active
                                  ? `1px solid ${colorHex(0.50)}`
                                  : `1px solid ${colorHex(0.18)}`,
                                background: active
                                  ? colorHex(0.12)
                                  : `linear-gradient(145deg, rgba(13,21,42,0.85), rgba(8,14,28,0.90))`,
                                boxShadow: active
                                  ? `0 0 20px ${colorHex(0.20)}, 0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 ${colorHex(0.10)}`
                                  : `0 2px 10px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.03)`,
                              }}
                            >
                              {/* Icon container */}
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                                   style={{
                                     background: active ? colorHex(0.20) : colorHex(0.10),
                                     border: `1px solid ${colorHex(active ? 0.35 : 0.22)}`,
                                   }}>
                                <item.icon
                                  size={20}
                                  style={{ color: active ? color : colorHex(0.75) }}
                                />
                              </div>
                              {/* Label */}
                              <span className="font-black uppercase text-center leading-tight"
                                    style={{
                                      fontSize: 10,
                                      letterSpacing: "0.055em",
                                      color: active ? color : "#94A3B8",
                                    }}>
                                {item.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* ── Settings — full-width horizontal row ─────────────── */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-black uppercase tracking-[0.18em]"
                          style={{ fontSize: 9, color: "rgba(148,163,184,0.45)" }}>
                      System
                    </span>
                    <div className="flex-1 h-px"
                         style={{ background: "rgba(56,189,248,0.08)" }} />
                  </div>
                  <motion.button
                    onClick={() => navigateTo("settings")}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center gap-3 rounded-2xl transition-all"
                    style={{
                      padding: "14px 16px",
                      border: activeTab === "settings"
                        ? "1px solid rgba(100,116,139,0.50)"
                        : "1px solid rgba(100,116,139,0.20)",
                      background: activeTab === "settings"
                        ? "rgba(100,116,139,0.12)"
                        : "linear-gradient(145deg, rgba(13,21,42,0.85), rgba(8,14,28,0.90))",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.50)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{
                           background: "rgba(100,116,139,0.14)",
                           border: "1px solid rgba(100,116,139,0.28)",
                         }}>
                      <Settings size={18} style={{ color: "#94A3B8" }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black uppercase tracking-wide"
                         style={{ fontSize: 11, color: activeTab === "settings" ? "#CBD5E1" : "#94A3B8" }}>
                        Settings
                      </p>
                      <p className="font-bold uppercase tracking-wider mt-0.5"
                         style={{ fontSize: 8, color: "#475569" }}>
                        Theme · Privacy · About
                      </p>
                    </div>
                    <ChevronRight size={15} style={{ color: "#475569" }} />
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          ABOUT MODAL (content unchanged)
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-sm p-6 border rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)", backdropFilter: "blur(24px)" }}
            >
              <button onClick={() => setIsAboutModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl border transition-all hover:bg-red-500 hover:text-white hover:border-red-500 z-10"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                <X size={14} />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
                     style={{ background: "linear-gradient(135deg,#38BDF8,#2563EB)", boxShadow: "0 8px 24px rgba(56,189,248,0.30)" }}>
                  <Shield size={22} className="text-white" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tighter mb-0.5" style={{ color: "var(--text-primary)" }}>
                  TacU<span style={{ color: "var(--primary)" }}>-NS</span>
                </h2>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Network Security Intelligence</p>
                <div className="mt-5 px-4 py-3 rounded-xl w-full text-left border"
                     style={{ background: "rgba(148,163,184,0.05)", borderColor: "var(--border-color)" }}>
                  <p className="text-[10px] font-bold leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    A professional-grade cybersecurity tool for WiFi analysis, threat intelligence, network scanning, and privacy protection.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                  {[{ label: "Version", val: "1.1.0" }, { label: "Contact", val: "support@tacuns.net" }].map(item => (
                    <div key={item.label} className="p-2.5 rounded-xl border" style={{ background: "rgba(148,163,184,0.04)", borderColor: "var(--border-color)" }}>
                      <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                      <p className="text-[10px] font-black truncate" style={{ color: "var(--text-primary)" }}>{item.val}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setIsAboutModalOpen(false); setIsPrivacyModalOpen(true); }}
                  className="mt-4 w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all hover:border-blue-500/50 group"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  <Lock size={11} />
                  Privacy Policy
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <p className="mt-5 text-[7px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  © 2026 TacU-NS. All rights reserved.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Privacy Modal (content unchanged) ─────────────────────── */}
        {isPrivacyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyModalOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-xl h-[72vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)", backdropFilter: "blur(24px)" }}
            >
              <header className="p-5 border-b flex items-center justify-between shrink-0"
                      style={{ background: "rgba(148,163,184,0.04)", borderColor: "var(--border-color)" }}>
                <h2 className="text-base font-black uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>Privacy Policy</h2>
                <button onClick={() => setIsPrivacyModalOpen(false)}
                  className="p-2 rounded-xl border transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  <X size={15} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6 text-[11px] leading-relaxed">
                <div className="p-4 rounded-2xl border" style={{ background: "var(--primary-glow)", borderColor: "rgba(56,189,248,0.20)" }}>
                  <p className="font-bold" style={{ color: "var(--primary)" }}>Effective Date: April 12, 2026</p>
                  <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Version 1.1.0 (Production Release)</p>
                </div>
                {[
                  { title: "1. Data Collection & Prominent Disclosure", body: "TacU-NS uses location access ONLY while the app is in use to scan nearby WiFi networks. SSIDs, signal strength, and security protocols are processed locally. We do NOT track location in the background, nor store or share your location data." },
                  { title: "2. Tactical Data Locality", body: "All coordinates and scan results are processed locally on-device. We follow a strict memory-only protocol for active scans. Your location is never harvested, stored, or sold." },
                  { title: "3. Intelligence Handlers", body: "Threat reputation queries (IP/Domain) are proxied through encrypted TacU nodes. We do not correlate your device identity with specific threat queries." },
                  { title: "4. AI Intelligence Protocol", body: "AI Assistant queries are processed in real-time. Conversations are in-memory only and are NOT stored permanently on our servers. A sliding context window of the last 10 messages is maintained for continuity." },
                  { title: "5. Privacy Shield (IP Identity Analyzer)", body: "The Privacy Shield feature checks your public IP address and GPS-derived location to help you understand your network identity. No VPN tunnel is created. We do not log or store the results of these checks on our servers beyond your active session." },
                ].map(s => (
                  <section key={s.title}>
                    <h3 className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>{s.title}</h3>
                    <p className="font-bold" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
                  </section>
                ))}
                <div className="pt-5 border-t" style={{ borderColor: "var(--border-color)" }}>
                  <button
                    onClick={() => window.open("https://www.tacuns.net/privacy-policy", "_blank")}
                    className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ background: "var(--primary)", color: "#fff", boxShadow: "0 4px 16px rgba(56,189,248,0.25)" }}>
                    View Full Privacy Policy
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast (unchanged) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md border"
            style={{ background: "rgba(10,16,28,0.92)", color: "#E2E8F0", borderColor: "rgba(56,189,248,0.15)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
