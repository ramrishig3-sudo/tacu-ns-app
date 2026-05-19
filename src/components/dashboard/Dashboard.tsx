import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Zap,
  Clock,
  FileText,
  TrendingUp,
  ActivityIcon,
  ArrowUpRight,
  Network,
  Wifi,
  ScanLine,
  MessageSquare,
  Gauge,
  Shield,
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
  const highRisk   = scans.filter(s => s.risk_level === "high").length;
  const mediumRisk = scans.filter(s => s.risk_level === "medium").length;
  const lowRisk    = scans.filter(s => s.risk_level === "low").length;
  const total      = scans.length;
  const securityScore = total === 0 ? 100 : Math.max(0, Math.min(100,
    100 - (highRisk * 25) - (mediumRisk * 10) - Math.max(0, (total - 10))
  ));
  return {
    securityScore,
    activeThreats: highRisk + mediumRisk,
    totalScans: total,
    pieData: [
      { name: "Safe",     value: total === 0 ? 100 : Math.round((lowRisk    / total) * 100), color: "#34D399" },
      { name: "Risky",    value: total === 0 ? 0   : Math.round((mediumRisk / total) * 100), color: "#FCD34D" },
      { name: "Critical", value: total === 0 ? 0   : Math.round((highRisk   / total) * 100), color: "#F87171" },
    ],
  };
}

// Quick action shortcuts shown below stat cards
const QUICK_ACTIONS = [
  { id: "threat",    label: "Threat Intel",  icon: Shield,       color: "#F87171" },
  { id: "network",   label: "Network",       icon: Network,      color: "#60A5FA" },
  { id: "speedtest", label: "Speed Test",    icon: Gauge,        color: "#34D399" },
  { id: "wifi",      label: "WiFi Scan",     icon: Wifi,         color: "#A78BFA" },
  { id: "lan",       label: "LAN Scan",      icon: ScanLine,     color: "#34D399" },
  { id: "ai",        label: "AI Assistant",  icon: MessageSquare,color: "#C084FC" },
];

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const [scans, setScans]     = useState<ThreatScanResult[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [isDark, setIsDark]   = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    setScans(loadScanHistory());
    const checkLatency = async () => {
      try {
        const start = Date.now();
        await apiClient.get("/health");
        setLatency(Date.now() - start);
      } catch { setLatency(null); }
    };
    checkLatency();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const stats = computeStats(scans);

  const recentAlerts = useMemo(() =>
    scans
      .filter(s => s.risk_level !== "low")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(s => ({
        title: s.risk_level === "high" ? `High Risk: ${s.target}` : `Suspicion: ${s.target}`,
        desc:  s.risk_level === "high" ? "Critical threat vector active" : "Anomalous interaction",
        time:  formatTimeAgo(s.created_at),
        severity: s.risk_level === "high" ? "critical" : "medium",
      })),
  [scans]);

  const chartStroke   = isDark ? "#38BDF8" : "#2563EB";
  const gridStroke    = isDark ? "rgba(56,189,248,0.05)" : "rgba(148,163,184,0.08)";
  const tooltipBg     = isDark ? "#0B111E" : "#FFFFFF";
  const tooltipBorder = isDark ? "rgba(56,189,248,0.20)" : "rgba(148,163,184,0.3)";
  const axisColor     = isDark ? "#334155" : "#94A3B8";

  return (
    <div className="space-y-4 pb-20">

      {/* ── Section label ── */}
      <SectionLabel text="System Overview" />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Health Score" value={stats.securityScore} suffix="%"
          icon={ShieldCheck} accentColor="#34D399"
          statusText={stats.securityScore > 80 ? "SECURE" : stats.securityScore > 50 ? "DEGRADED" : "AT RISK"}
        />
        <StatCard
          title="Active Threats" value={stats.activeThreats}
          icon={ShieldAlert} accentColor="#F87171"
          statusText={stats.activeThreats > 0 ? "DETECTED" : "CLEAR"}
        />
        <StatCard
          title="API Latency" value={latency ?? 0} suffix={latency ? "ms" : "---"}
          icon={Zap} accentColor="#FCD34D"
          statusText={latency ? (latency < 100 ? "FAST" : "SLOW") : "OFFLINE"}
        />
        <StatCard
          title="Uplink" value={0} suffix="LIVE"
          icon={Activity} accentColor="#38BDF8"
          statusText="MONITORING"
        />
      </div>

      {/* ── Quick Actions ── */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.85), rgba(8,14,28,0.90))",
          borderColor: "rgba(56,189,248,0.10)",
        }}
      >
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.22em]"
                style={{ color: "rgba(148,163,184,0.45)" }}>Quick Launch</span>
          <div className="flex-1 h-px" style={{ background: "rgba(56,189,248,0.07)" }} />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3">
          {QUICK_ACTIONS.map(action => {
            const colorHex = (opacity: number) =>
              `${action.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
            return (
              <motion.button
                key={action.id}
                onClick={() => onNavigate?.(action.id)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-2 py-3 rounded-xl"
                style={{
                  background: colorHex(0.07),
                  border: `1px solid ${colorHex(0.20)}`,
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: colorHex(0.14), border: `1px solid ${colorHex(0.28)}` }}>
                  <action.icon size={17} style={{ color: action.color }} />
                </div>
                <span className="font-black uppercase text-center leading-tight"
                      style={{ fontSize: 8, letterSpacing: "0.05em", color: "#94A3B8" }}>
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Performance Graph ── */}
        <div className="lg:col-span-2">
          <section
            className="rounded-2xl border h-full"
            style={{
              background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
              borderColor: "rgba(56,189,248,0.12)",
              minHeight: 280,
              padding: "18px 18px 14px",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38BDF8" }} />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: "#38BDF8" }}>
                    Live Feed
                  </span>
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                  Network Activity
                </h3>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.22)" }}>
                <TrendingUp size={14} style={{ color: "#38BDF8" }} />
              </div>
            </div>

            {/* Timeframe chips (aesthetic) */}
            <div className="flex gap-1.5 mb-3">
              {["24H", "7D", "30D"].map((label, i) => (
                <span key={label}
                  className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider"
                  style={{
                    background: i === 0 ? "rgba(56,189,248,0.14)" : "rgba(148,163,184,0.05)",
                    border: i === 0 ? "1px solid rgba(56,189,248,0.28)" : "1px solid rgba(148,163,184,0.10)",
                    color: i === 0 ? "#38BDF8" : "#475569",
                  }}>{label}</span>
              ))}
            </div>

            <div className="h-[150px] md:h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DUMMY_CHART} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={chartStroke} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={chartStroke} stopOpacity={0} />
                    </linearGradient>
                    <filter id="chartGlow">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize: 8, fontWeight: 700, fill: axisColor }} dy={8} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize: 8, fontWeight: 700, fill: axisColor }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: "10px",
                      fontSize: "10px",
                      padding: "8px 12px",
                      color: isDark ? "#E2E8F0" : "#0F172A",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                    cursor={{ stroke: chartStroke, strokeWidth: 1, strokeOpacity: 0.3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartStroke}
                    strokeWidth={2.5}
                    fill="url(#chartGradient)"
                    filter={isDark ? "url(#chartGlow)" : undefined}
                    dot={false}
                    activeDot={{ r: 4, fill: chartStroke, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ── Risk Distribution ── */}
        <section
          className="rounded-2xl border flex flex-col"
          style={{
            background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
            borderColor: "rgba(56,189,248,0.12)",
            padding: "18px",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FCD34D" }} />
                <span className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: "#FCD34D" }}>
                  Analysis
                </span>
              </div>
              <h3 className="text-[13px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>
                Risk Distribution
              </h3>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(252,211,77,0.10)", border: "1px solid rgba(252,211,77,0.22)" }}>
              <ActivityIcon size={14} style={{ color: "#FCD34D" }} />
            </div>
          </div>

          <div className="h-[150px] w-full relative mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  innerRadius={50}
                  outerRadius={66}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} opacity={0.92} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[28px] font-black tracking-tighter leading-none"
                    style={{ color: "#E2E8F0" }}>{stats.securityScore}%</span>
              <span className="text-[8px] font-black uppercase tracking-[0.18em] mt-1"
                    style={{ color: stats.securityScore > 80 ? "#34D399" : stats.securityScore > 50 ? "#FCD34D" : "#F87171" }}>
                {stats.securityScore > 80 ? "SECURE" : stats.securityScore > 50 ? "DEGRADED" : "AT RISK"}
              </span>
            </div>
          </div>

          {/* Legend with color bar */}
          <div className="space-y-2 mt-auto">
            {stats.pieData.map(item => (
              <div key={item.name}
                className="flex items-center justify-between rounded-xl overflow-hidden"
                style={{
                  background: "rgba(148,163,184,0.04)",
                  border: "1px solid rgba(148,163,184,0.08)",
                }}
              >
                {/* Left color bar */}
                <div className="w-[3px] self-stretch shrink-0" style={{ background: item.color }} />
                <div className="flex items-center justify-between flex-1 px-3 py-2.5">
                  <span className="font-bold text-[10px] uppercase tracking-wider" style={{ color: "#94A3B8" }}>
                    {item.name}
                  </span>
                  <span className="font-black text-[12px]" style={{ color: item.color }}>
                    {item.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Security Timeline ── */}
      <SectionLabel text="Security Timeline" />
      <section
        className="rounded-2xl border"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
          borderColor: "rgba(56,189,248,0.12)",
          padding: "18px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>
            Recent threat vectors
          </p>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all active:scale-95 text-white"
            style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.25)", color: "#38BDF8" }}
          >
            <FileText size={10} />
            Export
          </button>
        </div>

        <div className="space-y-2">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert, idx) => (
              <AlertItem key={idx} {...alert} onClick={() => onNavigate?.("threat")} />
            ))
          ) : (
            <div className="text-center py-10" style={{ opacity: 0.35 }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                   style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.20)" }}>
                <ShieldCheck size={22} style={{ color: "#34D399" }} />
              </div>
              <p className="font-black uppercase tracking-widest text-[9px]" style={{ color: "#475569" }}>
                No Threats Detected
              </p>
              <p className="font-bold uppercase tracking-wider text-[8px] mt-1" style={{ color: "#334155" }}>
                Environment is clean
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Section Label ── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(148,163,184,0.40)" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(56,189,248,0.07)" }} />
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ title, value, suffix = "", icon: Icon, accentColor, statusText }: {
  title: string; value: number; suffix?: string;
  icon: any; accentColor: string; statusText: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [value]);

  const colorHex = (opacity: number) =>
    `${accentColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
        border: `1px solid ${colorHex(0.20)}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.40), 0 0 0 0 ${colorHex(0)}`,
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${colorHex(0.30)})` }} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon + status */}
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: colorHex(0.12), border: `1px solid ${colorHex(0.25)}` }}>
            <Icon size={15} style={{ color: accentColor }} />
          </div>
          <span className="text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
                style={{ background: colorHex(0.10), color: accentColor, border: `1px solid ${colorHex(0.20)}` }}>
            {statusText}
          </span>
        </div>

        {/* Metric */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#475569" }}>
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-black leading-none tracking-tighter"
                  style={{ fontSize: "clamp(26px,5.5vw,38px)", color: "#E2E8F0" }}>
              {Math.round(displayValue)}
            </span>
            {suffix && (
              <span className="text-[10px] font-black" style={{ color: accentColor, fontFamily: "monospace" }}>
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Alert Item ── */
function AlertItem({ title, desc, time, severity, onClick }: any) {
  const borderColor = severity === "critical" ? "#F87171" : "#FCD34D";
  const badgeBg     = severity === "critical" ? "rgba(248,113,113,0.12)" : "rgba(252,211,77,0.10)";
  const badgeBorder = severity === "critical" ? "rgba(248,113,113,0.28)" : "rgba(252,211,77,0.25)";

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl overflow-hidden flex items-center group active:scale-[0.99] transition-all text-left"
      style={{
        background: "rgba(148,163,184,0.04)",
        border: "1px solid rgba(148,163,184,0.08)",
      }}
    >
      {/* Left severity bar */}
      <div className="w-[3px] self-stretch shrink-0" style={{ background: borderColor }} />

      <div className="flex items-center justify-between flex-1 px-3 py-3">
        <div className="overflow-hidden flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: badgeBg, color: borderColor, border: `1px solid ${badgeBorder}` }}>
              {severity === "critical" ? "CRITICAL" : "MEDIUM"}
            </span>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                 style={{ backgroundColor: borderColor }} />
          </div>
          <h4 className="font-black text-[11px] uppercase tracking-tight leading-none mb-1 truncate"
              style={{ color: "#CBD5E1" }}>{title}</h4>
          <p className="text-[9px] font-bold truncate" style={{ color: "#475569" }}>{desc}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest"
               style={{ background: "rgba(148,163,184,0.06)", color: "#475569", border: "1px solid rgba(148,163,184,0.08)" }}>
            <Clock size={9} />
            {time}
          </div>
          <ArrowUpRight size={13} style={{ color: "#334155" }}
            className="group-hover:text-blue-400 transition-colors" />
        </div>
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
