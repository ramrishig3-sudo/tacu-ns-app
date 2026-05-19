import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Globe, AlertTriangle,
  Loader2, Zap, Clock, ShieldAlert,
  ShieldCheck, Radio, Bot, Hash, Network, CornerDownRight, ArrowUpRight, Activity, X,
  ExternalLink, HelpCircle, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { ThreatScanResult, ScanAPIResponse, ThreatFeedPulse, AIThreatAnalysis } from "../../types";
import apiClient from "../../services/api";
import { getScanHistory } from "../../services/supabase";

type Tab = "scan" | "feed" | "ai" | "beacon";

// ─── C2 Beacon Detection Math ─────────────────────────────────────────────────
// All functions are pure computations — no API calls, no external dependencies.
// Algorithm: Inter-Arrival Time (IAT) variance analysis.
// Reference concept: network forensics IAT regularity detection (IEEE literature).

function parseTimestamps(raw: string): number[] {
  const lines = raw.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
  const out: number[] = [];
  for (const line of lines) {
    const stripped = line.replace(/^\[|\]$|^\(|\)$/g, "").trim();
    if (/^\d{13}$/.test(stripped)) {
      out.push(parseInt(stripped));
    } else if (/^\d{10}$/.test(stripped)) {
      out.push(parseInt(stripped) * 1000);
    } else {
      const ms = Date.parse(stripped);
      if (!isNaN(ms)) { out.push(ms); continue; }
      // HH:MM:SS or HH:MM
      const t = stripped.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/);
      if (t) {
        const d = new Date();
        d.setHours(+t[1], +t[2], +(t[3] || 0), 0);
        out.push(d.getTime());
      }
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

interface BeaconStats {
  iats: number[];
  mean: number;
  stdDev: number;
  cv: number;
  period: number;
  confidence: number;
  jitterPct: number;
  risk: "low" | "suspicious" | "high";
  samples: number;
}

function computeBeaconStats(timestamps: number[]): BeaconStats | null {
  if (timestamps.length < 3) return null;
  const iats: number[] = [];
  for (let i = 1; i < timestamps.length; i++) iats.push(timestamps[i] - timestamps[i - 1]);
  const μ = iats.reduce((a, b) => a + b, 0) / iats.length;
  const σ = Math.sqrt(iats.reduce((s, v) => s + Math.pow(v - μ, 2), 0) / iats.length);
  const cv = μ > 0 ? σ / μ : 1;
  const sorted = [...iats].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const period = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - Math.min(cv, 1)) * 100)));
  const jitterPct = μ > 0 ? Math.round((σ / μ) * 100) : 0;
  const risk: BeaconStats["risk"] = confidence >= 75 ? "high" : confidence >= 45 ? "suspicious" : "low";
  return { iats, mean: μ, stdDev: σ, cv, period, confidence, jitterPct, risk, samples: timestamps.length };
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// ─── Tab config (colors + icons) ─────────────────────────────────────────────
const TAB_CONFIG: Record<Tab, { label: string; icon: any; color: string }> = {
  scan:   { label: "Scan",   icon: Search,   color: "#F87171" },
  feed:   { label: "Feed",   icon: Radio,    color: "#38BDF8" },
  ai:     { label: "AI",     icon: Bot,      color: "#C084FC" },
  beacon: { label: "Beacon", icon: Activity, color: "#FCD34D" },
};

export default function ThreatIntel() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ThreatScanResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [feed, setFeed] = useState<ThreatFeedPulse[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [selectedPulse, setSelectedPulse] = useState<ThreatFeedPulse | null>(null);
  const [aiReport, setAiReport] = useState<AIThreatAnalysis | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getScanHistory(10);
        setHistory(data.map((d: any) => ({ ...d, cached: false })));
      } catch {
        const saved = localStorage.getItem("threat_history");
        if (saved) setHistory(JSON.parse(saved).slice(0, 5));
      } finally {
        if (isMounted.current) setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === "feed" && feed.length === 0) {
      const fetchFeed = async () => {
        setLoadingFeed(true);
        try {
          const res = await apiClient.get("/api/threat/feed");
          if (res.data?.success && res.data.data) setFeed(res.data.data);
        } catch (err) { console.error("Feed error", err); }
        finally { setLoadingFeed(false); }
      };
      fetchFeed();
    }
  }, [activeTab, feed.length]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null); setAiReport(null);
    try {
      const response = await apiClient.post<ScanAPIResponse>("/api/scan-threat", { target: query.trim() });
      if (response.data.success && response.data.data) {
        setResult(response.data.data);
        setHistory(prev => [response.data.data!, ...prev.filter(h => h.target !== response.data.data!.target)].slice(0, 10));
      } else { setError(response.data.error || "Scan failed."); }
    } catch (err: any) {
      if (isMounted.current) setError("Network error.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const askAI = async () => {
    if (!result) return;
    setActiveTab("ai");
    if (aiReport) return;
    setLoadingAi(true);
    try {
      const response = await apiClient.post("/api/ai-analyze-threat", { target: result.target });
      if (response.data.success && isMounted.current) setAiReport(response.data.data);
    } catch { } finally { if (isMounted.current) setLoadingAi(false); }
  };

  // Risk color helpers
  const riskColor = (level: string) =>
    level === "high" ? "#F87171" : level === "medium" ? "#FCD34D" : "#34D399";
  const riskLabel = (level: string) =>
    level === "high" ? "HIGH RISK" : level === "medium" ? "MEDIUM RISK" : "LOW RISK";

  return (
    <div className="space-y-4 pb-20">

      {/* ── Tab Bar — full width, per-color accents ── */}
      <div
        className="flex rounded-2xl overflow-hidden border"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
          borderColor: "rgba(56,189,248,0.12)",
        }}
      >
        {(Object.keys(TAB_CONFIG) as Tab[]).map(tab => {
          const cfg   = TAB_CONFIG[tab];
          const active = activeTab === tab;
          const disabled = tab === "ai" && !result;
          const colorHex = (opacity: number) =>
            `${cfg.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
          return (
            <button
              key={tab}
              onClick={() => !disabled && setActiveTab(tab)}
              disabled={disabled}
              className="flex-1 flex flex-col items-center py-3 gap-1.5 relative transition-all"
              style={{ opacity: disabled ? 0.25 : 1 }}
            >
              {/* Active top accent */}
              {active && (
                <motion.div
                  layoutId="threat-tab-indicator"
                  className="absolute top-0 left-0 right-0 rounded-none"
                  style={{ height: 2, background: cfg.color }}
                />
              )}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: active ? colorHex(0.16) : "transparent",
                  border: active ? `1px solid ${colorHex(0.30)}` : "1px solid transparent",
                }}
              >
                <cfg.icon size={13} style={{ color: active ? cfg.color : "#475569" }} />
              </div>
              <span
                className="font-black uppercase tracking-widest"
                style={{ fontSize: 8, color: active ? cfg.color : "#475569" }}
              >
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ SCAN TAB ══════════════════════════════════════════════════════════ */}
        {activeTab === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Search card */}
            <section
              className="rounded-2xl overflow-hidden border"
              style={{
                background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                borderColor: "rgba(248,113,113,0.18)",
              }}
            >
              {/* Red top strip */}
              <div style={{ height: 3, background: "linear-gradient(90deg, #F87171, rgba(248,113,113,0.30))" }} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#F87171" }} />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: "#F87171" }}>
                    Threat Intelligence
                  </span>
                </div>
                <h2 className="text-[15px] font-black uppercase tracking-tight mb-4" style={{ color: "#E2E8F0" }}>
                  Vector Inquiry
                </h2>

                <form onSubmit={handleScan} className="space-y-2">
                  {/* Input */}
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: "rgba(148,163,184,0.06)",
                      border: "1px solid rgba(248,113,113,0.20)",
                    }}
                  >
                    <Search size={14} style={{ color: "#475569" }} className="shrink-0" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="IP address, domain, or hash..."
                      className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold"
                      style={{ color: "#E2E8F0" }}
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery("")}>
                        <X size={12} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>

                  {/* Execute button */}
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 text-white"
                    style={{
                      background: loading || !query.trim()
                        ? "rgba(248,113,113,0.20)"
                        : "#F87171",
                      boxShadow: query.trim() ? "0 4px 16px rgba(248,113,113,0.28)" : "none",
                    }}
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    {loading ? "Scanning..." : "Execute Scan"}
                  </button>
                </form>

                {/* Error */}
                {error && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl border"
                       style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.20)" }}>
                    <AlertTriangle size={12} style={{ color: "#F87171" }} className="shrink-0" />
                    <p className="text-[9px] font-bold" style={{ color: "#F87171" }}>{error}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Scan result */}
            {result && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden border"
                style={{
                  background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                  borderColor: `${riskColor(result.risk_level)}30`,
                }}
              >
                {/* Risk color top strip */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${riskColor(result.risk_level)}, ${riskColor(result.risk_level)}40)` }} />

                <div className="p-5">
                  {/* Target + risk badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="overflow-hidden flex-1">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "#475569" }}>
                        Scan Target
                      </p>
                      <h3 className="font-black text-[14px] uppercase tracking-tight truncate" style={{ color: "#E2E8F0" }}>
                        {result.target}
                      </h3>
                    </div>
                    <span
                      className="shrink-0 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border"
                      style={{
                        color: riskColor(result.risk_level),
                        background: `${riskColor(result.risk_level)}14`,
                        borderColor: `${riskColor(result.risk_level)}30`,
                      }}
                    >
                      {riskLabel(result.risk_level)}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <ResultStatBox icon={<ShieldAlert size={12} />} value={result.vt_malicious} label="VT Hits"   color="#F87171" />
                    <ResultStatBox icon={<Globe size={12} />}       value={result.vt_reputation} label="Rep Score" color="#38BDF8" />
                    <ResultStatBox icon={<Zap size={12} />}         value={result.otx_hits}      label="IOC Count" color="#FCD34D" />
                  </div>

                  {/* AI button */}
                  <button
                    onClick={askAI}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border group transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(192,132,252,0.08)",
                      borderColor: "rgba(192,132,252,0.22)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                           style={{ background: "rgba(192,132,252,0.14)", border: "1px solid rgba(192,132,252,0.28)" }}>
                        <Bot size={13} style={{ color: "#C084FC" }} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#C084FC" }}>
                        AI Threat Insight
                      </span>
                    </div>
                    <ArrowUpRight size={13} style={{ color: "#475569" }} className="group-hover:text-purple-400 transition-colors" />
                  </button>
                </div>
              </motion.section>
            )}

            {/* Recent history */}
            {history.length > 0 && (
              <section
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                  borderColor: "rgba(56,189,248,0.10)",
                }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.45)" }}>
                    Recent Vectors
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(56,189,248,0.07)" }} />
                </div>
                <div className="px-3 pb-3 space-y-1.5">
                  {history.map((item, idx) => {
                    const rc = riskColor(item.risk_level);
                    return (
                      <button
                        key={idx}
                        onClick={() => { setActiveTab("scan"); setResult(item); setQuery(item.target); }}
                        className="w-full rounded-xl overflow-hidden flex items-center group active:scale-[0.99] transition-all text-left"
                        style={{ background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)" }}
                      >
                        {/* Left risk bar */}
                        <div className="w-[3px] self-stretch shrink-0" style={{ background: rc }} />
                        <div className="flex items-center justify-between flex-1 px-3 py-2.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: `${rc}14`, color: rc, border: `1px solid ${rc}30` }}
                            >
                              {item.risk_level === "high" ? "HIGH" : item.risk_level === "medium" ? "MED" : "LOW"}
                            </span>
                            <span className="text-[10px] font-black uppercase truncate" style={{ color: "#CBD5E1" }}>
                              {item.target}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold shrink-0 ml-2" style={{ color: "#334155" }}>
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {history.length === 0 && !loading && (
              <div
                className="py-14 text-center rounded-2xl border"
                style={{
                  border: "1px dashed rgba(56,189,248,0.12)",
                  background: "rgba(13,21,42,0.50)",
                  opacity: 0.45,
                }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                     style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
                  <Search size={20} style={{ color: "#F87171" }} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#334155" }}>
                  No scan history
                </p>
                <p className="text-[8px] font-bold uppercase tracking-wider mt-1" style={{ color: "#1E293B" }}>
                  Run your first threat scan above
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══ FEED TAB ══════════════════════════════════════════════════════════ */}
        {activeTab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <section
              className="rounded-2xl overflow-hidden border"
              style={{
                background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                borderColor: "rgba(56,189,248,0.12)",
              }}
            >
              {/* Feed header */}
              <div
                className="px-4 py-3 flex items-center justify-between border-b"
                style={{ borderColor: "rgba(56,189,248,0.10)", background: "rgba(56,189,248,0.04)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38BDF8" }} />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "#38BDF8" }}>
                    Live Intel Feed
                  </span>
                </div>
                {loadingFeed && <Loader2 size={13} className="animate-spin" style={{ color: "#38BDF8" }} />}
              </div>

              {/* Feed items */}
              <div className="divide-y max-h-[520px] overflow-y-auto no-scrollbar"
                   style={{ divideColor: "rgba(56,189,248,0.07)" }}>
                {feed.length === 0 && !loadingFeed && (
                  <div className="py-14 text-center opacity-35">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                         style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.15)" }}>
                      <Radio size={20} style={{ color: "#38BDF8" }} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#334155" }}>
                      Synchronizing with OTX Hub...
                    </p>
                  </div>
                )}
                {feed.map(p => {
                  const feedColor = p.risk_color === "red" ? "#F87171" : "#38BDF8";
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPulse(p)}
                      className="w-full text-left flex items-center overflow-hidden group transition-all active:scale-[0.99]"
                      style={{ borderBottom: "1px solid rgba(56,189,248,0.06)" }}
                    >
                      {/* Left risk bar */}
                      <div className="w-[3px] self-stretch shrink-0" style={{ background: feedColor }} />

                      <div className="flex items-center justify-between flex-1 px-3.5 py-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `${feedColor}12`,
                              border: `1px solid ${feedColor}28`,
                            }}
                          >
                            <Globe size={14} style={{ color: feedColor }} />
                          </div>
                          <div className="truncate">
                            <h4 className="text-[10px] font-black uppercase truncate tracking-tight"
                                style={{ color: "#CBD5E1" }}>
                              {p.name}
                            </h4>
                            <p className="text-[8px] font-bold uppercase truncate mt-0.5" style={{ color: "#334155" }}>
                              {p.author || "Global Sensor"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className="text-[8px] font-black px-2 py-1 rounded-lg"
                            style={{ background: `${feedColor}10`, color: feedColor, border: `1px solid ${feedColor}22` }}
                          >
                            {p.indicator_count}
                          </span>
                          <ArrowUpRight size={13} style={{ color: "#334155" }} className="group-hover:text-blue-400 transition-colors" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}

        {/* ══ BEACON TAB ════════════════════════════════════════════════════════ */}
        {activeTab === "beacon" && (
          <BeaconAnalyzer history={history} />
        )}

        {/* ══ AI TAB ════════════════════════════════════════════════════════════ */}
        {activeTab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {loadingAi && (
              <div className="flex flex-col items-center py-16 gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: "rgba(192,132,252,0.10)", border: "1px solid rgba(192,132,252,0.22)" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "#C084FC" }} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#475569" }}>
                  Generating neural assessment...
                </p>
              </div>
            )}

            {!loadingAi && aiReport && (
              <>
                {/* Summary card */}
                <section
                  className="rounded-2xl overflow-hidden border"
                  style={{
                    background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                    borderColor: "rgba(192,132,252,0.22)",
                  }}
                >
                  <div style={{ height: 3, background: "linear-gradient(90deg, #C084FC, rgba(192,132,252,0.30))" }} />
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                           style={{ background: "rgba(192,132,252,0.14)", border: "1px solid rgba(192,132,252,0.28)" }}>
                        <Bot size={17} style={{ color: "#C084FC" }} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: "#C084FC" }}>
                          AI Assessment
                        </p>
                        <h3 className="text-[13px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                          Neural Analysis
                        </h3>
                      </div>
                      <span
                        className="ml-auto px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border shrink-0"
                        style={{
                          color: riskColor(aiReport.risk_level),
                          background: `${riskColor(aiReport.risk_level)}14`,
                          borderColor: `${riskColor(aiReport.risk_level)}30`,
                        }}
                      >
                        {riskLabel(aiReport.risk_level)}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed" style={{ color: "#94A3B8" }}>
                      {aiReport.summary}
                    </p>
                  </div>
                </section>

                {/* Countermeasures */}
                <section
                  className="rounded-2xl border"
                  style={{
                    background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                    borderColor: "rgba(56,189,248,0.10)",
                    padding: "18px",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.45)" }}>
                      Countermeasures
                    </span>
                    <div className="flex-1 h-px" style={{ background: "rgba(56,189,248,0.07)" }} />
                  </div>
                  <div className="space-y-2.5">
                    {aiReport.recommended_actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 p-3 rounded-xl border"
                        style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.18)" }}
                        >
                          <span className="text-[9px] font-black" style={{ color: "#38BDF8" }}>{idx + 1}</span>
                        </div>
                        <p className="text-[10px] font-bold leading-relaxed" style={{ color: "#94A3B8" }}>{action}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {!loadingAi && !aiReport && (
              <div className="py-14 text-center opacity-40">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                     style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.15)" }}>
                  <Bot size={22} style={{ color: "#C084FC" }} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#334155" }}>
                  Run a scan first
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pulse Detail Modal (unchanged content) ── */}
      <AnimatePresence>
        {selectedPulse && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPulse(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="relative w-full max-w-xl rounded-3xl overflow-hidden border shadow-2xl"
              style={{
                background: "linear-gradient(145deg, #0D1628, #080E1C)",
                borderColor: "rgba(56,189,248,0.20)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.70)",
              }}
            >
              <header
                className="p-5 flex items-center justify-between border-b"
                style={{ borderColor: "rgba(56,189,248,0.10)", background: "rgba(56,189,248,0.04)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: "rgba(56,189,248,0.14)", border: "1px solid rgba(56,189,248,0.28)" }}>
                    <Globe size={18} style={{ color: "#38BDF8" }} />
                  </div>
                  <div>
                    <h2 className="text-[12px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                      Pulse Intelligence
                    </h2>
                    <p className="text-[8px] font-bold uppercase" style={{ color: "#334155" }}>
                      {selectedPulse.author}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPulse(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#F87171" }}
                >
                  <X size={14} />
                </button>
              </header>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div>
                  <h3 className="text-[16px] font-black uppercase tracking-tight leading-tight mb-3"
                      style={{ color: "#E2E8F0" }}>
                    {selectedPulse.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest"
                          style={{ background: "rgba(56,189,248,0.10)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.22)" }}>
                      {selectedPulse.indicator_count} Indicators
                    </span>
                    <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest"
                          style={{ background: "rgba(148,163,184,0.06)", color: "#475569", border: "1px solid rgba(148,163,184,0.10)" }}>
                      {formatTimeAgo(selectedPulse.created)}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed" style={{ color: "#94A3B8" }}>
                    {selectedPulse.description || "No tactical description provided for this intelligence stream."}
                  </p>
                </div>

                {selectedPulse.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPulse.tags.map(tag => (
                      <span key={tag}
                        className="px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider"
                        style={{ background: "rgba(148,163,184,0.06)", color: "#334155", border: "1px solid rgba(148,163,184,0.10)" }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t" style={{ borderColor: "rgba(56,189,248,0.10)" }}>
                  <button
                    onClick={() => window.open(`https://otx.alienvault.com/pulse/${selectedPulse.id}`, "_blank")}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all text-white"
                    style={{ background: "#38BDF8", boxShadow: "0 4px 16px rgba(56,189,248,0.28)" }}
                  >
                    Inspect Full Stream
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Result stat box ── */
function ResultStatBox({ icon, value, label, color }: any) {
  const colorHex = (op: number) =>
    `${color}${Math.round(op * 255).toString(16).padStart(2, "0")}`;
  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
      style={{ background: colorHex(0.07), border: `1px solid ${colorHex(0.22)}` }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
           style={{ background: colorHex(0.14), border: `1px solid ${colorHex(0.28)}` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="font-black text-[16px] leading-none" style={{ color: "#E2E8F0" }}>{value}</span>
      <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: "#334155" }}>{label}</span>
    </div>
  );
}

// ─── Beacon Analyzer Component ───────────────────────────────────────────────

function BeaconAnalyzer({ history }: { history: ThreatScanResult[] }) {
  const [input, setInput]           = useState("");
  const [stats, setStats]           = useState<BeaconStats | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen]     = useState(false);

  const analyze = () => {
    setParseError(null);
    const ts = parseTimestamps(input);
    if (ts.length < 3) {
      setParseError(`Only ${ts.length} valid timestamp${ts.length === 1 ? "" : "s"} found. Minimum 3 required.`);
      setStats(null);
      return;
    }
    setStats(computeBeaconStats(ts));
  };

  const loadFromHistory = () => {
    setParseError(
      "Scan history timestamps record when YOU ran a threat query — not network traffic arrival times. " +
      "For C2 beacon analysis, paste actual connection timestamps from your router logs or firewall app."
    );
  };

  const riskStyle = {
    low:        { text: "#34D399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.22)", stroke: "#34D399" },
    suspicious: { text: "#FCD34D", bg: "rgba(252,211,77,0.10)",  border: "rgba(252,211,77,0.22)",  stroke: "#FCD34D" },
    high:       { text: "#F87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)", stroke: "#F87171" },
  };

  const riskLabel = { low: "LOW BEACON RISK", suspicious: "SUSPICIOUS PATTERN", high: "LIKELY C2 BEACON" };

  return (
    <motion.div key="beacon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

      {/* Info Card */}
      <button
        onClick={() => setInfoOpen(v => !v)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.99]"
        style={{ background: "rgba(252,211,77,0.05)", borderColor: "rgba(252,211,77,0.18)" }}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle size={15} style={{ color: "#FCD34D" }} className="shrink-0" />
          <span className="font-black text-[10px] uppercase tracking-widest" style={{ color: "#FCD34D" }}>
            What is this tool? Tap to {infoOpen ? "hide" : "learn"}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: "#FCD34D" }}
          className={cn("transition-transform duration-200", infoOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {infoOpen && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border space-y-3 p-4"
                 style={{ borderColor: "rgba(252,211,77,0.15)", background: "rgba(252,211,77,0.04)" }}>
              <h3 className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                C2 Beacon Analyzer — Explained Simply
              </h3>
              <div className="space-y-2.5">
                {[
                  { emoji: "🦠", title: "What is C2 Beaconing?", body: "When malware infects a device, it secretly contacts the hacker's server at very regular intervals — like a heartbeat. Example: infected phone calls hacker's server every 5 minutes, exactly." },
                  { emoji: "🔍", title: "What does this tool detect?", body: "It checks if a series of connection timestamps are too regular to be human. Normal human activity is random. Malware is clock-perfect. Highly regular = red flag." },
                  { emoji: "📋", title: "Where do I get real timestamps?", body: "Check your router's admin panel → connection logs → if you see one unknown IP repeating, copy those connection times here. Or use your phone's firewall app logs." },
                  { emoji: "⚠️", title: "Is this different from CVE?", body: "Yes — CVE tracks known software bugs. This tool detects malware behavior patterns (how malware communicates). Two completely different things." },
                ].map(item => (
                  <div key={item.title} className="flex gap-3 p-2.5 rounded-xl border"
                       style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}>
                    <span className="text-base shrink-0 mt-0.5">{item.emoji}</span>
                    <div>
                      <p className="font-black text-[9px] uppercase tracking-wider mb-1" style={{ color: "#E2E8F0" }}>{item.title}</p>
                      <p className="text-[9px] font-bold leading-relaxed" style={{ color: "#94A3B8" }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Input card */}
      <section
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
          borderColor: "rgba(252,211,77,0.18)",
        }}
      >
        <div style={{ height: 3, background: "linear-gradient(90deg, #FCD34D, rgba(252,211,77,0.30))" }} />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(252,211,77,0.10)", border: "1px solid rgba(252,211,77,0.22)" }}>
              <Activity size={16} style={{ color: "#FCD34D" }} />
            </div>
            <div>
              <h3 className="font-black text-[13px] uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                C2 Beacon Analyzer
              </h3>
              <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#475569" }}>
                Inter-arrival time regularity analysis
              </p>
            </div>
          </div>

          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setParseError(null); }}
            placeholder={"Paste timestamps — one per line:\n\n2025-05-06T01:11:42Z\n2025-05-06T01:13:42Z\n2025-05-06T01:15:41Z\n\nAlso accepts: Unix (sec/ms), HH:MM:SS"}
            className="w-full h-36 p-3 rounded-xl border text-[10px] font-mono resize-none outline-none transition-colors"
            style={{ background: "rgba(148,163,184,0.06)", borderColor: "rgba(252,211,77,0.16)", color: "#E2E8F0" }}
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={loadFromHistory}
              className="flex-1 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
              style={{ borderColor: "rgba(148,163,184,0.15)", color: "#475569", background: "rgba(148,163,184,0.06)" }}
            >
              <Clock size={10} className="inline mr-1" />
              From History
            </button>
            <button
              onClick={analyze}
              className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
              style={{ background: "#FCD34D", color: "#0B111E", boxShadow: "0 4px 14px rgba(252,211,77,0.22)" }}
            >
              <Zap size={10} className="inline mr-1" />
              Analyze
            </button>
          </div>

          {parseError && (
            <div className="mt-3 p-2.5 rounded-xl border flex items-start gap-2"
                 style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.20)" }}>
              <AlertTriangle size={11} style={{ color: "#F87171" }} className="shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold" style={{ color: "#94A3B8" }}>{parseError}</p>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <AnimatePresence>
        {stats && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Confidence gauge */}
            <section
              className="rounded-2xl border flex flex-col items-center py-6"
              style={{ borderColor: riskStyle[stats.risk].border, background: riskStyle[stats.risk].bg.replace("0.10", "0.04") }}
            >
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" strokeWidth="9"
                          style={{ stroke: "rgba(148,163,184,0.10)" }} />
                  <circle cx="50" cy="50" r="40" fill="none" strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray="251"
                          strokeDashoffset={251 - (251 * stats.confidence / 100)}
                          style={{ stroke: riskStyle[stats.risk].stroke, transition: "stroke-dashoffset 0.9s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-black text-2xl leading-none" style={{ color: "#E2E8F0" }}>
                    {stats.confidence}%
                  </span>
                  <span className="text-[7px] font-black uppercase mt-0.5" style={{ color: "#475569" }}>Confidence</span>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                    style={{ color: riskStyle[stats.risk].text, background: riskStyle[stats.risk].bg, borderColor: riskStyle[stats.risk].border }}>
                {riskLabel[stats.risk]}
              </span>
            </section>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <BeaconStatBox label="Detected Period" value={fmtMs(stats.period)} sub="Dominant interval" />
              <BeaconStatBox label="Variation (CV)" value={stats.cv.toFixed(3)}
                sub={stats.cv < 0.15 ? "Highly regular" : stats.cv < 0.30 ? "Slightly jittered" : "High variance"} />
              <BeaconStatBox label="Jitter" value={`±${stats.jitterPct}%`} sub="Of mean period" />
              <BeaconStatBox label="Samples" value={stats.samples.toString()} sub="Event timestamps" />
            </div>

            {/* IAT distribution */}
            <section
              className="rounded-2xl border p-4"
              style={{
                background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                borderColor: "rgba(56,189,248,0.10)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity size={11} style={{ color: "#38BDF8" }} />
                <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "#38BDF8" }}>
                  Inter-Arrival Time Distribution
                </span>
              </div>
              <div className="space-y-1.5">
                {stats.iats.map((iat, i) => {
                  const dev = stats.mean > 0 ? Math.abs(iat - stats.mean) / stats.mean : 0;
                  const barW = Math.max(6, Math.min(100, (iat / (Math.max(...stats.iats) || 1)) * 100));
                  const barColor = dev < 0.10 ? "#34D399" : dev < 0.25 ? "#FCD34D" : "#F87171";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[7px] font-bold w-4 text-right shrink-0" style={{ color: "#334155" }}>{i + 1}</span>
                      <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.08)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barW}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: barColor, opacity: 0.85 }}
                        />
                      </div>
                      <span className="text-[7px] font-bold w-11 shrink-0 text-right" style={{ color: "#475569" }}>
                        {fmtMs(iat)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: "rgba(56,189,248,0.08)" }}>
                {[["#34D399","±0–10% of mean"],["#FCD34D","±10–25%"],["#F87171",">25% deviation"]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-[7px] font-bold" style={{ color: "#334155" }}>{l}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Interpretation */}
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: riskStyle[stats.risk].border, background: riskStyle[stats.risk].bg.replace("0.10","0.04") }}
            >
              <div className="flex items-center gap-2 mb-2">
                {stats.risk === "high" ? <ShieldAlert size={11} style={{ color: riskStyle[stats.risk].text }} /> : <ShieldCheck size={11} style={{ color: riskStyle[stats.risk].text }} />}
                <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: riskStyle[stats.risk].text }}>
                  Interpretation
                </span>
              </div>
              <p className="text-[10px] font-bold leading-relaxed" style={{ color: "#94A3B8" }}>
                {stats.risk === "high"
                  ? `These ${stats.samples} events show highly regular timing (CV: ${stats.cv.toFixed(3)}) with a dominant period of ${fmtMs(stats.period)} and only ±${stats.jitterPct}% jitter. This pattern is consistent with automated C2 beacon traffic. Investigate the source immediately.`
                  : stats.risk === "suspicious"
                  ? `Moderate regularity detected (CV: ${stats.cv.toFixed(3)}, period: ${fmtMs(stats.period)}). Pattern could indicate beaconing with added jitter — a technique used by advanced malware to evade time-based detection. Further investigation recommended.`
                  : `Low beacon confidence (CV: ${stats.cv.toFixed(3)}). The timing variance is consistent with organic or human-driven activity rather than automated C2 communication.`
                }
              </p>
            </section>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BeaconStatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-3 rounded-xl border"
         style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.10)" }}>
      <p className="text-[7px] font-bold uppercase tracking-widest mb-1" style={{ color: "#334155" }}>{label}</p>
      <p className="font-black text-[14px] leading-none" style={{ color: "#E2E8F0" }}>{value}</p>
      <p className="text-[7px] font-bold mt-1" style={{ color: "#1E293B" }}>{sub}</p>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
