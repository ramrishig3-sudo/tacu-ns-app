import React, { useState, useEffect } from "react";
import { 
  Shield, Search, Globe, Activity, AlertTriangle, CheckCircle,
  Loader2, Zap, Clock, Database, ShieldAlert,
  ShieldCheck, Radio, Bot, Hash, Network, CornerDownRight, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { ThreatScanResult, ScanAPIResponse, ThreatFeedPulse, AIThreatAnalysis } from "../../types";
import apiClient from "../../services/api";
import { getScanHistory } from "../../services/supabase";

type Tab = "scan" | "feed" | "ai";

export default function ThreatIntel() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  
  // Scan State
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ThreatScanResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Feed State
  const [feed, setFeed] = useState<ThreatFeedPulse[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // AI State
  const [aiReport, setAiReport] = useState<AIThreatAnalysis | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getScanHistory(15);
        setHistory(data.map((d: any) => ({ ...d, cached: false })));
      } catch {
        const saved = localStorage.getItem("threat_history");
        if (saved) setHistory(JSON.parse(saved));
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  // Fetch feed when switching to feed tab
  useEffect(() => {
    if (activeTab === "feed" && feed.length === 0) {
      const fetchFeed = async () => {
        setLoadingFeed(true);
        try {
          const res = await apiClient.get<{success: boolean, data: ThreatFeedPulse[]}>("/api/threat/feed");
          if (res.data?.success && res.data.data) {
            setFeed(res.data.data);
          }
        } catch (err) {
          console.error("Failed to load feed", err);
        } finally {
          setLoadingFeed(false);
        }
      };
      fetchFeed();
    }
  }, [activeTab]);

  // ── Handlers ─────────────────────────────────────────────
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAiReport(null); // reset AI on new scan

    try {
      const response = await apiClient.post<ScanAPIResponse>("/api/scan-threat", {
        target: query.trim(),
      });

      if (response.data.success && response.data.data) {
        setResult(response.data.data);
        setHistory(prev => {
          const targetStr = response.data.data!.target;
          const newHistory = [response.data.data!, ...prev.filter(h => h.target !== targetStr)].slice(0, 15);
          localStorage.setItem("threat_history", JSON.stringify(newHistory));
          return newHistory;
        });
      } else {
        setError(response.data.error || "Scan failed. Please verify format.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const askAI = async () => {
    if (!result) return;
    setActiveTab("ai");
    if (aiReport) return; // already analyzed this one
    
    setLoadingAi(true);
    try {
      const response = await apiClient.post<{success: boolean, data: AIThreatAnalysis}>("/api/ai-analyze-threat", {
        target: result.target,
        target_type: result.target_type,
        vt_malicious: result.vt_malicious,
        vt_suspicious: result.vt_suspicious,
        otx_hits: result.otx_hits
      });
      if (response.data.success) {
        setAiReport(response.data.data);
      }
    } catch (err) {
      console.error("AI Error", err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleHistoryClick = (item: ThreatScanResult) => {
    setActiveTab("scan");
    setResult(item);
    setQuery(item.target);
    setAiReport(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const riskColors: any = {
    high: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", hex: "bg-red-500" },
    medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", hex: "bg-amber-500" },
    low: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", hex: "bg-emerald-500" },
  };

  const getTargetIcon = (type: string) => {
    if (type === "hash") return <Hash size={18} />;
    if (type === "url") return <Network size={18} />;
    return <Globe size={18} />;
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <div className="flex p-1.5 bg-black/40 border border-white/10 rounded-2xl md:rounded-full w-fit mx-auto backdrop-blur-xl">
        <TabButton active={activeTab === "scan"} onClick={() => setActiveTab("scan")} icon={<Search size={16} />} label="Scanner" />
        <TabButton active={activeTab === "feed"} onClick={() => setActiveTab("feed")} icon={<Radio size={16} />} label="Live Feed" />
        <TabButton 
          active={activeTab === "ai"} 
          onClick={() => setActiveTab("ai")} 
          icon={<Bot size={16} />} 
          label="AI Analysis" 
          disabled={!result}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* ── TAB: SCANNER ──────────────────────────────────── */}
        {activeTab === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* Search Header */}
            <div className="cyber-card relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -ml-32 -mb-32" />
              
              <div className="relative z-10 max-w-xl mx-auto text-center py-4">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 cyber-text-xs mb-4"
                >
                  <Zap size={10} className="animate-pulse" />
                  Global Threat Multi-Vector Engine
                </motion.div>
                <h2 className="cyber-title mb-3 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                  Threat Intelligence
                </h2>
                <p className="cyber-text-s mb-6 max-w-md mx-auto line-clamp-2 md:line-clamp-none text-slate-400">
                  Detect malware, phishing, and APTs by scanning an IP, Domain, URL, or File Hash.
                </p>
                
                <form onSubmit={handleScan} className="relative max-w-lg mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20" />
                  <div className="relative flex items-center bg-black/60 border border-white/10 rounded-full p-1.5 backdrop-blur-xl focus-within:border-blue-500/50 transition-all shadow-xl">
                    <div className="pl-4 text-slate-400">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="IP, Domain, URL, or SHA256 Hash..." 
                      className="bg-transparent border-none outline-none flex-1 px-3 py-2 md:py-2.5 text-xs md:text-sm font-mono placeholder:text-slate-600 text-white"
                    />
                    <button 
                      type="submit"
                      disabled={loading}
                      className="cyber-btn py-2 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-full font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center min-w-[100px]"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : "Scan"}
                    </button>
                  </div>
                </form>

                {error && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-3">
                     <AlertTriangle size={20} />
                     <p className="font-medium text-sm">{error}</p>
                   </motion.div>
                )}
              </div>
            </div>

            {/* Scan Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className={cn("p-1 rounded-[32px] bg-gradient-to-r shadow-xl", 
                    result.risk_level === "high" ? "from-red-500/50 via-orange-500/50 to-red-500/50 shadow-red-500/20" :
                    result.risk_level === "medium" ? "from-amber-500/50 via-yellow-500/50 to-amber-500/50 shadow-amber-500/20" :
                    "from-emerald-500/50 via-teal-500/50 to-emerald-500/50 shadow-emerald-500/20"
                )}>
                  <div className="p-6 md:p-8 rounded-[31px] bg-[#0a0a0c]/90 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                    
                    {/* Ring Visual */}
                    <div className="relative w-28 h-28 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                        <motion.circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="283"
                          initial={{ strokeDashoffset: 283 }}
                          animate={{ strokeDashoffset: result.risk_level === "high" ? 0 : result.risk_level === "medium" ? 141 : 226 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={cn(riskColors[result.risk_level].text)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {result.risk_level === "high" && <ShieldAlert size={28} className="text-red-400 mb-1" />}
                        {result.risk_level === "medium" && <AlertTriangle size={28} className="text-amber-400 mb-1" />}
                        {result.risk_level === "low" && <ShieldCheck size={28} className="text-emerald-400 mb-1" />}
                        <span className={cn("text-xs font-black uppercase tracking-widest", riskColors[result.risk_level].text)}>{result.risk_level}</span>
                      </div>
                    </div>

                    {/* Meta Data */}
                    <div className="flex-1 text-center md:text-left w-full">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 text-slate-400 font-medium text-xs">
                           {getTargetIcon(result.target_type)} <span className="uppercase tracking-widest">{result.target_type}</span>
                        </div>
                        {result.cached && (
                          <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center gap-1 uppercase tracking-widest">
                            <Database size={10} /> Edge Cached
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg md:text-xl font-black tracking-tight font-mono mb-6 break-all line-clamp-2" title={result.target}>{result.target}</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox label="Malicious Hits" value={result.vt_malicious} color={result.vt_malicious > 0 ? "red" : "emerald"} />
                        <StatBox label="Suspicious Hits" value={result.vt_suspicious} color={result.vt_suspicious > 0 ? "amber" : "emerald"} />
                        <StatBox label="Reputation Score" value={result.vt_reputation} color="blue" />
                        <StatBox label="Community Pulses" value={result.otx_hits} color={result.otx_hits > 5 ? "red" : result.otx_hits > 0 ? "amber" : "emerald"} />
                      </div>
                    </div>

                    {/* AI Call to Action */}
                    {(result.risk_level === "high" || result.risk_level === "medium") && (
                      <div className="w-full md:w-auto mt-4 md:mt-0 flex shrink-0">
                         <button onClick={askAI} className="w-full relative group p-[2px] rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-b from-blue-500/50 to-indigo-600/50 shadow-xl shadow-blue-600/20 outline-none hover:scale-[1.02] transition-transform active:scale-95">
                           <div className="absolute inset-0 bg-blue-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                           <div className="relative px-6 py-4 md:py-6 bg-[#0a0a0c]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2">
                             <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                               <Bot size={24} />
                             </div>
                             <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Ask AI Defend</span>
                             <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">Generate Report <ArrowUpRight size={10}/></span>
                           </div>
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* History Feed */}
            {history.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cyber-card">
                 <h3 className="cyber-subtitle !text-lg mb-6 flex items-center gap-3">
                  <Clock size={20} className="text-blue-500" /> Recent Scans
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {history.map((item, idx) => (
                     <motion.div key={`${item.target}-${idx}`} 
                      whileHover={{ y: -2 }}
                      onClick={() => handleHistoryClick(item)}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 cursor-pointer transition-colors relative overflow-hidden group">
                       <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity", riskColors[item.risk_level]?.hex || "bg-slate-500")} />
                       <div className="flex justify-between items-start mb-2 pl-2">
                         <span className="font-mono text-sm max-w-[70%] truncate font-bold text-slate-200 group-hover:text-blue-400">{item.target}</span>
                         <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-sm", riskColors[item.risk_level].bg, riskColors[item.risk_level].text)}>
                           {item.risk_level}
                         </span>
                       </div>
                       <div className="pl-2 flex items-center justify-between mt-3 text-[10px] font-mono text-slate-500">
                          <span className="uppercase">{item.target_type}</span>
                          <span>Malicious: {item.vt_malicious} | Pulses: {item.otx_hits}</span>
                       </div>
                     </motion.div>
                   ))}
                 </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── TAB: LIVE FEED ──────────────────────────────────── */}
        {activeTab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <div>
                 <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                   <Radio size={20} className="text-blue-500 animate-pulse"/> Global Threat Feed
                 </h2>
                 <p className="text-xs text-slate-400 mt-1">Live indicator pulses synchronized from the global cybersecurity community.</p>
              </div>
              {loadingFeed && <Loader2 className="animate-spin text-blue-500" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feed.map((pulse) => (
                <div key={pulse.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h4 className="font-bold text-sm text-slate-200 leading-snug line-clamp-2 flex-1">{pulse.name}</h4>
                      <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5", 
                        pulse.risk_color === "red" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        pulse.risk_color === "amber" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        pulse.risk_color === "orange" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      )}>
                        {pulse.indicator_count} IOCs
                      </span>
                    </div>
                    {pulse.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{pulse.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-blue-400">{pulse.author || "Anonymous"}</span> • 
                      <span>{new Date(pulse.created).toLocaleDateString()}</span>
                    </div>
                    {pulse.tags.length > 0 && (
                      <div className="flex items-center gap-1 border border-white/10 px-2 py-0.5 rounded-sm bg-black/40 text-slate-400">
                         <Hash size={8} /> {pulse.tags[0]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!loadingFeed && feed.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                  No active threat pulses found currently.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: AI ANALYSIS ──────────────────────────────────── */}
        {activeTab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
             {loadingAi ? (
                <div className="py-20 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/30 animate-pulse" />
                    <div className="p-4 bg-[#0a0a0c] border border-white/10 rounded-full relative z-10">
                      <Bot size={32} className="text-blue-400 animate-bounce" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="cyber-title !text-xl mb-2">AI is Analyzing Target...</h3>
                    <p className="font-mono text-xs text-slate-500">Processing signals from global threat networks</p>
                  </div>
                </div>
             ) : aiReport ? (
                <div className="space-y-6">
                  <div className="p-6 md:p-8 rounded-[24px] bg-gradient-to-br from-[#0a0a0c] to-[#0a0a0c]/80 border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                           <Bot size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-black font-mono capitalize tracking-tight">{aiReport.risk_level} Risk Level Expected</h2>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                             <span>Advanced AI Model</span> • <span>{result?.target}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                            <Activity size={14} className="text-blue-500"/> Threat Summary
                          </h4>
                          <p className="text-slate-300 leading-relaxed text-sm md:text-base border-l-2 border-blue-500/30 pl-4">{aiReport.summary}</p>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                            <ShieldAlert size={14} className="text-emerald-500"/> Recommended Defenses
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiReport.recommended_actions.map((action, i) => (
                              <div key={i} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                                <div className="mt-0.5 text-emerald-500"><CornerDownRight size={16}/></div>
                                <span className="text-sm text-slate-300 font-medium">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <button onClick={() => setActiveTab("scan")} className="text-xs font-bold bg-transparent text-slate-400 hover:text-white uppercase tracking-widest py-3 px-6 transition-colors">
                      ← Back to Scanner
                    </button>
                  </div>
                </div>
             ) : (
                <div className="text-center py-20">
                  <p className="text-slate-500 text-sm">Scan a target first to access AI Analysis.</p>
                </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: any = {
    red: "text-red-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
  };
  return (
    <div className="p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center flex flex-col justify-center items-center h-full">
      <p className={cn("text-xl md:text-3xl font-black mb-1", colorMap[color] || "text-white")}>{value}</p>
      <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, disabled }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative py-2.5 px-4 md:px-6 flex items-center justify-center gap-2 rounded-xl md:rounded-full font-bold text-xs md:text-sm transition-all duration-300 flex-1 md:flex-initial",
        active ? "text-white" : "text-slate-500 hover:text-slate-300",
        disabled && "opacity-50 cursor-not-allowed hover:text-slate-500"
      )}
    >
      {active && (
        <motion.div layoutId="threat-tab-bg" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl md:rounded-full shadow-lg backdrop-blur-md" />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon} <span className="hidden sm:inline">{label}</span>
      </span>
    </button>
  );
}
