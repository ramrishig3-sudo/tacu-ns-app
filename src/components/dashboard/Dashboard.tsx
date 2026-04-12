import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Clock, 
  FileText, 
  AlertTriangle,
  History,
  TrendingUp,
  ActivityIcon
} from "lucide-react";
import { motion, animate } from "motion/react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { cn } from "../../lib/utils";
import { ThreatScanResult } from "../../types";
import apiClient from "../../services/api";

function loadScanHistory(): ThreatScanResult[] {
  try {
    const saved = localStorage.getItem("threat_history");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function computeStats(scans: ThreatScanResult[]) {
  const highRisk = scans.filter((s) => s.risk_level === "high").length;
  const mediumRisk = scans.filter((s) => s.risk_level === "medium").length;
  const lowRisk = scans.filter((s) => s.risk_level === "low").length;
  const total = scans.length;
  const securityScore = total === 0 ? 100 : Math.max(0, Math.min(100, 
    100 - (highRisk * 25) - (mediumRisk * 10) - Math.max(0, (total - 10))
  ));
  
  return {
    securityScore,
    activeThreats: highRisk + mediumRisk,
    totalScans: total,
    pieData: [
      { name: "Safe", value: total === 0 ? 100 : Math.round((lowRisk / total) * 100), color: "#10b981" },
      { name: "Risky", value: total === 0 ? 0 : Math.round((mediumRisk / total) * 100), color: "#f59e0b" },
      { name: "Critical", value: total === 0 ? 0 : Math.round((highRisk / total) * 100), color: "#ef4444" },
    ],
  };
}

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const [scans, setScans] = useState<ThreatScanResult[]>([]);
  
  const [latency, setLatency] = useState<number | null>(null);
  
  useEffect(() => {
    setScans(loadScanHistory());
    
    // Real-time Latency check
    const checkLatency = async () => {
      try {
        const start = Date.now();
        await apiClient.get("/health");
        setLatency(Date.now() - start);
      } catch { setLatency(null); }
    };
    checkLatency();
  }, []);

  const stats = computeStats(scans);
  
  const recentAlerts = useMemo(() => scans
    .filter((s) => s.risk_level !== "low")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((s) => ({
      title: s.risk_level === "high" ? `High Risk: ${s.target}` : `Suspicion: ${s.target}`,
      desc: s.risk_level === "high" ? "Critical threat vector active" : "Anomalous interaction",
      time: formatTimeAgo(s.created_at),
      severity: s.risk_level === "high" ? "critical" : "medium",
    })), [scans]);

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      
      {/* ── Top Status Metrics (2-Column Grid on Mobile) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Health" 
          value={stats.securityScore} 
          suffix="%" 
          icon={ShieldCheck} 
          status="green" 
        />
        <StatCard 
          title="Threats" 
          value={stats.activeThreats} 
          icon={ShieldAlert} 
          status={stats.activeThreats > 0 ? "red" : "blue"} 
        />
        <StatCard 
          title="Latency" 
          value={latency || 0} 
          suffix={latency ? "ms" : "---"} 
          icon={Zap} 
          status={latency ? (latency < 100 ? "green" : "amber") : "blue"} 
        />
        <StatCard 
          title="Uplink" 
          value={0} 
          suffix="MEASURING..." 
          icon={Activity} 
          status="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* ── Performance Graph (Major Focus) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
          <section className="enterprise-card h-fit lg:min-h-[350px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="metric-medium">System Performance</h3>
                <p className="label-upper mt-1 scale-90 origin-left">Traffic flow & security overhead</p>
              </div>
              <div className="status-circle status-circle-blue w-7 h-7">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="h-[140px] md:h-[200px] lg:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DUMMY_CHART}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 700, fill: "#94a3b8" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 700, fill: "#94a3b8" }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#111827", 
                      border: "1px solid rgba(255,255,255,0.05)", 
                      borderRadius: "8px",
                      fontSize: "10px",
                      padding: "8px"
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ── Risk Distribution (Secondary Focus) ── */}
        <section className="enterprise-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-6">
            <h3 className="metric-medium">Risk Analysis</h3>
            <div className="status-circle status-circle-amber">
               <ActivityIcon size={18} />
            </div>
          </div>
          
          <div className="h-[180px] w-full relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="metric-medium text-slate-900 dark:text-white leading-none">{stats.securityScore}%</span>
              <span className="label-upper mt-1 scale-75">Healthy</span>
            </div>
          </div>

          <div className="w-full space-y-2">
             {stats.pieData.map(item => (
               <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                 <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="font-bold text-[10px] uppercase tracking-wider">{item.name}</span>
                 </div>
                 <span className="font-black text-xs">{item.value}%</span>
               </div>
             ))}
          </div>
        </section>
      </div>

      {/* ── Security Timeline (Data Grid) ── */}
      <section className="enterprise-card">
        <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="metric-medium">Security Timeline</h3>
             <p className="label-upper mt-1 uppercase scale-90 origin-left">Recent vector signatures</p>
           </div>
           <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
             <FileText size={12} />
             <span>Export</span>
           </button>
        </div>

        <div className="space-y-2">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert, idx) => (
              <AlertItem key={idx} {...alert} onClick={() => onNavigate?.("threat")} />
            ))
          ) : (
            <div className="text-center py-12 opacity-30">
               <ShieldCheck size={32} className="mx-auto mb-3" />
               <p className="font-black uppercase tracking-widest text-[9px]">Environmental Scan Completed: 0 Threats</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, suffix = "", icon: Icon, status, decimal }: any) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      onUpdate: (latest) => setDisplayValue(latest)
    });
    return () => controls.stop();
  }, [value]);

  const statusMap: any = {
    green: "status-circle-green",
    red: "status-circle-red",
    amber: "status-circle-amber",
    blue: "status-circle-blue"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="enterprise-card flex flex-col gap-4 shadow-sm p-4 overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className={cn("status-circle w-8 h-8 rounded-lg shadow-lg shadow-black/5", statusMap[status])}>
          <Icon size={16} />
        </div>
        <div className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Live</span>
        </div>
      </div>
      <div>
        <p className="label-upper mb-1.5 truncate">{title}</p>
        <div className="flex items-baseline gap-1 truncate">
            <span className="metric-large text-4xl! leading-none tracking-tighter">{decimal ? displayValue.toFixed(1) : Math.round(displayValue)}</span>
           <span className="text-[14px] font-black text-[var(--text-secondary)] font-metric ml-1">{suffix}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AlertItem({ title, desc, time, severity, onClick }: any) {
  const sevMap: any = {
    critical: "bg-red-500",
    medium: "bg-amber-500"
  };
  
  return (
    <button 
      onClick={onClick}
      className="w-full p-3.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all text-left"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", sevMap[severity])} />
        <div className="truncate">
          <h4 className="font-black text-[11px] text-slate-900 dark:text-white truncate uppercase tracking-tight leading-none mb-1">{title}</h4>
          <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-tight truncate">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500 shrink-0 ml-2">
        <Clock size={10} />
        {time}
      </div>
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DUMMY_CHART = [
  { name: "00:00", value: 30 },
  { name: "04:00", value: 45 },
  { name: "08:00", value: 35 },
  { name: "12:00", value: 65 },
  { name: "16:00", value: 40 },
  { name: "20:00", value: 55 },
  { name: "23:59", value: 48 },
];
