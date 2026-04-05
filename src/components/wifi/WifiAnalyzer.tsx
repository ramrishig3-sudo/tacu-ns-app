import React, { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Signal,
  Lock,
  Unlock,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Activity,
  Globe,
  Zap,
  Eye,
  Radio,
  Router,
  ServerCrash,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────
interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  signal: number;       // dBm (-30 to -90)
  signalPercent: number; // 0-100
  frequency: number;     // MHz (2412-5825)
  channel: number;
  security: "WPA3" | "WPA2" | "WPA" | "WEP" | "Open";
  band: "2.4 GHz" | "5 GHz";
  isConnected: boolean;
  vendor: string;
}

interface SecurityIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}

// ─── Simulated WiFi Data ──────────────────────────────────
// In production Android app, this will be replaced with Capacitor WiFi plugin data
function generateNetworks(): WifiNetwork[] {
  return [
    {
      id: "net-1", ssid: "MyHomeNetwork", bssid: "A4:CF:12:8B:3E:01",
      signal: -35, signalPercent: 92, frequency: 5180, channel: 36,
      security: "WPA3", band: "5 GHz", isConnected: true, vendor: "TP-Link",
    },
    {
      id: "net-2", ssid: "MyHomeNetwork_2G", bssid: "A4:CF:12:8B:3E:02",
      signal: -42, signalPercent: 85, frequency: 2437, channel: 6,
      security: "WPA2", band: "2.4 GHz", isConnected: false, vendor: "TP-Link",
    },
    {
      id: "net-3", ssid: "Neighbor_WiFi", bssid: "00:1A:2B:3C:4D:5E",
      signal: -58, signalPercent: 64, frequency: 2462, channel: 11,
      security: "WPA2", band: "2.4 GHz", isConnected: false, vendor: "Netgear",
    },
    {
      id: "net-4", ssid: "CoffeeShop_Free", bssid: "D8:47:32:A1:B2:C3",
      signal: -72, signalPercent: 38, frequency: 2412, channel: 1,
      security: "Open", band: "2.4 GHz", isConnected: false, vendor: "Cisco",
    },
    {
      id: "net-5", ssid: "DIRECT-HP-Printer", bssid: "62:FF:B9:12:34:56",
      signal: -65, signalPercent: 50, frequency: 2437, channel: 6,
      security: "WPA2", band: "2.4 GHz", isConnected: false, vendor: "HP Inc.",
    },
    {
      id: "net-6", ssid: "5G_Office_Net", bssid: "F4:92:BF:AA:BB:CC",
      signal: -48, signalPercent: 78, frequency: 5240, channel: 48,
      security: "WPA3", band: "5 GHz", isConnected: false, vendor: "ASUS",
    },
    {
      id: "net-7", ssid: "OldRouter_Legacy", bssid: "00:26:F2:DD:EE:FF",
      signal: -80, signalPercent: 18, frequency: 2427, channel: 4,
      security: "WEP", band: "2.4 GHz", isConnected: false, vendor: "D-Link",
    },
    {
      id: "net-8", ssid: "Apartment_304", bssid: "B0:BE:76:11:22:33",
      signal: -55, signalPercent: 68, frequency: 5500, channel: 100,
      security: "WPA2", band: "5 GHz", isConnected: false, vendor: "Xiaomi",
    },
    {
      id: "net-9", ssid: "", bssid: "9C:B6:D0:44:55:66",
      signal: -70, signalPercent: 40, frequency: 2452, channel: 9,
      security: "WPA2", band: "2.4 GHz", isConnected: false, vendor: "Unknown",
    },
    {
      id: "net-10", ssid: "Guest_Network", bssid: "A4:CF:12:8B:3E:03",
      signal: -38, signalPercent: 90, frequency: 2437, channel: 6,
      security: "WPA2", band: "2.4 GHz", isConnected: false, vendor: "TP-Link",
    },
  ];
}

function analyzeSecurityIssues(networks: WifiNetwork[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const connected = networks.find((n) => n.isConnected);

  // Check for open networks
  const openNets = networks.filter((n) => n.security === "Open");
  if (openNets.length > 0) {
    issues.push({
      id: "open-net",
      severity: "critical",
      title: `${openNets.length} Open/Unsecured Network${openNets.length > 1 ? "s" : ""} Detected`,
      description: `"${openNets.map((n) => n.ssid || "Hidden").join('", "')}" ${openNets.length > 1 ? "are" : "is"} broadcasting without encryption. Anyone can intercept traffic on ${openNets.length > 1 ? "these networks" : "this network"}.`,
      recommendation: "Never connect to open networks for banking or sensitive tasks. Use VPN if you must connect.",
    });
  }

  // Check for WEP
  const wepNets = networks.filter((n) => n.security === "WEP");
  if (wepNets.length > 0) {
    issues.push({
      id: "wep-net",
      severity: "critical",
      title: `WEP Encryption Detected (Critically Vulnerable)`,
      description: `"${wepNets.map((n) => n.ssid || "Hidden").join('", "')}" ${wepNets.length > 1 ? "use" : "uses"} WEP, which can be cracked in minutes with modern tools.`,
      recommendation: "If this is your network, immediately upgrade to WPA2 or WPA3 in router settings.",
    });
  }

  // Hidden SSID
  const hiddenNets = networks.filter((n) => !n.ssid);
  if (hiddenNets.length > 0) {
    issues.push({
      id: "hidden-ssid",
      severity: "info",
      title: `${hiddenNets.length} Hidden Network${hiddenNets.length > 1 ? "s" : ""} Detected`,
      description: "Networks with hidden SSIDs are broadcasting but not announcing their name. This may indicate a corporate or security-conscious network.",
      recommendation: "Hidden SSIDs don't provide real security. MAC filtering and WPA3 are more effective.",
    });
  }

  // Channel congestion
  const channelMap: Record<number, number> = {};
  networks.forEach((n) => {
    channelMap[n.channel] = (channelMap[n.channel] || 0) + 1;
  });
  const congestedChannels = Object.entries(channelMap).filter(([_, count]) => count >= 3);
  if (congestedChannels.length > 0) {
    issues.push({
      id: "channel-congestion",
      severity: "warning",
      title: "Channel Congestion Detected",
      description: `Channel${congestedChannels.length > 1 ? "s" : ""} ${congestedChannels.map(([ch]) => ch).join(", ")} ${congestedChannels.length > 1 ? "have" : "has"} ${congestedChannels[0][1]}+ networks competing. This degrades speed and reliability.`,
      recommendation: "Switch your router to a less crowded channel (1, 6, or 11 for 2.4GHz) or use 5GHz band.",
    });
  }

  // Connected network check
  if (connected) {
    if (connected.security === "WPA3") {
      issues.push({
        id: "connected-secure",
        severity: "info",
        title: "Your Connection Uses WPA3 (Maximum Security)",
        description: `You are connected to "${connected.ssid}" with WPA3 encryption — the strongest WiFi security standard available.`,
        recommendation: "Your connection is well-secured. Continue using WPA3.",
      });
    } else if (connected.security === "WPA2") {
      issues.push({
        id: "connected-wpa2",
        severity: "info",
        title: "Your Connection Uses WPA2 (Good Security)",
        description: `You are connected to "${connected.ssid}" with WPA2 encryption — adequate security for most use cases.`,
        recommendation: "Consider upgrading to WPA3 if your router supports it for enhanced protection.",
      });
    }
  }

  return issues;
}

// ─── Main Component ──────────────────────────────────────
export default function WifiAnalyzer() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [filterBand, setFilterBand] = useState<"all" | "2.4 GHz" | "5 GHz">("all");
  const [sortBy, setSortBy] = useState<"signal" | "channel" | "security">("signal");
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [isNative, setIsNative] = useState(false);

  // Check if running on native (Capacitor)
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        setIsNative(Capacitor.isNativePlatform());
      } catch {
        setIsNative(false);
      }
    };
    checkPlatform();
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setSelectedNetwork(null);

    try {
      // Simulate scanning delay (on Android, this will call native WiFi API)
      await new Promise((r) => setTimeout(r, 2000));

      const scannedNetworks = generateNetworks();
      // Add slight randomness to signal strength to simulate real-time changes
      const randomized = scannedNetworks.map((n) => ({
        ...n,
        signal: n.signal + Math.floor(Math.random() * 6 - 3),
        signalPercent: Math.min(100, Math.max(0, n.signalPercent + Math.floor(Math.random() * 8 - 4))),
      }));

      setNetworks(randomized);
      setSecurityIssues(analyzeSecurityIssues(randomized));
      setLastScan(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Wifi Scan failed", err);
    } finally {
      setScanning(false);
    }
  }, []);

  // Filter and sort
  const displayedNetworks = networks
    .filter((n) => filterBand === "all" || n.band === filterBand)
    .sort((a, b) => {
      if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1; // Connected first
      if (sortBy === "signal") return b.signalPercent - a.signalPercent;
      if (sortBy === "channel") return a.channel - b.channel;
      // security: WPA3 > WPA2 > WPA > WEP > Open
      const secOrder = { WPA3: 5, WPA2: 4, WPA: 3, WEP: 2, Open: 1 };
      return secOrder[b.security] - secOrder[a.security];
    });

  const connectedNetwork = networks.find((n) => n.isConnected);

  // Stats
  const totalNetworks = networks.length;
  const secureNetworks = networks.filter((n) => n.security === "WPA2" || n.security === "WPA3").length;
  const unsecureNetworks = networks.filter((n) => n.security === "Open" || n.security === "WEP").length;
  const avg2GHz = networks.filter((n) => n.band === "2.4 GHz");
  const avg5GHz = networks.filter((n) => n.band === "5 GHz");

  const getSignalColor = (percent: number) => {
    if (percent >= 70) return "text-emerald-400";
    if (percent >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getSignalLabel = (percent: number) => {
    if (percent >= 70) return "Excellent";
    if (percent >= 50) return "Good";
    if (percent >= 30) return "Fair";
    return "Weak";
  };

  const getSecurityColor = (security: string) => {
    if (security === "WPA3") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (security === "WPA2") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (security === "WPA") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (security === "WEP") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20"; // Open
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cyber-card"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/10 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] -ml-32 -mb-32" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-teal-600/20 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-600/10 border border-teal-500/20">
            <Wifi size={32} />
          </div>
          <div className="flex-1">
            <h3 className="cyber-title bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              WiFi Analyzer
            </h3>
            <p className="cyber-text-s mt-1">
              Scan nearby networks, analyze signal strength, detect security vulnerabilities, and optimize your connection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isNative && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Simulated Data
              </span>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                scanning
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/20"
                  : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-600/25"
              )}
            >
              {scanning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </div>
        </div>

        {lastScan && (
          <p className="cyber-text-s mt-4 relative z-10">
            Last scan: {lastScan} • Found {totalNetworks} networks
          </p>
        )}
      </motion.div>

      {/* ── Connected Network ──────────────────────────────── */}
      {connectedNetwork && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-1 rounded-[28px] bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-emerald-500/40 shadow-xl shadow-emerald-500/10"
        >
          <div className="p-5 md:p-6 rounded-[27px] bg-[#0a0a0c]/90 backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Currently Connected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="cyber-text-xs">Network Name</p>
                <p className="text-sm md:text-base font-bold text-white mt-1">{connectedNetwork.ssid}</p>
              </div>
              <div>
                <p className="cyber-text-xs">Security</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Lock size={14} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">{connectedNetwork.security}</span>
                </div>
              </div>
              <div>
                <p className="cyber-text-xs">Signal Strength</p>
                <p className={cn("text-sm md:text-base font-bold mt-1", getSignalColor(connectedNetwork.signalPercent))}>
                  {connectedNetwork.signalPercent}% ({getSignalLabel(connectedNetwork.signalPercent)})
                </p>
              </div>
              <div>
                <p className="cyber-text-xs">Band / Channel</p>
                <p className="text-sm font-bold text-blue-400 mt-1">
                  {connectedNetwork.band} • Ch {connectedNetwork.channel}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Quick Stats ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
      >
        <div className="cyber-card text-center">
          <Radio size={24} className="text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-blue-400">{totalNetworks}</p>
          <p className="cyber-text-xs mt-1">Networks Found</p>
        </div>
        <div className="cyber-card text-center">
          <ShieldCheck size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-emerald-400">{secureNetworks}</p>
          <p className="cyber-text-xs mt-1">Secure (WPA2/3)</p>
        </div>
        <div className="cyber-card text-center">
          <ShieldAlert size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-red-400">{unsecureNetworks}</p>
          <p className="cyber-text-xs mt-1">Vulnerable</p>
        </div>
        <div className="cyber-card text-center">
          <Activity size={24} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-purple-400">{avg5GHz.length}</p>
          <p className="cyber-text-xs mt-1">5 GHz Networks</p>
        </div>
      </motion.div>

      {/* ── Security Issues ────────────────────────────────── */}
      {securityIssues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="cyber-card"
        >
          <h4 className="cyber-subtitle mb-4 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            Security Analysis
            <span className="cyber-badge bg-red-500/10 border-red-500/20 text-red-400">
              {securityIssues.filter((i) => i.severity === "critical").length} Critical
            </span>
          </h4>
          <div className="space-y-3">
            {securityIssues.map((issue) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  issue.severity === "critical"
                    ? "bg-red-500/5 border-red-500/15"
                    : issue.severity === "warning"
                    ? "bg-amber-500/5 border-amber-500/15"
                    : "bg-blue-500/5 border-blue-500/15"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      issue.severity === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : issue.severity === "warning"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {issue.severity === "critical" ? (
                      <AlertTriangle size={16} />
                    ) : issue.severity === "warning" ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Info size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">{issue.title}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                          issue.severity === "critical"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : issue.severity === "warning"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <p className="cyber-text-s mb-2">{issue.description}</p>
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-white/[0.03]">
                      <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-emerald-400/80 font-medium">{issue.recommendation}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Network List ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="cyber-card"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h4 className="cyber-subtitle flex items-center gap-2">
            <Router size={18} className="text-blue-500" />
            Nearby Networks
            <span className="cyber-badge bg-blue-500/10 border-blue-500/20 text-blue-400">
              {displayedNetworks.length}
            </span>
          </h4>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Band Filter */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
              {(["all", "2.4 GHz", "5 GHz"] as const).map((band) => (
                <button
                  key={band}
                  onClick={() => setFilterBand(band)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                    filterBand === band
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {band === "all" ? "All" : band}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-300 outline-none"
            >
              <option value="signal">Sort: Signal</option>
              <option value="channel">Sort: Channel</option>
              <option value="security">Sort: Security</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {scanning ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="relative w-24 h-24 mb-4">
                <motion.div
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-teal-400/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-teal-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wifi size={36} className="text-teal-400 animate-pulse" />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-300">Scanning for WiFi networks...</p>
              <p className="cyber-text-s mt-1">Analyzing signals, channels, and security</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {displayedNetworks.map((network, idx) => (
                <motion.div
                  key={network.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedNetwork(selectedNetwork?.id === network.id ? null : network)}
                  className={cn(
                    "p-3 md:p-4 rounded-xl border cursor-pointer transition-all group",
                    network.isConnected
                      ? "bg-emerald-500/5 border-emerald-500/20 ring-1 ring-emerald-500/10"
                      : selectedNetwork?.id === network.id
                      ? "bg-blue-500/5 border-blue-500/20"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Signal Icon */}
                    <div className={cn("shrink-0", getSignalColor(network.signalPercent))}>
                      {network.signalPercent >= 50 ? <Wifi size={20} /> : <Wifi size={20} className="opacity-50" />}
                    </div>

                    {/* Name & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm font-bold text-slate-200 truncate">
                          {network.ssid || "(Hidden Network)"}
                        </span>
                        {network.isConnected && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="cyber-text-s">{network.bssid} • {network.vendor}</p>
                    </div>

                    {/* Security Badge */}
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 shrink-0",
                      getSecurityColor(network.security)
                    )}>
                      {network.security === "Open" ? <Unlock size={10} /> : <Lock size={10} />}
                      {network.security}
                    </div>

                    {/* Signal Strength */}
                    <div className="text-right shrink-0 w-16">
                      <p className={cn("text-xs font-bold", getSignalColor(network.signalPercent))}>
                        {network.signalPercent}%
                      </p>
                      <p className="text-[9px] text-slate-600">{network.signal} dBm</p>
                    </div>

                    {/* Band */}
                    <span className="cyber-badge bg-white/5 border-white/10 text-slate-500 shrink-0 hidden sm:inline-flex">
                      Ch {network.channel} • {network.band}
                    </span>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedNetwork?.id === network.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-2.5 rounded-lg bg-white/[0.03]">
                            <p className="cyber-text-xs">Signal Quality</p>
                            <p className={cn("text-sm font-bold mt-1", getSignalColor(network.signalPercent))}>
                              {getSignalLabel(network.signalPercent)}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.03]">
                            <p className="cyber-text-xs">Frequency</p>
                            <p className="text-sm font-bold text-blue-400 mt-1">{network.frequency} MHz</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.03]">
                            <p className="cyber-text-xs">MAC Address</p>
                            <p className="text-[10px] font-mono font-bold text-slate-300 mt-1">{network.bssid}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.03]">
                            <p className="cyber-text-xs">Manufacturer</p>
                            <p className="text-sm font-bold text-slate-300 mt-1">{network.vendor}</p>
                          </div>
                        </div>

                        {/* Signal Strength Bar */}
                        <div className="mt-3 p-3 rounded-lg bg-white/[0.03]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="cyber-text-xs">Signal Strength</span>
                            <span className={cn("text-xs font-bold", getSignalColor(network.signalPercent))}>
                              {network.signalPercent}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${network.signalPercent}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full",
                                network.signalPercent >= 70 ? "bg-emerald-500" :
                                network.signalPercent >= 40 ? "bg-amber-500" : "bg-red-500"
                              )}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Channel Distribution ───────────────────────────── */}
      {networks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="cyber-card"
        >
          <h4 className="cyber-subtitle mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            Channel Distribution (2.4 GHz)
          </h4>
          <div className="flex items-end gap-1 h-32">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((ch) => {
              const count = networks.filter((n) => n.channel === ch && n.band === "2.4 GHz").length;
              const height = count > 0 ? Math.max(20, (count / 3) * 100) : 4;
              return (
                <div key={ch} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 4 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: ch * 0.03 }}
                    className={cn(
                      "w-full rounded-t-md",
                      count >= 3 ? "bg-red-500/60" :
                      count >= 2 ? "bg-amber-500/60" :
                      count >= 1 ? "bg-blue-500/60" : "bg-white/5"
                    )}
                  />
                  <span className="text-[9px] text-slate-600">{ch}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/60" />
              <span className="text-[10px] text-slate-500">1 network</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/60" />
              <span className="text-[10px] text-slate-500">2 networks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
              <span className="text-[10px] text-slate-500">3+ (congested)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Android Info Notice ─────────────────────────────── */}
      {!isNative && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 md:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/15 border-dashed"
        >
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-400 mb-1">Development Mode — Simulated Data</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                WiFi scanning data is simulated in the browser. When running as a native Android app (via Capacitor), 
                the WiFi Analyzer will use the <code className="text-blue-400 text-[10px]">WifiManager</code> API to scan real 
                nearby networks, display actual signal strengths, and perform live security analysis. 
                The full feature set requires <code className="text-blue-400 text-[10px]">ACCESS_FINE_LOCATION</code> and 
                <code className="text-blue-400 text-[10px]"> ACCESS_WIFI_STATE</code> permissions on Android.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
