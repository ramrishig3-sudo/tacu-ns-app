import React, { useState, useEffect } from "react";
import { 
  Clock, Plus, Trash2, Play, Shield, 
  Network, ShieldAlert, CheckCircle, Calendar, RefreshCw, Zap, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface ScheduledScan {
  id: string;
  type: "network" | "threat";
  target: string;
  interval: "hourly" | "daily" | "weekly";
  lastRun?: string;
  nextRun: string;
  status: "active" | "paused";
}

export default function ScheduledScans() {
  const [scans, setScans] = useState<ScheduledScan[]>(() => {
    const saved = localStorage.getItem("scheduled_scans");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newScan, setNewScan] = useState<Partial<ScheduledScan>>({
    type: "network",
    interval: "daily",
    status: "active"
  });

  useEffect(() => {
    localStorage.setItem("scheduled_scans", JSON.stringify(scans));
  }, [scans]);

  const handleAdd = () => {
    if (!newScan.target) return;
    const scan: ScheduledScan = {
      id: Math.random().toString(36).substr(2, 9),
      type: newScan.type as any,
      target: newScan.target,
      interval: newScan.interval as any,
      status: "active",
      nextRun: new Date(Date.now() + 86400000).toISOString()
    };
    setScans([...scans, scan]);
    setShowAdd(false);
    setNewScan({ type: "network", interval: "daily", status: "active" });
  };

  const removeScan = (id: string) => setScans(scans.filter(s => s.id !== id));
  const toggleStatus = (id: string) => setScans(scans.map(s => s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s));

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 md:p-12 rounded-[24px] bg-white dark:bg-[#161B2C] border border-slate-200 dark:border-white/5 relative overflow-hidden group shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[100px] -mr-40 -mt-40" />
        
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 rounded-[28px] bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center text-purple-600 shadow-xl transition-transform group-hover:scale-110 mb-8">
            <Clock size={36} />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-4">
            Active Schedulers
          </h1>
          <p className="cyber-text-s max-w-lg mx-auto mb-8 opacity-60 leading-relaxed">
            Automated infrastructure auditing and continuous <br /> threat monitoring for autonomous defense.
          </p>

          <button 
            onClick={() => setShowAdd(true)}
            className="px-10 py-4 bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Plus size={20} />
            Initialize Protocol
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="cyber-card relative overflow-hidden ring-1 ring-blue-500/30 p-8 shadow-2xl dark:bg-[#1A2033]">
            <div className="absolute top-0 right-0 p-4">
               <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 transition-colors"><X size={20}/></button>
            </div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Authorize Automated Task</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Mode</label>
                <select value={newScan.type} onChange={(e) => setNewScan({ ...newScan, type: e.target.value as any })}
                  className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none"
                >
                  <option value="network">Port Security Audit</option>
                  <option value="threat">Threat Intelligence Sync</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Vector</label>
                <input type="text" value={newScan.target || ""} onChange={(e) => setNewScan({ ...newScan, target: e.target.value })} placeholder="ipv4 or host..."
                  className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-mono text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Frequency</label>
                <select value={newScan.interval} onChange={(e) => setNewScan({ ...newScan, interval: e.target.value as any })}
                  className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none"
                >
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Every 24 Hours</option>
                  <option value="weekly">Every 7 Days</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-8 border-t border-slate-200 dark:border-white/5">
              <button onClick={() => setShowAdd(false)} className="px-6 py-3 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={handleAdd} className="px-8 py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all">Authorize Task</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5">
        {scans.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-[28px] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6">
               <RefreshCw size={40} className="animate-pulse" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">No Active Loads</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 opacity-60">Initialize a new schedule to begin auditing</p>
          </div>
        ) : (
          scans.map((scan) => (
            <motion.div key={scan.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="group"
            >
              <div className="p-6 rounded-3xl bg-white dark:bg-[#161B2C] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden hover:shadow-2xl transition-all shadow-sm">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", 
                    scan.type === "network" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  )}>
                    {scan.type === "network" ? <Network size={24} /> : <Shield size={24} />}
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                       <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">{scan.target}</h4>
                       <span className={cn("inline-flex items-center justify-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border mx-auto sm:mx-0", 
                         scan.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
                       )}>{scan.status}</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-6">
                       <div className="flex items-center gap-2">
                         <Clock size={14} className="text-slate-400"/>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{scan.interval}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Calendar size={14} className="text-slate-400"/>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-metric">Next: {new Date(scan.nextRun).toLocaleDateString()}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end pt-6 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                  <button onClick={() => toggleStatus(scan.id)} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-blue-500/10 transition-all flex items-center justify-center shadow-sm">
                    <Play size={20} className={scan.status === "active" ? "rotate-90 fill-current opacity-40" : ""} />
                  </button>
                  <button onClick={() => removeScan(scan.id)} className="w-12 h-12 rounded-2xl bg-red-500/5 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
