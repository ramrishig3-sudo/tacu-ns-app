import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Lock, Unlock, Globe, Zap, Wifi, WifiOff,
  Activity, ArrowUp, ArrowDown, Clock,
  Eye, EyeOff, AlertTriangle, CheckCircle, Info,
  Loader2, Signal, MapPin, RefreshCw, BarChart3,
  Search, Database, Server, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

// ─── Types ────────────────────────────────────────────────
interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  isp: string;
  asn: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface SecurityCheck {
  id: string;
  label: string;
  status: "secure" | "warning" | "risk" | "checking";
  detail: string;
}

interface SpeedResult {
  downloadMbps: number;
  latencyMs: number;
  tested: boolean;
}

// ─── Main Component ──────────────────────────────────────
export default function PrivacyShield() {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [overallRisk, setOverallRisk] = useState<"low" | "medium" | "high" | "unknown">("unknown");
  const [speedResult, setSpeedResult] = useState<SpeedResult>({ downloadMbps: 0, latencyMs: 0, tested: false });
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<"overview" | "analysis" | "speed" | "history">("overview");

  // Fetch real IP info on mount
  const fetchIpInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/my-ip");
      setIpInfo(res.data);
      runSecurityAnalysis(res.data);
    } catch (err) {
      console.error("Failed to fetch IP info:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIpInfo();
    // Load scan history
    try {
      const saved = localStorage.getItem("threat_history");
      if (saved) setScanHistory(JSON.parse(saved));
    } catch {}
  }, [fetchIpInfo]);

  // Run real security analysis based on IP info
  const runSecurityAnalysis = (info: IpInfo) => {
    const checks: SecurityCheck[] = [];

    // 1. HTTPS Check — real
    const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost";
    checks.push({
      id: "https",
      label: "Connection Encryption",
      status: isHttps ? "secure" : "risk",
      detail: isHttps
        ? "Your connection uses HTTPS encryption. Data in transit is protected."
        : "Your connection uses HTTP (unencrypted). Data could be intercepted.",
    });

    // 2. VPN Detection — check ISP name against known VPN providers
    const isp = (info.isp || "").toLowerCase();
    const vpnKeywords = ["vpn", "private", "relay", "proxy", "tunnel", "mullvad", "nord", "express", "surfshark", "wireguard", "cloudflare warp", "proton"];
    const isVpn = vpnKeywords.some((kw) => isp.includes(kw));
    checks.push({
      id: "vpn",
      label: "VPN / Proxy Status",
      status: isVpn ? "secure" : "warning",
      detail: isVpn
        ? `VPN detected (${info.isp}). Your real IP address is hidden.`
        : `No VPN detected. Your IP (${info.ip}) is visible to websites you visit.`,
    });

    // 3. Public IP Exposure — always check
    checks.push({
      id: "ip-exposure",
      label: "IP Address Exposure",
      status: isVpn ? "secure" : "warning",
      detail: isVpn
        ? "Your real IP is masked by your VPN provider."
        : `Your public IP ${info.ip} is exposed. Websites can track your location (${info.city}, ${info.country}).`,
    });

    // 4. ISP Tracking
    checks.push({
      id: "isp-tracking",
      label: "ISP Tracking Risk",
      status: isVpn ? "secure" : "warning",
      detail: isVpn
        ? "VPN prevents your ISP from monitoring your browsing activity."
        : `Your ISP (${info.isp}) can monitor your internet traffic and browsing history.`,
    });

    // 5. Network type check using browser API
    const conn = (navigator as any).connection;
    if (conn) {
      const isPublicWifi = conn.type === "wifi" && !isVpn;
      checks.push({
        id: "network-type",
        label: "Network Safety",
        status: isPublicWifi ? "warning" : "secure",
        detail: conn.type === "wifi"
          ? (isPublicWifi ? "Connected via WiFi without VPN. Public WiFi networks may be unsafe." : "Connected via WiFi with VPN protection.")
          : `Connected via ${conn.type || "unknown"} network.`,
      });
    } else {
      checks.push({
        id: "network-type",
        label: "Network Safety",
        status: "secure",
        detail: "Network connection is active. For enhanced security, use a VPN on public WiFi.",
      });
    }

    // 6. DNS Security
    checks.push({
      id: "dns",
      label: "DNS Privacy",
      status: isVpn ? "secure" : "warning",
      detail: isVpn
        ? "DNS queries are routed through your VPN, preventing DNS leaks."
        : "DNS queries use your ISP's resolver by default. Consider using encrypted DNS (DoH/DoT).",
    });

    setSecurityChecks(checks);

    // Calculate overall risk
    const risks = checks.filter((c) => c.status === "risk").length;
    const warnings = checks.filter((c) => c.status === "warning").length;
    if (risks >= 2) setOverallRisk("high");
    else if (risks >= 1 || warnings >= 3) setOverallRisk("medium");
    else setOverallRisk("low");
  };

  // Real speed test using backend endpoint
  const runSpeedTest = async () => {
    setTestingSpeed(true);
    try {
      // Measure latency first
      const pingStart = performance.now();
      await apiClient.get("/api/speed-test?size=1"); // 1KB for latency
      const latencyMs = Math.round(performance.now() - pingStart);

      // Measure download speed with 256KB payload
      const dlStart = performance.now();
      const res = await apiClient.get("/api/speed-test?size=256", { responseType: "arraybuffer" });
      const dlTime = (performance.now() - dlStart) / 1000; // seconds
      const sizeBytes = res.data.byteLength;
      const downloadMbps = Math.round(((sizeBytes * 8) / dlTime / 1_000_000) * 100) / 100;

      setSpeedResult({ downloadMbps, latencyMs, tested: true });
    } catch (err) {
      console.error("Speed test failed:", err);
    } finally {
      setTestingSpeed(false);
    }
  };

  const riskColors = {
    low: { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/20", glow: "shadow-emerald-500/20" },
    medium: { text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/20", glow: "shadow-amber-500/20" },
    high: { text: "text-red-400", bg: "bg-red-500", border: "border-red-500/20", glow: "shadow-red-500/20" },
    unknown: { text: "text-slate-400", bg: "bg-slate-500", border: "border-slate-500/20", glow: "shadow-slate-500/20" },
  };
  const rc = riskColors[overallRisk];

  // Smart recommendations based on real analysis
  const recommendations = [];
  if (securityChecks.find((c) => c.id === "vpn")?.status !== "secure") {
    recommendations.push({ text: "Use a trusted VPN service when on public WiFi", priority: "high" });
    recommendations.push({ text: "Consider Cloudflare WARP (free) for basic IP privacy", priority: "medium" });
  }
  if (securityChecks.find((c) => c.id === "https")?.status !== "secure") {
    recommendations.push({ text: "Enable HTTPS-Only mode in your browser settings", priority: "high" });
  }
  if (securityChecks.find((c) => c.id === "dns")?.status !== "secure") {
    recommendations.push({ text: "Switch to encrypted DNS: Cloudflare (1.1.1.1) or Google (8.8.8.8)", priority: "medium" });
  }
  if (recommendations.length === 0) {
    recommendations.push({ text: "Your privacy posture looks good! Keep your VPN active.", priority: "low" });
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cyber-card relative overflow-hidden"
      >
        <div className={cn("absolute top-0 right-0 w-72 h-72 blur-[120px] -mr-36 -mt-36", 
          overallRisk === "low" ? "bg-emerald-600/15" : overallRisk === "medium" ? "bg-amber-600/15" : "bg-red-600/15"
        )} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 relative z-10">
          <div className={cn(
            "w-14 h-14 md:w-18 md:h-18 rounded-2xl flex items-center justify-center shadow-xl border",
            rc.border,
            overallRisk === "low" ? "bg-emerald-600/20 text-emerald-400" :
            overallRisk === "medium" ? "bg-amber-600/20 text-amber-400" :
            overallRisk === "high" ? "bg-red-600/20 text-red-400" :
            "bg-slate-600/20 text-slate-400"
          )}>
            <Shield size={32} />
          </div>
          <div className="flex-1">
            <h3 className="cyber-title bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Privacy Shield
            </h3>
            <p className="cyber-text-s mt-1">
              Real-time analysis of your network privacy, IP exposure, and security posture.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
              overallRisk === "low" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              overallRisk === "medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
              overallRisk === "high" ? "bg-red-500/10 border-red-500/20 text-red-400" :
              "bg-slate-500/10 border-slate-500/20 text-slate-400"
            )}>
              {overallRisk === "low" ? <ShieldCheck size={12} /> : overallRisk === "medium" ? <AlertTriangle size={12} /> : <ShieldAlert size={12} />}
              {overallRisk === "unknown" ? "Analyzing..." : `${overallRisk} Risk`}
            </div>
            <button
              onClick={fetchIpInfo}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Section Tabs ──────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: "overview", label: "Overview", icon: Globe },
          { id: "analysis", label: "Security Analysis", icon: Shield },
          { id: "speed", label: "Speed Test", icon: Activity },
          { id: "history", label: "Scan History", icon: Database },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
              activeSection === tab.id
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────── */}
      {activeSection === "overview" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {loading ? (
            <div className="cyber-card flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-xs font-medium text-slate-300">Analyzing your network...</p>
              </div>
            </div>
          ) : ipInfo ? (
            <>
              {/* IP Details Card */}
              <div className="p-0.5 rounded-[28px] bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-blue-500/30">
                <div className="p-5 md:p-6 rounded-[27px] bg-[#0a0a0c]/90 backdrop-blur-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={16} className="text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">Your Public Identity</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 ml-auto">
                      Live Data
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <p className="cyber-text-xs">IP Address</p>
                      <p className="text-sm font-black text-blue-400 mt-1 font-mono">{ipInfo.ip}</p>
                    </div>
                    <div>
                      <p className="cyber-text-xs">Location</p>
                      <p className="text-sm font-bold text-white mt-1">{ipInfo.city}, {ipInfo.countryCode}</p>
                    </div>
                    <div>
                      <p className="cyber-text-xs">ISP</p>
                      <p className="text-xs font-bold text-slate-300 mt-1 truncate" title={ipInfo.isp}>{ipInfo.isp}</p>
                    </div>
                    <div>
                      <p className="cyber-text-xs">ASN</p>
                      <p className="text-sm font-bold text-slate-300 mt-1">{ipInfo.asn}</p>
                    </div>
                    <div>
                      <p className="cyber-text-xs">Region</p>
                      <p className="text-sm font-bold text-slate-300 mt-1">{ipInfo.region}</p>
                    </div>
                    <div>
                      <p className="cyber-text-xs">Timezone</p>
                      <p className="text-xs font-bold text-slate-300 mt-1">{ipInfo.timezone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="cyber-card text-center">
                  {overallRisk === "low" ? <ShieldCheck size={24} className="text-emerald-400 mx-auto mb-2" /> : <ShieldAlert size={24} className={cn("mx-auto mb-2", rc.text)} />}
                  <p className={cn("text-lg font-black capitalize", rc.text)}>{overallRisk}</p>
                  <p className="cyber-text-xs mt-1">Risk Level</p>
                </div>
                <div className="cyber-card text-center">
                  <Lock size={24} className={cn("mx-auto mb-2", securityChecks.find(c => c.id === "https")?.status === "secure" ? "text-emerald-400" : "text-red-400")} />
                  <p className="text-lg font-black text-white">{window.location.protocol === "https:" ? "Yes" : "No"}</p>
                  <p className="cyber-text-xs mt-1">HTTPS</p>
                </div>
                <div className="cyber-card text-center">
                  <Eye size={24} className={cn("mx-auto mb-2", securityChecks.find(c => c.id === "vpn")?.status === "secure" ? "text-emerald-400" : "text-amber-400")} />
                  <p className="text-lg font-black text-white">{securityChecks.find(c => c.id === "vpn")?.status === "secure" ? "Hidden" : "Exposed"}</p>
                  <p className="cyber-text-xs mt-1">IP Status</p>
                </div>
                <div className="cyber-card text-center">
                  <Signal size={24} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-lg font-black text-white">{speedResult.tested ? `${speedResult.latencyMs}ms` : "—"}</p>
                  <p className="cyber-text-xs mt-1">Latency</p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="cyber-card">
                <h4 className="cyber-subtitle mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-blue-500" />
                  Smart Recommendations
                </h4>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border",
                      rec.priority === "high" ? "bg-amber-500/5 border-amber-500/15" :
                      rec.priority === "medium" ? "bg-blue-500/5 border-blue-500/15" :
                      "bg-emerald-500/5 border-emerald-500/15"
                    )}>
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        rec.priority === "high" ? "bg-amber-500/20 text-amber-400" :
                        rec.priority === "medium" ? "bg-blue-500/20 text-blue-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      )}>
                        {rec.priority === "high" ? <AlertTriangle size={12} /> :
                         rec.priority === "low" ? <CheckCircle size={12} /> :
                         <Info size={12} />}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{rec.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="cyber-card text-center py-12">
              <AlertTriangle size={36} className="text-red-400 mx-auto mb-4" />
              <p className="text-sm font-bold text-red-400">Failed to analyze network</p>
              <p className="cyber-text-s mt-2">Check your internet connection and try again.</p>
              <button onClick={fetchIpInfo} className="mt-4 cyber-btn bg-blue-600 hover:bg-blue-500 text-white">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Security Analysis ─────────────────────────────── */}
      {activeSection === "analysis" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="cyber-card">
          <h4 className="cyber-subtitle mb-6 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            Detailed Security Analysis
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border",
              securityChecks.filter(c => c.status === "risk").length > 0
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : securityChecks.filter(c => c.status === "warning").length > 0
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            )}>
              {securityChecks.filter(c => c.status === "risk").length} issues
            </span>
          </h4>
          <div className="space-y-3">
            {securityChecks.map((check) => (
              <div key={check.id} className={cn(
                "p-4 rounded-xl border transition-all",
                check.status === "secure" ? "bg-emerald-500/5 border-emerald-500/15" :
                check.status === "warning" ? "bg-amber-500/5 border-amber-500/15" :
                "bg-red-500/5 border-red-500/15"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    check.status === "secure" ? "bg-emerald-500/20 text-emerald-400" :
                    check.status === "warning" ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {check.status === "secure" ? <CheckCircle size={16} /> :
                     check.status === "warning" ? <AlertTriangle size={16} /> :
                     <ShieldAlert size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">{check.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border",
                        check.status === "secure" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        check.status === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-red-500/10 border-red-500/20 text-red-400"
                      )}>{check.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{check.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Speed Test ────────────────────────────────────── */}
      {activeSection === "speed" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="cyber-card text-center">
            <h4 className="cyber-subtitle mb-6 flex items-center justify-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Network Speed Test
            </h4>
            <p className="cyber-text-s mb-6">
              Measures real download speed and latency to the TacU- NS server.
            </p>

            <button
              onClick={runSpeedTest}
              disabled={testingSpeed}
              className={cn(
                "w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all border-4",
                testingSpeed
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                  : speedResult.tested
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                  : "bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30",
                "shadow-xl", rc.glow
              )}
            >
              {testingSpeed ? (
                <Loader2 size={40} className="animate-spin" />
              ) : (
                <Zap size={40} />
              )}
            </button>

            <p className="text-xs text-slate-400 mt-4">
              {testingSpeed ? "Testing..." : speedResult.tested ? "Test complete" : "Tap to start speed test"}
            </p>

            {speedResult.tested && (
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <ArrowDown size={20} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-emerald-400">{speedResult.downloadMbps}</p>
                  <p className="cyber-text-xs mt-1">Download (Mbps)</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <Signal size={20} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-blue-400">{speedResult.latencyMs}</p>
                  <p className="cyber-text-xs mt-1">Latency (ms)</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 border-dashed">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Speed test measures the download time of a 256KB payload from the TacU- NS server. 
                Results reflect the connection between your device and this server, not overall internet speed. 
                For comprehensive speed testing, use services like Speedtest.net or Fast.com.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Scan History ──────────────────────────────────── */}
      {activeSection === "history" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="cyber-card">
          <h4 className="cyber-subtitle mb-4 flex items-center gap-2">
            <Database size={18} className="text-blue-500" />
            Threat Scan History
            <span className="cyber-badge bg-blue-500/10 border-blue-500/20 text-blue-400">{scanHistory.length}</span>
          </h4>

          {scanHistory.length === 0 ? (
            <div className="text-center py-12">
              <Search size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-400">No scan history yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Go to Threat Intel to scan IPs and build your threat database.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {scanHistory
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((scan: any, idx: number) => (
                <div key={idx} className={cn(
                  "p-3 rounded-xl border flex items-center gap-3",
                  scan.risk_level === "high" ? "bg-red-500/5 border-red-500/15" :
                  scan.risk_level === "medium" ? "bg-amber-500/5 border-amber-500/15" :
                  "bg-white/[0.02] border-white/5"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    scan.risk_level === "high" ? "bg-red-500/20 text-red-400" :
                    scan.risk_level === "medium" ? "bg-amber-500/20 text-amber-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {scan.risk_level === "high" ? <ShieldAlert size={14} /> :
                     scan.risk_level === "medium" ? <AlertTriangle size={14} /> :
                     <CheckCircle size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 font-mono">{scan.ip}</p>
                    <p className="text-[10px] text-slate-500">
                      Global Network: {scan.vt_malicious || 0} malicious • Community: {scan.otx_hits || 0} hits
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border",
                      scan.risk_level === "high" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                      scan.risk_level === "medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}>{scan.risk_level}</span>
                    <p className="text-[9px] text-slate-600 mt-1">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
