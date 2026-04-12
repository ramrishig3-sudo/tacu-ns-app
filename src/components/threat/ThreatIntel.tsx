import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Globe, AlertTriangle, 
  Loader2, Zap, Clock, ShieldAlert,
  ShieldCheck, Radio, Bot, Hash, Network, CornerDownRight, ArrowUpRight, Activity, X,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { ThreatScanResult, ScanAPIResponse, ThreatFeedPulse, AIThreatAnalysis } from "../../types";
import apiClient from "../../services/api";
import { getScanHistory } from "../../services/supabase";

type Tab = "scan" | "feed" | "ai";

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

  return (
    <div className="space-y-6 pb-20">
      
      {/* ── High Density Tabs ── */}
      <div className="flex justify-center">
        <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
          <TabButton active={activeTab === "scan"} onClick={() => setActiveTab("scan")} icon={<Search size={14} />} label="Scan" />
          <TabButton active={activeTab === "feed"} onClick={() => setActiveTab("feed")} icon={<Radio size={14} />} label="Feed" />
          <TabButton active={activeTab === "ai"} onClick={() => setActiveTab("ai")} icon={<Bot size={14} />} label="AI" disabled={!result} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <section className="enterprise-card flex flex-col items-center py-10">
              <h2 className="metric-medium text-lg mb-6 uppercase">Vector Inquiry</h2>
              <form onSubmit={handleScan} className="w-full max-w-xl px-2">
                <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/10 rounded-xl shadow-lg focus-within:border-blue-500/50">
                   <div className="pl-2 text-slate-400"><Search size={16} /></div>
                   <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="IP, Domain, or Hash..." className="flex-1 bg-transparent border-none outline-none py-2 text-xs font-bold" />
                   <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 rounded-lg text-white font-black uppercase text-[9px] active:scale-95 transition-all flex items-center gap-2">
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Execute
                   </button>
                </div>
              </form>
            </section>

            {result && (
              <section className="enterprise-card py-6">
                 <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/5" />
                         <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * 0.7)} className={cn("transition-all", result.risk_level === "high" ? "stroke-red-500" : "stroke-emerald-500")} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-metric font-black text-sm">{result.risk_level === "high" ? "90" : "15"}</span>
                          <span className="text-[6px] font-black uppercase opacity-60">Risk</span>
                       </div>
                    </div>
                    <div className="text-center w-full overflow-hidden">
                       <h3 className="metric-medium truncate px-4">{result.target}</h3>
                       <div className="flex justify-center gap-6 mt-4">
                          <MiniBox icon={<ShieldAlert size={12} />} val={result.vt_malicious} lab="Hits" />
                          <MiniBox icon={<Globe size={12} />} val={result.vt_reputation} lab="Rep" />
                          <MiniBox icon={<Zap size={12} />} val={result.otx_hits} lab="IOCs" />
                       </div>
                    </div>
                    <button onClick={askAI} className="w-full p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between group active:scale-[0.98]">
                       <div className="flex items-center gap-2.5">
                          <Bot className="text-blue-500" size={14} />
                          <span className="text-[9px] font-black uppercase tracking-tight">AI Threat Insight</span>
                       </div>
                       <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-500" />
                    </button>
                 </div>
              </section>
            )}

            {history.length > 0 && (
              <section className="enterprise-card">
                 <h3 className="label-upper text-blue-500 mb-6">Recent Vectors</h3>
                 <div className="grid grid-cols-1 gap-2">
                    {history.map((item, idx) => (
                      <button key={idx} onClick={() => { setActiveTab("scan"); setResult(item); setQuery(item.target); }} className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between active:scale-[0.99] transition-all text-left group">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn("w-1.5 h-1.5 rounded-full", item.risk_level === "high" ? "bg-red-500" : "bg-emerald-500")} />
                            <span className="text-[10px] font-black uppercase truncate group-hover:text-blue-500 transition-colors">{item.target}</span>
                         </div>
                         <span className="text-[8px] font-black opacity-40 uppercase shrink-0">{formatTimeAgo(item.created_at)}</span>
                      </button>
                    ))}
                 </div>
              </section>
            )}
            
            {history.length === 0 && !loading && (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[32px] opacity-40">
                <Search size={32} className="mx-auto mb-3" />
                <p className="label-upper">No scan history available.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Feed section clickable restoration */}
        {activeTab === "feed" && (
           <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="enterprise-card p-0 overflow-hidden">
              <header className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                 <h3 className="label-upper text-blue-500">Live Intel Streams</h3>
                 {loadingFeed && <Loader2 size={14} className="animate-spin text-blue-500" />}
              </header>
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[500px] overflow-y-auto no-scrollbar">
                 {feed.length === 0 && !loadingFeed && (
                    <div className="p-10 text-center opacity-40">
                      <Radio size={32} className="mx-auto mb-3" />
                      <p className="label-upper">Synchronizing with OTX Hub...</p>
                    </div>
                 )}
                 {feed.map(p => (
                   <button 
                     key={p.id} 
                     onClick={() => setSelectedPulse(p)} 
                     className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between group transition-colors"
                   >
                      <div className="flex items-center gap-3 overflow-hidden">
                         <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", p.risk_color === "red" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500")}>
                            <Globe size={14} />
                         </div>
                         <div className="truncate">
                            <h4 className="text-[10px] font-black uppercase truncate tracking-tight group-hover:text-blue-500 transition-colors">{p.name}</h4>
                            <p className="text-[8px] opacity-40 uppercase truncate">{p.author || "Global Sensor"}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                         <span className="font-metric font-black text-[10px] text-slate-500">{p.indicator_count}</span>
                         <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100" />
                      </div>
                   </button>
                 ))}
              </div>
           </motion.div>
        )}

        {/* AI Insight section */}
        {activeTab === "ai" && aiReport && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
             <section className="enterprise-card bg-blue-600 border-none text-white">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                     <Bot size={18} />
                   </div>
                   <h3 className="label-upper text-white">Neural Assessment</h3>
                </div>
                <p className="text-xs font-bold leading-relaxed">{aiReport.summary}</p>
                <div className="mt-6 flex items-center gap-4">
                   <div className="px-3 py-1 rounded-full bg-white/20 text-[8px] font-black uppercase tracking-wider">
                      Risk Index: {aiReport.risk_level}
                   </div>
                </div>
             </section>

             <section className="enterprise-card">
                <h3 className="label-upper text-blue-500 mb-6">Strategic Countermeasures</h3>
                <div className="space-y-3">
                   {aiReport.recommended_actions.map((action, idx) => (
                     <div key={idx} className="flex gap-3">
                        <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                           <span className="text-[9px] font-black">{idx + 1}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{action}</p>
                     </div>
                   ))}
                </div>
             </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pulse Detail Modal ── */}
      <AnimatePresence>
        {selectedPulse && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPulse(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="relative w-full max-w-xl bg-white dark:bg-[#111827] rounded-[32px] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl"
            >
              <header className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                       <Globe size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight leading-none mb-1">Pulse Intelligence</h2>
                      <p className="text-[8px] font-black opacity-40 uppercase">{selectedPulse.author}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPulse(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:text-red-500 transition-all">
                    <X size={16} />
                  </button>
              </header>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter leading-tight mb-2">{selectedPulse.name}</h3>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest">{selectedPulse.indicator_count} Indicators</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest opacity-60">{formatTimeAgo(selectedPulse.created)}</span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-300">
                      {selectedPulse.description || "No tactical description provided for this intelligence stream."}
                    </p>
                  </div>

                  {selectedPulse.tags && (
                    <div className="flex flex-wrap gap-1.5">
                       {selectedPulse.tags.map(tag => (
                         <span key={tag} className="px-2 py-1 rounded-md bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 text-[7px] font-black uppercase tracking-wider opacity-60">#{tag}</span>
                       ))}
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                    <button 
                      onClick={() => window.open(`https://otx.alienvault.com/pulse/${selectedPulse.id}`, "_blank")}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                       Inspect Full Stream
                       <ExternalLink size={14} />
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

function MiniBox({ icon, val, lab }: any) {
  return (
    <div className="flex flex-col items-center gap-1">
       <div className="text-blue-500 bg-blue-500/10 p-1.5 rounded-lg mb-0.5">
         {icon}
       </div>
       <span className="font-black text-xs font-metric">{val}</span>
       <span className="text-[7px] font-black uppercase opacity-40">{lab}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] font-black uppercase tracking-wider transition-all", active ? "bg-blue-600 text-white shadow-md" : "text-[var(--text-secondary)] opacity-60", disabled && "opacity-20")}>
       {React.cloneElement(icon, { size: 12 })} {label}
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
