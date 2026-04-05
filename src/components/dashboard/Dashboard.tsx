import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Globe, 
  Zap, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  AlertTriangle,
  Search,
  Database,
  RefreshCw,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { cn } from "../../lib/utils";
import { ThreatScanResult } from "../../types";

// ─── Helper: Load real scan history from localStorage/Supabase ──
function loadScanHistory(): ThreatScanResult[] {
  try {
    const saved = localStorage.getItem("threat_history");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// ─── Helper: Generate chart data from real scan timestamps ──────
function buildChartData(scans: ThreatScanResult[]) {
  const hourBuckets: Record<string, number> = {};
  // Initialize 24-hour buckets
  for (let h = 0; h < 24; h += 4) {
    hourBuckets[`${h.toString().padStart(2, "0")}:00`] = 0;
  }

  scans.forEach((s) => {
    if (s.created_at) {
      const hour = new Date(s.created_at).getHours();
      const bucket = Math.floor(hour / 4) * 4;
      const key = `${bucket.toString().padStart(2, "0")}:00`;
      hourBuckets[key] = (hourBuckets[key] || 0) + 1;
    }
  });

  return Object.entries(hourBuckets).map(([name, threats]) => ({ name, threats }));
}

// ─── Helper: Compute real stats ──────────────────────────────────
function computeStats(scans: ThreatScanResult[]) {
  const highRisk = scans.filter((s) => s.risk_level === "high").length;
  const mediumRisk = scans.filter((s) => s.risk_level === "medium").length;
  const lowRisk = scans.filter((s) => s.risk_level === "low").length;
  const total = scans.length;

  // Security score: starts at 100, drops based on threats found
  const securityScore = total === 0 ? 100 : Math.max(0, Math.min(100, 
    100 - (highRisk * 25) - (mediumRisk * 10) - Math.max(0, (total - 10))
  ));

  // Risk distribution for pie chart
  const safePercent = total === 0 ? 100 : Math.round((lowRisk / total) * 100);
  const riskyPercent = total === 0 ? 0 : Math.round((mediumRisk / total) * 100);
  const criticalPercent = total === 0 ? 0 : Math.round((highRisk / total) * 100);

  // Estimate network data from page performance (real)
  let networkTrafficMB = 0;
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    networkTrafficMB = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0) / (1024 * 1024);
  } catch {}

  return {
    securityScore,
    activeThreats: highRisk + mediumRisk,
    networkTraffic: networkTrafficMB < 1 ? `${Math.round(networkTrafficMB * 1024)} KB` : `${networkTrafficMB.toFixed(1)} MB`,
    totalScans: total,
    highRisk,
    mediumRisk,
    lowRisk,
    pieData: [
      { name: "Safe", value: safePercent || (total === 0 ? 100 : 0), color: "#3b82f6" },
      { name: "Risky", value: riskyPercent, color: "#f59e0b" },
      { name: "Critical", value: criticalPercent, color: "#ef4444" },
    ],
  };
}

export default function Dashboard() {
  const [scans, setScans] = useState<ThreatScanResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real data on mount
  useEffect(() => {
    const data = loadScanHistory();
    setScans(data);
    setLoading(false);
  }, []);

  const stats = computeStats(scans);
  const chartData = buildChartData(scans);

  // Generate recent alerts from scan data
  const recentAlerts = scans
    .filter((s) => s.risk_level !== "low")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((s) => ({
      title: s.risk_level === "high"
        ? `High Risk Target Detected: ${s.target}`
        : `Suspicious Target Found: ${s.target}`,
      desc: s.risk_level === "high"
        ? `Flagged by ${s.vt_malicious} global security vendors, ${s.otx_hits} community threat pulses`
        : `${s.vt_suspicious} suspicious detections, ${s.otx_hits} community threat pulses`,
      time: formatTimeAgo(s.created_at),
      severity: s.risk_level === "high" ? "critical" : "medium",
    }));

  const generatePDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const element = document.getElementById("dashboard-root");
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TacU-NS-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
    }
  };

  return (
    <div id="dashboard-root" className="space-y-6 md:space-y-8">
      {/* Hero Stats */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
      >
        <StatCard 
          title="Security Score" 
          value={loading ? "..." : `${stats.securityScore}%`} 
          icon={ShieldCheck} 
          trend={stats.securityScore >= 80 ? "Good" : stats.securityScore >= 50 ? "Fair" : "At Risk"} 
          trendUp={stats.securityScore >= 50}
          color="blue"
        />
        <StatCard 
          title="Active Threats" 
          value={loading ? "..." : String(stats.activeThreats)} 
          icon={ShieldAlert} 
          trend={stats.activeThreats === 0 ? "None" : `${stats.activeThreats} found`} 
          trendUp={stats.activeThreats === 0}
          color="red"
        />
        <StatCard 
          title="Network Traffic" 
          value={loading ? "..." : stats.networkTraffic} 
          icon={Activity} 
          trend="Session data" 
          trendUp={true}
          color="emerald"
        />
        <StatCard 
          title="Total Scans" 
          value={loading ? "..." : String(stats.totalScans)} 
          icon={Globe} 
          trend={stats.totalScans > 0 ? "Active" : "No scans yet"} 
          trendUp={true}
          color="indigo"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 cyber-card">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h3 className="cyber-subtitle !text-lg md:!text-xl">Scan Activity</h3>
              <p className="cyber-text-s">
                {scans.length > 0
                  ? `Based on ${scans.length} real IP scan${scans.length > 1 ? "s" : ""}`
                  : "Scan IPs in Threat Intel to populate this chart"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {scans.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <Database size={10} />
                  Live Data
                </span>
              )}
            </div>
          </div>
          
          {scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[180px] md:h-[240px] text-center">
              <Search size={32} className="text-slate-700 mb-3" />
              <p className="text-xs text-slate-500 font-medium">No scan data yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Go to Threat Intel and scan an IP to see real data here</p>
            </div>
          ) : (
            <div className="h-[180px] md:h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} 
                    formatter={(value: number) => [`${value} scan${value !== 1 ? "s" : ""}`, "Scans"]}
                  />
                  <Area type="monotone" dataKey="threats" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Distribution Chart */}
        <div className="cyber-card flex flex-col items-center">
          <h3 className="cyber-subtitle !text-lg md:!text-xl self-start mb-1">Risk Distribution</h3>
          <p className="cyber-text-s self-start mb-4 md:mb-6">
            {scans.length > 0 ? "Based on real scan results" : "Scan IPs to see distribution"}
          </p>
          
          <div className="h-[160px] md:h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl md:text-2xl font-bold">{stats.pieData[0].value}%</span>
              <span className="text-[9px] md:text-[10px] text-slate-400">
                {scans.length > 0 ? "Safe" : "No data"}
              </span>
            </div>
          </div>

          <div className="w-full space-y-2 md:space-y-3 mt-3 md:mt-4">
            {stats.pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] md:text-xs font-medium">{item.name}</span>
                </div>
                <span className="text-[10px] md:text-xs text-slate-400">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="cyber-card">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="cyber-subtitle !text-lg md:!text-xl">Recent Security Alerts</h3>
          <div className="flex gap-2 md:gap-3">
            <button 
              onClick={generatePDF}
              className="cyber-btn bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <FileText size={14} />
              Report
            </button>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert, idx) => (
              <AlertItem key={idx} title={alert.title} desc={alert.desc} time={alert.time} severity={alert.severity} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck size={36} className="text-emerald-500/30 mb-3" />
              <p className="text-xs font-medium text-slate-400">No threats detected</p>
              <p className="text-[10px] text-slate-600 mt-1">
                All clear! Scan IPs in Threat Intel to monitor for threats.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    red: "text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
  };

  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="cyber-card relative overflow-hidden group border-dashed"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-12 -mt-12 group-hover:bg-white/10 transition-colors" />
      <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
        <div className={cn("p-2 md:p-3 rounded-lg md:rounded-xl border transition-transform group-hover:scale-110 duration-500", colors[color])}>
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
          trendUp ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] mb-1 md:mb-1.5">{title}</h4>
        <p className="text-xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{value}</p>
      </div>
      <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Zap size={32} />
      </div>
    </motion.div>
  );
}

function AlertItem({ title, desc, time, severity }: any) {
  const severities: any = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  return (
    <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl hover:bg-white/5 transition-all group">
      <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mt-2 shrink-0", severities[severity])} />
      <div className="flex-1">
        <h5 className="font-bold text-xs md:text-sm group-hover:text-blue-400 transition-colors">{title}</h5>
        <p className="cyber-text-s mt-1">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 text-slate-500 text-[10px] md:text-xs shrink-0">
        <Clock size={14} />
        {time}
      </div>
    </div>
  );
}
