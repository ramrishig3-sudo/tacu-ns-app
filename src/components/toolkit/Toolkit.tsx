import React, { useState } from "react";
import {
  Hash, Lock, Calculator, Zap, Copy, CheckCircle,
  ShieldCheck, ShieldAlert, RefreshCw, Globe, Activity, AlertTriangle, Mail,
  Search, Server, Cpu, Loader2, Crosshair, MapPin, Building2, Clock, Wifi, ShieldX, ShieldAlert as ShieldWarn,
  BookOpen, ChevronDown, ChevronUp, Fingerprint, KeyRound, Database, Eye, Terminal
} from "lucide-react";
import EmailAnalyzer from "../email/EmailAnalyzer";
import CryptoJS from "crypto-js";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

type ToolType = "hash" | "password" | "subnet" | "ping" | "email" | "dns" | "domain" | "mac" | "ipintel" | "hashcheck" | "breach";

function isValidHostname(h: string): boolean {
  // RFC-1123 hostname: labels of 1–63 chars, total ≤253, no leading/trailing hyphens
  return /^(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)*[a-zA-Z]{2,}$/.test(h) && h.length <= 253;
}

const TOOL_CFG: Record<ToolType, { label: string; icon: React.ElementType; color: string }> = {
  hash:      { label: "Hashes",   icon: Hash,        color: "#38BDF8" },
  password:  { label: "Entropy",  icon: Lock,        color: "#FCD34D" },
  subnet:    { label: "Subnets",  icon: Calculator,  color: "#34D399" },
  ping:      { label: "Ping",     icon: Zap,         color: "#F97316" },
  email:     { label: "Email",    icon: Mail,        color: "#C084FC" },
  dns:       { label: "DNS",      icon: Server,      color: "#60A5FA" },
  domain:    { label: "WHOIS",    icon: Globe,       color: "#06B6D4" },
  mac:       { label: "MAC",      icon: Cpu,         color: "#A78BFA" },
  ipintel:   { label: "IP Intel", icon: Crosshair,   color: "#F87171" },
  hashcheck: { label: "Malware",  icon: Fingerprint, color: "#EF4444" },
  breach:    { label: "Breach",   icon: KeyRound,    color: "#8B5CF6" },
};

const CARD_BG = "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))";

export default function Toolkit() {
  const [activeTool, setActiveTool] = useState<ToolType>("hash");
  const active = TOOL_CFG[activeTool];

  return (
    <div className="space-y-4 pb-20">

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: CARD_BG, borderColor: `${active.color}30` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${active.color}, ${active.color}40)` }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
               style={{ background: `${active.color}15`, border: `1px solid ${active.color}30` }}>
            <active.icon size={16} style={{ color: active.color }} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.40)" }}>Security Lab</p>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Toolkit</p>
          </div>
          <div className="ml-auto px-2.5 py-1 rounded-full"
               style={{ background: `${active.color}12`, border: `1px solid ${active.color}25` }}>
            <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: active.color }}>{active.label}</span>
          </div>
        </div>
      </div>

      {/* Tool selection grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(TOOL_CFG) as ToolType[]).map(id => {
          const cfg = TOOL_CFG[id];
          const isActive = activeTool === id;
          const Icon = cfg.icon;
          return (
            <button key={id} onClick={() => setActiveTool(id)}
              className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all active:scale-95"
              style={{
                background: isActive ? `${cfg.color}12` : "rgba(148,163,184,0.05)",
                border: `1px solid ${isActive ? `${cfg.color}30` : "rgba(148,163,184,0.10)"}`,
              }}>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                     style={{ background: cfg.color }} />
              )}
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                   style={{ background: isActive ? `${cfg.color}20` : "transparent" }}>
                <Icon size={12} style={{ color: isActive ? cfg.color : "rgba(148,163,184,0.40)" }} />
              </div>
              <span className="text-[6.5px] font-black uppercase tracking-wide"
                    style={{ color: isActive ? cfg.color : "rgba(148,163,184,0.40)" }}>
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tool content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTool}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: CARD_BG, borderColor: `${active.color}20` }}>
          <div style={{ height: 2, background: `linear-gradient(90deg, ${active.color}, ${active.color}30)` }} />
          <div className="p-4 min-h-[400px]">
            {activeTool === "hash"      && <HashGenerator />}
            {activeTool === "password"  && <PasswordChecker />}
            {activeTool === "subnet"    && <SubnetCalculator />}
            {activeTool === "ping"      && <PingTool />}
            {activeTool === "email"     && <EmailAnalyzer />}
            {activeTool === "dns"       && <DNSLookup />}
            {activeTool === "domain"    && <DomainLookup />}
            {activeTool === "mac"       && <MacLookup />}
            {activeTool === "ipintel"   && <IPIntelligence />}
            {activeTool === "hashcheck" && <HashCheck />}
            {activeTool === "breach"    && <BreachCheck />}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Shared sub-tool header ───────────────────────────────────────────────────

function ToolHeader({ icon: Icon, title, subtitle, color }: { icon: React.ElementType; title: string; subtitle?: string; color: string }) {
  return (
    <header className="flex flex-col items-center text-center mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
           style={{ background: `${color}15`, border: `1px solid ${color}28` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{title}</p>
      {subtitle && <p className="text-[8px] font-bold mt-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>{subtitle}</p>}
    </header>
  );
}

// ─── Hash Generator ───────────────────────────────────────────────────────────

function HashGenerator() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const color = "#38BDF8";

  const hashes = {
    MD5:    input ? CryptoJS.MD5(input).toString()    : "",
    SHA1:   input ? CryptoJS.SHA1(input).toString()   : "",
    SHA256: input ? CryptoJS.SHA256(input).toString() : "",
  };

  const copy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <ToolHeader icon={Hash} title="Hash Factory" color={color} />

      <div className="space-y-1.5">
        <p className="text-[7px] font-black uppercase tracking-wider ml-1" style={{ color }}>Input Payload</p>
        <div className="rounded-xl overflow-hidden border" style={{ background: "rgba(148,163,184,0.05)", borderColor: `${color}20` }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Payload..."
            className="w-full h-16 p-3 bg-transparent border-none outline-none font-mono text-[10px] text-white resize-none" />
        </div>
      </div>

      <div className="space-y-1.5">
        {Object.entries(hashes).map(([name, value]) => (
          <div key={name} className="p-2.5 rounded-xl flex items-center justify-between gap-3"
               style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <div className="overflow-hidden">
              <span className="text-[6px] font-black uppercase tracking-wider block mb-0.5" style={{ color }}>{name}</span>
              <p className="font-mono text-[9px] truncate" style={{ color: "rgba(148,163,184,0.70)" }}>{value || "Waiting..."}</p>
            </div>
            <button onClick={() => copy(value, name)}
              className="p-1.5 rounded-lg transition-all shrink-0"
              style={{ background: "rgba(148,163,184,0.08)" }}>
              {copied === name
                ? <CheckCircle size={11} style={{ color: "#10B981" }} />
                : <Copy size={11} style={{ color: "rgba(148,163,184,0.50)" }} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Password Checker ─────────────────────────────────────────────────────────

function PasswordChecker() {
  const [password, setPassword] = useState("");
  const color = "#FCD34D";

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length > 8) s++; if (p.length > 12) s++;
    if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 5);
  };
  const s = getStrength(password);
  const info = [
    { label: "Vulnerable",  color: "#EF4444" }, { label: "High Risk",  color: "#F97316" },
    { label: "Med Risk",    color: "#F59E0B" }, { label: "Good",       color: "#38BDF8" },
    { label: "Strong",      color: "#10B981" }, { label: "Fortified",  color: "#8B5CF6" },
  ];

  return (
    <div className="space-y-4">
      <ToolHeader icon={Lock} title="Entropy Analysis" color={color} />

      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Enter password to check strength..."
        autoComplete="off"
        className="w-full px-4 py-2 rounded-xl outline-none font-mono text-sm text-center text-white tracking-widest"
        style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}25` }} />

      <div className="p-3 rounded-xl" style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
        <div className="flex justify-between items-end mb-1.5 px-1">
          <span className="text-[7px] font-black uppercase tracking-wider" style={{ color }}>Security Index</span>
          <span className="font-black text-[9px]" style={{ color: info[s].color }}>{s * 20}%</span>
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden mb-3" style={{ background: "rgba(148,163,184,0.10)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${(s / 5) * 100}%` }}
            className="h-full transition-all duration-700 rounded-full"
            style={{ background: info[s].color }} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: s > 3 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        border: `1px solid ${s > 3 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
            {s > 3
              ? <ShieldCheck size={10} style={{ color: "#10B981" }} />
              : <AlertTriangle size={10} style={{ color: "#EF4444" }} />}
          </div>
          <p className="font-black text-[9px] uppercase tracking-tighter" style={{ color: info[s].color }}>{info[s].label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Subnet Calculator ────────────────────────────────────────────────────────

function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.1");
  const [mask, setMask] = useState("24");
  const color = "#34D399";

  const toIP = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  const getSubnet = (iS: string, c: number) => {
    const p = iS.split(".").map(Number);
    if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255) || c < 0 || c > 32) return null;
    const iN = (p[0] << 24 | p[1] << 16 | p[2] << 8 | p[3]) >>> 0;
    const mN = c === 0 ? 0 : (~0 << (32 - c)) >>> 0;
    const nN = (iN & mN) >>> 0; const bN = (nN | ~mN) >>> 0;
    const fH = c >= 31 ? nN : (nN + 1) >>> 0; const lH = c >= 31 ? bN : (bN - 1) >>> 0;
    const tH = c >= 31 ? (c === 32 ? 1 : 2) : Math.pow(2, 32 - c) - 2;
    return { network: toIP(nN), broadcast: toIP(bN), first: toIP(fH), last: toIP(lH), total: tH.toLocaleString(), mask: toIP(mN) };
  };
  const res = getSubnet(ip, parseInt(mask) || 24);

  return (
    <div className="space-y-4">
      <ToolHeader icon={Calculator} title="Logical Scoping" color={color} />

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[7px] font-black uppercase tracking-wider mb-1 ml-1" style={{ color }}>IP</p>
          <input type="text" value={ip} onChange={e => setIp(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg outline-none text-[9px] font-mono text-white"
            style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        </div>
        <div className="w-14">
          <p className="text-[7px] font-black uppercase tracking-wider mb-1 ml-1 text-center" style={{ color }}>Mask</p>
          <input type="number" min="0" max="32" value={mask} onChange={e => setMask(e.target.value)}
            className="w-full px-1 py-1.5 rounded-lg outline-none font-black text-center text-[10px] text-white"
            style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        </div>
      </div>

      {res ? (
        <div className="grid grid-cols-2 gap-2">
          <ScopeBox label="NET"   value={res.network}   color={color} />
          <ScopeBox label="BCST"  value={res.broadcast} color={color} />
          <ScopeBox label="START" value={res.first}     color={color} />
          <ScopeBox label="END"   value={res.last}      color={color} />
        </div>
      ) : (
        <div className="p-4 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)" }}>
          <span className="text-[8px] font-black uppercase" style={{ color: "#EF4444" }}>Invalid Range</span>
        </div>
      )}
    </div>
  );
}

function ScopeBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-xl flex flex-col gap-0.5"
         style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <span className="text-[6px] font-black uppercase tracking-widest" style={{ color: `${color}80` }}>{label}</span>
      <span className="font-mono font-black text-[9px] truncate uppercase" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Ping Tool ────────────────────────────────────────────────────────────────

function PingTool() {
  const [target, setTarget] = useState("google.com");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const color = "#F97316";

  const start = async () => {
    setLoading(true); setResults([]);
    try {
      const res = await apiClient.get(`/api/network/ping/${encodeURIComponent(target)}?count=4`);
      setResults(res.data.results || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <ToolHeader icon={Zap} title="TCP Pulse" color={color} />

      <div className="flex gap-1.5">
        <input type="text" value={target} onChange={e => setTarget(e.target.value)}
          placeholder="ipv4..."
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-black uppercase text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={start} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all"
          style={{ background: color }}>
          {loading ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
          Go
        </button>
      </div>

      <div className="p-3 rounded-2xl min-h-[120px] font-mono"
           style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="space-y-1">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full" style={{ background: r.status === "Reply" ? "#10B981" : "#EF4444" }} />
                <span className="text-[8px] font-black" style={{ color: "rgba(148,163,184,0.50)" }}>P{i + 1}</span>
                <span className="text-[8px] font-bold uppercase" style={{ color: "#E2E8F0" }}>{r.status}</span>
              </div>
              {r.status === "Reply" && <span className="font-black text-[9px]" style={{ color }}>{r.time}ms</span>}
            </div>
          ))}
          {!loading && results.length === 0 && (
            <p className="text-[7px] uppercase tracking-widest mt-8 text-center" style={{ color: "rgba(148,163,184,0.30)" }}>Execute probe...</p>
          )}
          {loading && (
            <p className="text-[7px] animate-pulse uppercase tracking-widest mt-8 text-center" style={{ color }}>Transmitting...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DNS Lookup ───────────────────────────────────────────────────────────────

function DNSLookup() {
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const color = "#60A5FA";
  const recordTypes = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"];

  const lookup = async () => {
    const clean = domain.trim().toLowerCase();
    if (!clean) return;
    if (!isValidHostname(clean)) { setError("Enter a valid domain (e.g. example.com)"); return; }
    setLoading(true); setError(""); setResults(null);
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(clean)}&type=${recordType}`);
      const data = await resp.json();
      if (data.Status !== 0 || !data.Answer) setError("No records found or domain doesn't exist");
      else setResults(data);
    } catch { setError("DNS lookup failed — check your connection"); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <ToolHeader icon={Server} title="DNS Record Lookup" color={color} />

      <div className="flex gap-1.5 flex-wrap justify-center">
        {recordTypes.map(type => (
          <button key={type} onClick={() => setRecordType(type)}
            className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all"
            style={{
              background: recordType === type ? color : `${color}10`,
              borderColor: recordType === type ? color : `${color}25`,
              color: recordType === type ? "#fff" : color,
            }}>
            {type}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input value={domain} onChange={e => setDomain(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="example.com"
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-black text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={lookup} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: color }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
          Go
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {results?.Answer && (
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-widest" style={{ color }}>
            {results.Answer.length} {recordType} record{results.Answer.length > 1 ? "s" : ""} found
          </p>
          {results.Answer.map((rec: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border"
                 style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.10)" }}>
              <p className="text-[7px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(148,163,184,0.40)" }}>TTL: {rec.TTL}s</p>
              <p className="text-[10px] font-bold font-mono break-all" style={{ color: "#E2E8F0" }}>{rec.data}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Domain / WHOIS Lookup ────────────────────────────────────────────────────

function DomainLookup() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const color = "#06B6D4";

  const lookup = async () => {
    const clean = domain.trim().toLowerCase();
    if (!clean) return;
    if (!isValidHostname(clean)) { setError("Enter a valid domain (e.g. example.com)"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const resp = await fetch(`https://rdap.org/domain/${encodeURIComponent(clean)}`);
      if (!resp.ok) throw new Error("not found");
      setResult(await resp.json());
    } catch { setError("Domain not found or RDAP lookup failed"); }
    setLoading(false);
  };

  const getDate = (events: any[], action: string) => {
    const ev = events?.find((e: any) => e.eventAction === action);
    return ev ? new Date(ev.eventDate).toLocaleDateString() : null;
  };

  const getAge = (events: any[]) => {
    const ev = events?.find((e: any) => e.eventAction === "registration");
    if (!ev) return null;
    return Math.floor((Date.now() - new Date(ev.eventDate).getTime()) / 86400000);
  };

  const ageRisk = (days: number | null) => {
    if (days === null) return { label: "Unknown",             color: "#94A3B8" };
    if (days < 30)     return { label: "High Risk — New",    color: "#EF4444" };
    if (days < 180)    return { label: "Moderate Risk",      color: "#F59E0B" };
    return               { label: "Established Domain",   color: "#22C55E" };
  };

  return (
    <div className="space-y-4">
      <ToolHeader icon={Globe} title="WHOIS / Domain Intel" color={color} />

      <div className="flex gap-1.5">
        <input value={domain} onChange={e => setDomain(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="google.com"
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-black text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={lookup} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: color }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
          Go
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {result && (() => {
        const age = getAge(result.events);
        const risk = ageRisk(age);
        const regDate = getDate(result.events, "registration");
        const expDate = getDate(result.events, "expiration");
        const registrar = result.entities
          ?.find((e: any) => e.roles?.includes("registrar"))
          ?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3];
        return (
          <div className="space-y-2">
            <div className="p-3 rounded-xl border" style={{ background: `${risk.color}12`, borderColor: `${risk.color}30` }}>
              <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: risk.color }}>Risk Assessment</p>
              <p className="text-sm font-black" style={{ color: risk.color }}>{risk.label}</p>
              {age !== null && (
                <p className="text-[9px] font-bold mt-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>
                  Age: {age} days ({Math.floor(age / 365)}y {Math.floor((age % 365) / 30)}m)
                </p>
              )}
            </div>
            {[
              { label: "Domain",     value: result.ldhName || domain },
              { label: "Registered", value: regDate || "Unknown" },
              { label: "Expires",    value: expDate || "Unknown" },
              { label: "Registrar",  value: registrar || "Unknown" },
              { label: "Status",     value: (result.status || []).slice(0, 2).join(", ") || "Unknown" },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center p-2.5 rounded-xl border"
                   style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.10)" }}>
                <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.40)" }}>{item.label}</p>
                <p className="text-[10px] font-bold truncate ml-3 max-w-[55%] text-right" style={{ color: "#E2E8F0" }}>{item.value}</p>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── MAC Lookup ───────────────────────────────────────────────────────────────

function MacLookup() {
  const [mac, setMac] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const color = "#A78BFA";

  const lookup = async () => {
    const clean = mac.trim().replace(/[^0-9a-fA-F:.-]/g, "");
    if (!clean) return;
    setLoading(true); setError(""); setResult("");
    try {
      const resp = await fetch(`https://api.macvendors.com/${encodeURIComponent(clean)}`);
      if (!resp.ok) throw new Error("not found");
      setResult(await resp.text());
    } catch { setError("Vendor not found. Format: AA:BB:CC:DD:EE:FF"); }
    setLoading(false);
  };

  const oui = mac.trim().substring(0, 8).toUpperCase();

  return (
    <div className="space-y-4">
      <ToolHeader icon={Cpu} title="MAC Vendor Lookup" color={color} />

      <div className="flex gap-1.5">
        <input value={mac} onChange={e => setMac(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="AA:BB:CC:DD:EE:FF"
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-mono text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={lookup} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: color }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
          Go
        </button>
      </div>

      <p className="text-[8px] font-bold text-center" style={{ color: "rgba(148,163,184,0.40)" }}>
        Identify device manufacturer from MAC address prefix
      </p>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-2xl border space-y-2" style={{ background: `${color}08`, borderColor: `${color}25` }}>
          <p className="text-[7px] font-black uppercase tracking-widest" style={{ color }}>Manufacturer</p>
          <p className="text-lg font-black" style={{ color: "#E2E8F0" }}>{result}</p>
          {oui.length >= 8 && (
            <p className="text-[9px] font-mono font-bold" style={{ color: "rgba(148,163,184,0.40)" }}>OUI prefix: {oui}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── IP Intelligence ──────────────────────────────────────────────────────────

interface IPIntelResult {
  ip: string; hostname: string; city: string; region: string; country: string;
  org: string; timezone: string; open_ports: number[]; cves: string[];
  hostnames: string[]; tags: string[]; gn_noise: boolean; gn_riot: boolean;
  gn_classification: string; gn_name: string; gn_last_seen: string;
  abuse_score: number; abuse_reports: number; abuse_last_reported: string;
  abuse_has_key: boolean; risk_level: "critical" | "high" | "medium" | "low";
  cached: boolean; analyzed_at: string;
}

const RISK_CONFIG = {
  critical: { label: "CRITICAL",  color: "#EF4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)"  },
  high:     { label: "HIGH RISK", color: "#F97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.30)" },
  medium:   { label: "MODERATE",  color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  low:      { label: "CLEAN",     color: "#22C55E", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)"  },
};

const PORT_SERVICES: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "TELNET", 25: "SMTP", 53: "DNS",
  80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB",
  3306: "MYSQL", 3389: "RDP", 5432: "PGSQL", 6379: "REDIS",
  8080: "HTTP-ALT", 8443: "HTTPS-ALT", 27017: "MONGODB",
};

const HIGH_RISK_PORTS = new Set([21, 23, 445, 3389, 5900, 27017, 6379]);

function IPIntelligence() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IPIntelResult | null>(null);
  const [error, setError] = useState("");
  const [showLearn, setShowLearn] = useState(false);
  const color = "#F87171";

  const analyze = async () => {
    const clean = ip.trim();
    if (!clean) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiClient.get(`/api/ip-intel/${encodeURIComponent(clean)}`);
      if (res.data.success) setResult(res.data.data);
      else setError(res.data.error || "Analysis failed");
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to reach analysis server");
    }
    setLoading(false);
  };

  const risk = result ? RISK_CONFIG[result.risk_level] : null;

  return (
    <div className="space-y-4">
      <ToolHeader icon={Crosshair} title="IP Deep Scan" subtitle="Geo · Ports · CVEs · Behavior · Abuse" color={color} />

      {/* Learning box */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}25`, background: `${color}04` }}>
        <button onClick={() => setShowLearn(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 active:opacity-70 transition-opacity">
          <div className="flex items-center gap-2">
            <BookOpen size={12} style={{ color }} />
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>What is IP Intelligence?</span>
          </div>
          {showLearn ? <ChevronUp size={12} style={{ color: "rgba(148,163,184,0.40)" }} />
                     : <ChevronDown size={12} style={{ color: "rgba(148,163,184,0.40)" }} />}
        </button>
        {showLearn && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-3 pb-3 space-y-3">
            <p className="text-[9px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
              Every device on the internet has an IP address. IP Intelligence lets you investigate any IP to find out: where it is, what services it runs, whether it has been scanning the internet for targets, and whether other users have already reported it for attacks.
            </p>
            <div>
              <p className="text-[7px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(148,163,184,0.40)" }}>4 Analysis Sources</p>
              <div className="space-y-1.5">
                {[
                  { icon: <MapPin size={9} />, color: "#38BDF8", title: "Geo + Identity", desc: "Country, city, ISP and organisation name." },
                  { icon: <Wifi size={9} />, color: "#F97316", title: "Open Ports & CVEs", desc: "Lists every open service and known security holes." },
                  { icon: <Activity size={9} />, color: "#A78BFA", title: "Behavioral Signals", desc: "Detects active scanning or known safe services." },
                  { icon: <ShieldX size={9} />, color: "#EF4444", title: "Abuse Reports", desc: "Global community abuse score — higher % = more dangerous." },
                ].map(src => (
                  <div key={src.title} className="flex gap-2 p-2 rounded-xl border"
                       style={{ borderColor: `${src.color}25`, background: `${src.color}08` }}>
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                         style={{ background: `${src.color}20`, color: src.color }}>{src.icon}</div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wide mb-0.5" style={{ color: src.color }}>{src.title}</p>
                      <p className="text-[8px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>{src.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[7px] font-bold text-center" style={{ color: "rgba(148,163,184,0.35)" }}>
              Try: 45.33.32.156 (Shodan scanner) · 8.8.8.8 (Google DNS)
            </p>
          </motion.div>
        )}
      </div>

      <div className="flex gap-1.5">
        <input value={ip} onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && analyze()}
          placeholder="e.g. 45.33.32.156"
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-mono text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={analyze} disabled={loading}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
          style={{ background: color }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Crosshair size={10} />}
          {loading ? "Scanning" : "Scan"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {["Querying geolocation...", "Checking attack surface...", "Analyzing behavior...", "Checking abuse history..."].map((txt, i) => (
            <motion.div key={txt} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }}
              className="flex items-center gap-2 p-2.5 rounded-xl border"
              style={{ background: `${color}06`, borderColor: `${color}18` }}>
              <Loader2 size={10} className="animate-spin shrink-0" style={{ color }} />
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>{txt}</span>
            </motion.div>
          ))}
        </div>
      )}

      {result && risk && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="p-4 rounded-2xl border flex items-center justify-between"
                 style={{ background: risk.bg, borderColor: risk.border }}>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: risk.color }}>Threat Verdict</p>
                <p className="text-2xl font-black leading-none" style={{ color: risk.color }}>{risk.label}</p>
                <p className="text-[8px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.55)" }}>
                  {result.ip}{result.cached ? " · Cached" : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                   style={{ background: `${risk.color}20`, border: `1px solid ${risk.border}` }}>
                {result.risk_level === "low"
                  ? <ShieldCheck size={22} style={{ color: risk.color }} />
                  : result.risk_level === "medium"
                  ? <ShieldWarn size={22} style={{ color: risk.color }} />
                  : <ShieldX size={22} style={{ color: risk.color }} />}
              </div>
            </div>

            <InfoCard title="Identity" icon={<MapPin size={11} />} color="#38BDF8">
              <Row label="Location" value={[result.city, result.region, result.country].filter(Boolean).join(", ") || "Unknown"} />
              <Row label="ASN / Org" value={result.org || "Unknown"} mono />
              {result.hostname && <Row label="Hostname" value={result.hostname} mono />}
              {result.timezone && <Row label="Timezone" value={result.timezone} />}
            </InfoCard>

            <InfoCard title="Behavioral Signals" icon={<Activity size={11} />} color="#A78BFA">
              <div className="grid grid-cols-2 gap-2 pt-1">
                <SignalChip label="Internet Scanner" active={result.gn_noise} activeColor="#F59E0B" desc={result.gn_noise ? "Scanning detected" : "Not observed scanning"} />
                <SignalChip label="Known Service" active={result.gn_riot} activeColor="#22C55E" desc={result.gn_riot ? (result.gn_name || "Benign service") : "Not in benign list"} />
              </div>
              <Row label="Classification"
                value={result.gn_classification === "unknown" ? "Not in dataset" : result.gn_classification.toUpperCase()}
                valueColor={result.gn_classification === "malicious" ? "#EF4444" : result.gn_classification === "benign" ? "#22C55E" : "rgba(148,163,184,0.40)"} />
              {result.gn_last_seen && <Row label="Last Seen" value={result.gn_last_seen} />}
            </InfoCard>

            <InfoCard title="Attack Surface" icon={<Wifi size={11} />} color="#F97316">
              {result.open_ports.length === 0 ? (
                <p className="text-[9px] font-bold text-center py-2" style={{ color: "rgba(148,163,184,0.40)" }}>No open ports in dataset</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.open_ports.map(port => (
                    <span key={port} className="px-2 py-0.5 rounded-lg text-[8px] font-black border"
                          style={{
                            background: HIGH_RISK_PORTS.has(port) ? "rgba(239,68,68,0.10)" : "rgba(56,189,248,0.08)",
                            borderColor: HIGH_RISK_PORTS.has(port) ? "rgba(239,68,68,0.30)" : "rgba(56,189,248,0.20)",
                            color: HIGH_RISK_PORTS.has(port) ? "#EF4444" : "#38BDF8",
                          }}>
                      {port}{PORT_SERVICES[port] ? `·${PORT_SERVICES[port]}` : ""}
                    </span>
                  ))}
                </div>
              )}
              {result.cves.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>{result.cves.length} CVE{result.cves.length > 1 ? "s" : ""} Found</p>
                  <div className="flex flex-wrap gap-1">
                    {result.cves.slice(0, 8).map(cve => (
                      <span key={cve} className="px-2 py-0.5 rounded-lg text-[7px] font-black border"
                            style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.25)", color: "#EF4444" }}>
                        {cve}
                      </span>
                    ))}
                    {result.cves.length > 8 && <span className="text-[8px] font-black" style={{ color: "rgba(148,163,184,0.40)" }}>+{result.cves.length - 8} more</span>}
                  </div>
                </div>
              )}
              {result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-lg text-[7px] font-bold border"
                          style={{ background: "rgba(148,163,184,0.06)", borderColor: "rgba(148,163,184,0.12)", color: "rgba(148,163,184,0.50)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Abuse History" icon={<ShieldX size={11} />} color="#EF4444">
              {!result.abuse_has_key ? (
                <p className="text-[9px] font-bold text-center py-1" style={{ color: "rgba(148,163,184,0.40)" }}>AbuseIPDB key not configured on server</p>
              ) : (
                <>
                  <div className="flex items-end justify-between mb-1.5">
                    <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.40)" }}>Abuse Confidence</p>
                    <span className="text-base font-black font-mono"
                          style={{ color: result.abuse_score > 50 ? "#EF4444" : result.abuse_score > 10 ? "#F59E0B" : "#22C55E" }}>
                      {result.abuse_score}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.10)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${result.abuse_score}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: result.abuse_score > 50 ? "#EF4444" : result.abuse_score > 10 ? "#F59E0B" : "#22C55E" }} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Reports", value: result.abuse_reports.toString() },
                      { label: "Last Report", value: result.abuse_last_reported ? new Date(result.abuse_last_reported).toLocaleDateString() : "Never" },
                    ].map(d => (
                      <div key={d.label} className="p-2 rounded-lg border text-center"
                           style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.10)" }}>
                        <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: "rgba(148,163,184,0.40)" }}>{d.label}</p>
                        <p className="text-[10px] font-black" style={{ color: "#E2E8F0" }}>{d.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </InfoCard>

            <p className="text-center text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.35)" }}>
              Analyzed {new Date(result.analyzed_at).toLocaleTimeString()} · 4 sources
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Hash Check ───────────────────────────────────────────────────────────────

interface HashResult {
  hash: string; hash_type: string; verdict: "known_malware" | "clean" | "unknown";
  malware_name: string | null; malware_family: string | null;
  detection_count: number; total_engines: number;
  circl_found: boolean; vt_found: boolean; vt_has_key: boolean;
  cached: boolean; analyzed_at: string;
}

const HASH_VERDICT = {
  known_malware: { label: "KNOWN MALWARE", color: "#EF4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)"  },
  clean:         { label: "CLEAN",         color: "#22C55E", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.30)"   },
  unknown:       { label: "UNKNOWN",       color: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
};

function detectHashType(h: string) {
  const t = h.trim().toLowerCase();
  if (/^[0-9a-f]{32}$/.test(t)) return "MD5";
  if (/^[0-9a-f]{40}$/.test(t)) return "SHA1";
  if (/^[0-9a-f]{64}$/.test(t)) return "SHA256";
  return null;
}

function HashCheck() {
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HashResult | null>(null);
  const [error, setError] = useState("");
  const [showLearn, setShowLearn] = useState(false);
  const color = "#EF4444";
  const detectedType = detectHashType(hash);

  const check = async () => {
    const clean = hash.trim().toLowerCase();
    if (!clean || !detectedType) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiClient.get(`/api/hash-lookup/${encodeURIComponent(clean)}`);
      if (res.data.success) setResult(res.data.data);
      else setError(res.data.error || "Lookup failed");
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to reach analysis server");
    }
    setLoading(false);
  };

  const verdict = result ? HASH_VERDICT[result.verdict] : null;

  return (
    <div className="space-y-4">
      <ToolHeader icon={Fingerprint} title="Malware Hash Check" subtitle="CIRCL HASHLOOKUP · VirusTotal" color={color} />

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}25`, background: `${color}04` }}>
        <button onClick={() => setShowLearn(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 active:opacity-70 transition-opacity">
          <div className="flex items-center gap-2">
            <BookOpen size={12} style={{ color }} />
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>What is a File Hash Check?</span>
          </div>
          {showLearn ? <ChevronUp size={12} style={{ color: "rgba(148,163,184,0.40)" }} />
                     : <ChevronDown size={12} style={{ color: "rgba(148,163,184,0.40)" }} />}
        </button>
        {showLearn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-3 space-y-3">
            <p className="text-[9px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
              Every file has a unique fingerprint called a hash. If you change even one byte, the hash changes completely. Security researchers store hashes of known malware so you can check if a suspicious file matches a known threat without ever opening it.
            </p>
            <div className="space-y-1.5">
              {[
                { type: "MD5",    chars: "32 characters", risk: "Fast, but can have collisions" },
                { type: "SHA1",   chars: "40 characters", risk: "More reliable than MD5" },
                { type: "SHA256", chars: "64 characters", risk: "Most accurate — use if available" },
              ].map(h => (
                <div key={h.type} className="flex gap-2 p-2 rounded-xl border"
                     style={{ borderColor: "rgba(148,163,184,0.12)", background: "rgba(148,163,184,0.05)" }}>
                  <div className="w-12 shrink-0">
                    <p className="text-[9px] font-black uppercase" style={{ color }}>{h.type}</p>
                    <p className="text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.40)" }}>{h.chars}</p>
                  </div>
                  <p className="text-[8px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>{h.risk}</p>
                </div>
              ))}
            </div>
            <p className="text-[7px] font-bold text-center" style={{ color: "rgba(148,163,184,0.35)" }}>
              Right-click file → Properties to get its hash
            </p>
          </motion.div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <input value={hash} onChange={e => setHash(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && check()}
            placeholder="Paste MD5 / SHA1 / SHA256 hash…"
            className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] font-mono text-white"
            style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
          <button onClick={check} disabled={loading || !detectedType}
            className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
            style={{ background: color }}>
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Fingerprint size={10} />}
            {loading ? "Checking" : "Check"}
          </button>
        </div>
        {detectedType && <p className="text-[8px] font-black text-center" style={{ color }}>Detected: {detectedType} hash</p>}
        {hash.trim() && !detectedType && <p className="text-[8px] font-black text-center" style={{ color: "#F59E0B" }}>Not a valid hash — paste MD5 (32), SHA1 (40) or SHA256 (64) hex characters</p>}
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {["Querying CIRCL HASHLOOKUP database…", "Cross-checking with VirusTotal…"].map((txt, i) => (
            <motion.div key={txt} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
              className="flex items-center gap-2 p-2.5 rounded-xl border"
              style={{ background: `${color}04`, borderColor: `${color}18` }}>
              <Loader2 size={10} className="animate-spin shrink-0" style={{ color }} />
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>{txt}</span>
            </motion.div>
          ))}
        </div>
      )}

      {result && verdict && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="p-4 rounded-2xl border flex items-center justify-between"
                 style={{ background: verdict.bg, borderColor: verdict.border }}>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: verdict.color }}>File Verdict</p>
                <p className="text-2xl font-black leading-none" style={{ color: verdict.color }}>{verdict.label}</p>
                <p className="text-[8px] font-bold mt-1 font-mono break-all" style={{ color: "rgba(148,163,184,0.55)" }}>
                  {result.hash_type} · {result.hash.substring(0, 16)}…{result.cached ? " · Cached" : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                   style={{ background: `${verdict.color}20`, border: `1px solid ${verdict.border}` }}>
                {result.verdict === "clean"
                  ? <ShieldCheck size={22} style={{ color: verdict.color }} />
                  : result.verdict === "known_malware"
                  ? <ShieldX size={22} style={{ color: verdict.color }} />
                  : <ShieldAlert size={22} style={{ color: verdict.color }} />}
              </div>
            </div>

            <InfoCard title="Detection Details" icon={<Fingerprint size={11} />} color={color}>
              {result.verdict === "known_malware" && result.malware_name && <Row label="File Name" value={result.malware_name} mono />}
              {result.verdict === "known_malware" && result.malware_family && <Row label="Malware Family" value={result.malware_family} />}
              <Row label="Hash Type" value={result.hash_type} />
              {result.vt_found && result.total_engines > 0 && (
                <>
                  <div className="flex items-end justify-between mt-1 mb-0.5">
                    <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.40)" }}>Engine Detections</p>
                    <span className="text-base font-black font-mono" style={{ color: result.detection_count > 0 ? "#EF4444" : "#22C55E" }}>
                      {result.detection_count}/{result.total_engines}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.10)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(result.detection_count / result.total_engines) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: result.detection_count > 0 ? "#EF4444" : "#22C55E" }} />
                  </div>
                </>
              )}
            </InfoCard>

            <InfoCard title="Sources Checked" icon={<Activity size={11} />} color="#60A5FA">
              <div className="grid grid-cols-2 gap-2 pt-1">
                <SignalChip label="CIRCL HashDB" active={result.circl_found} activeColor="#EF4444" desc={result.circl_found ? "Found in database" : "Not in database"} />
                <SignalChip label="VirusTotal" active={result.vt_found} activeColor={result.detection_count > 0 ? "#EF4444" : "#22C55E"}
                  desc={!result.vt_has_key ? "Key not set" : result.vt_found ? `${result.detection_count} detections` : "Not indexed"} />
              </div>
            </InfoCard>

            <p className="text-center text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.35)" }}>
              Checked {new Date(result.analyzed_at).toLocaleTimeString()} · 2 sources
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Breach Check ─────────────────────────────────────────────────────────────

interface BreachResult {
  email: string; breached: boolean; breach_count: number;
  breaches: { name: string; domain: string; breach_date: string; pwn_count: number; data_classes: string[]; is_verified: boolean }[];
  rep_reputation: string; rep_credentials_leaked: boolean; rep_data_breach: boolean;
  rep_blacklisted: boolean; rep_malicious: boolean;
  hibp_has_key: boolean; cached: boolean; checked_at: string;
}

function BreachCheck() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BreachResult | null>(null);
  const [error, setError] = useState("");
  const [showLearn, setShowLearn] = useState(false);
  const color = "#8B5CF6";

  const check = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiClient.post("/api/breach-check", { email: clean });
      if (res.data.success) setResult(res.data.data);
      else setError(res.data.error || "Check failed");
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to reach analysis server");
    }
    setLoading(false);
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="space-y-4">
      <ToolHeader icon={KeyRound} title="Dark Web Breach Check" subtitle="EmailRep · HIBP" color={color} />

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}25`, background: `${color}04` }}>
        <button onClick={() => setShowLearn(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 active:opacity-70 transition-opacity">
          <div className="flex items-center gap-2">
            <BookOpen size={12} style={{ color }} />
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>What is a Data Breach?</span>
          </div>
          {showLearn ? <ChevronUp size={12} style={{ color: "rgba(148,163,184,0.40)" }} />
                     : <ChevronDown size={12} style={{ color: "rgba(148,163,184,0.40)" }} />}
        </button>
        {showLearn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-3 space-y-3">
            <p className="text-[9px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
              A data breach is when hackers break into a website's database and steal user records — emails, passwords, phone numbers, and more. Those stolen records are then sold or published on the dark web. This tool checks if your email appeared in any known breach.
            </p>
            <div className="space-y-1.5">
              {[
                { icon: <Database size={9} />, color: "#A855F7", title: "What gets stolen", desc: "Emails, passwords, phone numbers, home addresses, credit card last-4 digits, dates of birth." },
                { icon: <Eye size={9} />, color: "#F97316", title: "Why it matters", desc: "If your password was leaked, attackers try it on every other site you use." },
                { icon: <ShieldX size={9} />, color: "#EF4444", title: "What to do", desc: "Change your password immediately. Enable 2-factor authentication on all important accounts." },
              ].map(s => (
                <div key={s.title} className="flex gap-2 p-2 rounded-xl border"
                     style={{ borderColor: `${s.color}25`, background: `${s.color}08` }}>
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                       style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-wide mb-0.5" style={{ color: s.color }}>{s.title}</p>
                    <p className="text-[8px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[7px] font-bold text-center" style={{ color: "rgba(148,163,184,0.35)" }}>
              Your email is sent over HTTPS and never stored
            </p>
          </motion.div>
        )}
      </div>

      <div className="flex gap-1.5">
        <input value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && isValidEmail && check()}
          placeholder="your@email.com" type="email"
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-[9px] text-white"
          style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${color}22` }} />
        <button onClick={check} disabled={loading || !isValidEmail}
          className="px-4 py-1.5 rounded-lg text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: color }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : <KeyRound size={10} />}
          {loading ? "Checking" : "Check"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {["Checking email reputation…", "Querying breach databases…"].map((txt, i) => (
            <motion.div key={txt} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.22 }}
              className="flex items-center gap-2 p-2.5 rounded-xl border"
              style={{ background: `${color}04`, borderColor: `${color}18` }}>
              <Loader2 size={10} className="animate-spin shrink-0" style={{ color }} />
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>{txt}</span>
            </motion.div>
          ))}
        </div>
      )}

      {result && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="p-4 rounded-2xl border flex items-center justify-between"
                 style={{ background: result.breached ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
                          borderColor: result.breached ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)" }}>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-0.5"
                   style={{ color: result.breached ? "#EF4444" : "#22C55E" }}>Breach Status</p>
                <p className="text-2xl font-black leading-none"
                   style={{ color: result.breached ? "#EF4444" : "#22C55E" }}>
                  {result.breached ? "BREACHED" : "NO BREACHES"}
                </p>
                <p className="text-[8px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.55)" }}>
                  {result.breached ? "Credentials found in leaked datasets" : "Not found in any known breach"}
                  {result.cached ? " · Cached" : ""}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                   style={{ background: result.breached ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                            border: `1px solid ${result.breached ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)"}` }}>
                {result.breached
                  ? <ShieldX size={22} style={{ color: "#EF4444" }} />
                  : <ShieldCheck size={22} style={{ color: "#22C55E" }} />}
              </div>
            </div>

            <InfoCard title="Email Reputation" icon={<Eye size={11} />} color={color}>
              {result.rep_reputation && (
                <Row label="Reputation" value={result.rep_reputation.toUpperCase()}
                  valueColor={result.rep_reputation === "high" ? "#22C55E" : result.rep_reputation === "low" ? "#EF4444" : "#F59E0B"} />
              )}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { label: "Credentials Leaked", active: result.rep_credentials_leaked },
                  { label: "In Data Breach",     active: result.rep_data_breach },
                  { label: "Blacklisted",         active: result.rep_blacklisted },
                  { label: "Malicious Activity",  active: result.rep_malicious },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded-xl border text-center"
                       style={{ background: item.active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.06)",
                                borderColor: item.active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.20)" }}>
                    <p className="text-[7px] font-black uppercase tracking-wider mb-0.5"
                       style={{ color: item.active ? "#EF4444" : "#22C55E" }}>{item.label}</p>
                    <p className="text-[9px] font-black" style={{ color: item.active ? "#EF4444" : "#22C55E" }}>
                      {item.active ? "YES" : "NO"}
                    </p>
                  </div>
                ))}
              </div>
            </InfoCard>

            {result.breaches.length > 0 && (
              <InfoCard title={`${result.breach_count} Breach${result.breach_count > 1 ? "es" : ""} Found`} icon={<Database size={11} />} color="#EF4444">
                <div className="space-y-2 pt-1">
                  {result.breaches.slice(0, 6).map(b => (
                    <div key={b.name} className="p-2.5 rounded-xl border"
                         style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.20)" }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="text-[9px] font-black" style={{ color: "#EF4444" }}>{b.name}</p>
                          <p className="text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.40)" }}>
                            {b.domain} · {new Date(b.breach_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className="text-[7px] font-black shrink-0" style={{ color: "rgba(148,163,184,0.40)" }}>
                          {(b.pwn_count / 1_000_000).toFixed(1)}M records
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.data_classes.slice(0, 5).map(dc => (
                          <span key={dc} className="px-1.5 py-0.5 rounded-md text-[6px] font-black border uppercase"
                                style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.25)", color: "#EF4444" }}>
                            {dc}
                          </span>
                        ))}
                        {b.data_classes.length > 5 && (
                          <span className="text-[7px] font-black" style={{ color: "rgba(148,163,184,0.40)" }}>+{b.data_classes.length - 5}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {result.breaches.length > 6 && (
                    <p className="text-center text-[8px] font-black" style={{ color: "rgba(148,163,184,0.40)" }}>
                      +{result.breaches.length - 6} more breaches
                    </p>
                  )}
                </div>
              </InfoCard>
            )}

            {result.breached && (
              <div className="p-3 rounded-xl border text-center"
                   style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
                <p className="text-[9px] font-black" style={{ color: "#EF4444" }}>Action required: your credentials were found in leaked data</p>
                <p className="text-[7px] font-bold mt-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Change your password immediately and enable 2-factor authentication
                </p>
              </div>
            )}

            <p className="text-center text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.35)" }}>
              Checked {new Date(result.checked_at).toLocaleTimeString()} · 2 sources
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InfoCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-2xl border space-y-2"
         style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.10)" }}>
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.50)" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[8px] font-black uppercase tracking-wider shrink-0" style={{ color: "rgba(148,163,184,0.40)" }}>{label}</p>
      <p className={cn("text-[9px] font-bold truncate text-right max-w-[60%]", mono && "font-mono")}
         style={{ color: valueColor || "#E2E8F0" }}>
        {value}
      </p>
    </div>
  );
}

function SignalChip({ label, active, activeColor, desc }: { label: string; active: boolean; activeColor: string; desc: string }) {
  return (
    <div className="p-2 rounded-xl border text-center"
         style={{ background: active ? `${activeColor}15` : "rgba(148,163,184,0.04)", borderColor: active ? `${activeColor}35` : "rgba(148,163,184,0.10)" }}>
      <p className="text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: active ? activeColor : "rgba(148,163,184,0.40)" }}>{label}</p>
      <p className="text-[8px] font-bold" style={{ color: active ? activeColor : "rgba(148,163,184,0.40)" }}>{active ? "YES" : "NO"}</p>
      <p className="text-[7px] mt-0.5" style={{ color: "rgba(148,163,184,0.40)" }}>{desc}</p>
    </div>
  );
}
