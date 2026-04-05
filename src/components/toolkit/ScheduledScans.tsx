import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  Shield, 
  Network, 
  AlertTriangle, 
  CheckCircle,
  Calendar
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
      nextRun: new Date(Date.now() + 86400000).toISOString() // Default to 24h from now
    };

    setScans([...scans, scan]);
    setShowAdd(false);
    setNewScan({ type: "network", interval: "daily", status: "active" });
  };

  const removeScan = (id: string) => {
    setScans(scans.filter(s => s.id !== id));
  };

  const toggleStatus = (id: string) => {
    setScans(scans.map(s => s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s));
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="cyber-title flex items-center gap-2 md:gap-3">
            <Clock size={24} className="text-blue-500" />
            Scheduled Operations
          </h3>
          <p className="cyber-text-s mt-1">Automate your security audits and threat lookups</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="cyber-btn bg-blue-600 hover:bg-blue-50 text-white shadow-lg shadow-blue-600/20 w-full sm:w-auto"
        >
          <Plus size={18} />
          New Schedule
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="cyber-card border-blue-500/30 bg-blue-500/5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="cyber-text-xs">Operation Type</label>
                <select 
                  value={newScan.type}
                  onChange={(e) => setNewScan({ ...newScan, type: e.target.value as any })}
                  className="cyber-input w-full"
                >
                  <option value="network">Network Port Scan</option>
                  <option value="threat">Threat Intel Lookup</option>
                </select>
              </div>
              <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                <label className="cyber-text-xs">Target (IP or Domain)</label>
                <input 
                  type="text"
                  value={newScan.target || ""}
                  onChange={(e) => setNewScan({ ...newScan, target: e.target.value })}
                  placeholder="e.g. 192.168.1.1 or example.com"
                  className="cyber-input w-full"
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="cyber-text-xs">Interval</label>
                <select 
                  value={newScan.interval}
                  onChange={(e) => setNewScan({ ...newScan, interval: e.target.value as any })}
                  className="cyber-input w-full"
                >
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Every Day</option>
                  <option value="weekly">Every Week</option>
                </select>
              </div>
            </div>
            <div className="mt-4 md:mt-6 flex justify-end gap-2 md:gap-3">
              <button 
                onClick={() => setShowAdd(false)}
                className="cyber-btn bg-white/5 border border-white/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                className="cyber-btn bg-blue-600 hover:bg-blue-500"
              >
                Create Schedule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {scans.length === 0 ? (
          <div className="p-8 md:p-12 rounded-2xl md:rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
            <Calendar size={48} className="text-slate-700 mb-3 md:mb-4" />
            <p className="cyber-subtitle">No scheduled operations yet.</p>
            <p className="cyber-text-s mt-1">Add a new schedule to automate your security checks.</p>
          </div>
        ) : (
          scans.map((scan) => (
            <div 
              key={scan.id}
              className="cyber-card flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 group hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                <div className={cn(
                  "w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0",
                  scan.type === "network" ? "bg-blue-600/20 text-blue-500" : "bg-purple-600/20 text-purple-500"
                )}>
                  {scan.type === "network" ? <Network size={28} /> : <Shield size={28} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                    <h4 className="font-bold text-sm md:text-lg truncate">{scan.target}</h4>
                    <span className={cn(
                      "cyber-badge",
                      scan.status === "active" ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-500 text-white border-slate-500"
                    )}>
                      {scan.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {scan.interval}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Next: {new Date(scan.nextRun).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => toggleStatus(scan.id)}
                  className="p-2 md:p-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                  title={scan.status === "active" ? "Pause" : "Resume"}
                >
                  <Play size={18} className={scan.status === "active" ? "rotate-90" : ""} />
                </button>
                <button 
                  onClick={() => removeScan(scan.id)}
                  className="p-2 md:p-3 rounded-lg md:rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-500"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
